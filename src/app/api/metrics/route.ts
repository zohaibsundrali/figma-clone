import { NextRequest, NextResponse } from "next/server";

interface ClientMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string | number>;
}

interface MetricsPayload {
  metrics: ClientMetric[];
  url: string;
  userAgent: string;
}

// In-memory metrics storage (replace with database in production)
const metricsBuffer: MetricsPayload[] = [];
const MAX_BUFFER = 1000;

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as MetricsPayload;

    // Store metrics
    metricsBuffer.push(payload);
    if (metricsBuffer.length > MAX_BUFFER) {
      metricsBuffer.shift();
    }

    // Log slow operations
    const slowMetrics = payload.metrics.filter((m) => m.duration > 1000);
    if (slowMetrics.length > 0) {
      console.warn("⚠️  Slow client operations:", {
        url: payload.url,
        metrics: slowMetrics,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Metrics] Error:", err);
    return NextResponse.json({ error: "Failed to log metrics" }, { status: 400 });
  }
}

// Get performance summary
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const minutes = parseInt(searchParams.get("minutes") || "5");

  const cutoff = Date.now() - minutes * 60 * 1000;
  const recent = metricsBuffer.filter((p) =>
    p.metrics.some((m) => m.timestamp > cutoff)
  );

  // Aggregate metrics by name
  const aggregated: Record<string, number[]> = {};
  recent.forEach((payload) => {
    payload.metrics.forEach((metric) => {
      if (!aggregated[metric.name]) {
        aggregated[metric.name] = [];
      }
      aggregated[metric.name].push(metric.duration);
    });
  });

  // Calculate stats
  const stats: Record<string, { avg: number; min: number; max: number; p95: number }> = {};
  Object.entries(aggregated).forEach(([name, durations]) => {
    durations.sort((a, b) => a - b);
    stats[name] = {
      avg: durations.reduce((a, b) => a + b) / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p95: durations[Math.floor(durations.length * 0.95)],
    };
  });

  return NextResponse.json({
    timeWindow: `${minutes} minutes`,
    samplesCount: recent.length,
    stats,
  });
}
