// Performance monitoring utilities for production observability

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string | number>;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

const getPerfNow = () => {
  if (typeof window !== "undefined" && window.performance?.now) {
    return window.performance.now();
  }
  return Date.now();
};

export const performance = {
  // Start tracking a metric
  mark(name: string) {
    performance.marks = performance.marks || {};
    performance.marks[name] = getPerfNow();
  },

  // End tracking and log duration
  measure(name: string, tags?: Record<string, string | number>) {
    const start = performance.marks?.[name];
    if (!start) return;

    const duration = getPerfNow() - start;

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      tags,
    };

    metrics.push(metric);

    // Keep metrics array bounded
    if (metrics.length > MAX_METRICS) {
      metrics.shift();
    }

    // Log slow operations to console in dev
    if (process.env.NODE_ENV === "development" && duration > 100) {
      console.warn(`⚠️  Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  },

  // Get performance stats
  getStats(name: string) {
    const filtered = metrics.filter((m) => m.name === name);
    if (filtered.length === 0) return null;

    const durations = filtered.map((m) => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      avgDuration: sum / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: sum,
    };
  },

  // Send metrics to monitoring service
  async sendMetrics() {
    if (metrics.length === 0) return;

    try {
      // Send to your monitoring service (Sentry, Datadog, etc.)
      // Example: POST /api/metrics with metrics array
      if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
        await fetch("/api/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metrics: metrics.slice(0, 10), // Send last 10 metrics
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
          keepalive: true, // Send even if page unloads
        }).catch(() => {
          /* Silently fail */
        });
      }
    } catch (err) {
      console.error("Failed to send metrics:", err);
    }
  },

  marks: {} as Record<string, number>,
};

// Send metrics periodically
if (typeof window !== "undefined") {
  setInterval(() => performance.sendMetrics(), 60000); // Every minute
}

// Send metrics on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    performance.sendMetrics();
  });
}
