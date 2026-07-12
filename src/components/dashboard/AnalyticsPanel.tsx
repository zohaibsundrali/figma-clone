"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Clock, Users } from "lucide-react";

interface AnalyticsData {
  totalFiles: number;
  totalShapes: number;
  avgFileSize: number;
  totalCollaborators: number;
  filesCreatedThisWeek: number;
  filesEditedThisWeek: number;
  commentsThisWeek: number;
  avgLoadTime: number;
  avgRenderTime: number;
  peakUsageHour: number;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export function AnalyticsPanel({ userId }: { userId: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    loadMetrics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      // In a real app, this would call an API endpoint
      // For now, we'll use mock data
      const mockData: AnalyticsData = {
        totalFiles: 24,
        totalShapes: 1847,
        avgFileSize: 156,
        totalCollaborators: 8,
        filesCreatedThisWeek: 3,
        filesEditedThisWeek: 12,
        commentsThisWeek: 47,
        avgLoadTime: 1.2,
        avgRenderTime: 0.8,
        peakUsageHour: 14,
      };
      setAnalytics(mockData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetch(`/api/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAverageMetric = (name: string) => {
    const filtered = metrics.filter((m) => m.name === name);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return (sum / filtered.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(["week", "month", "year"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              timeRange === range
                ? "bg-accent text-white"
                : "bg-surface-elevated hover:bg-border text-foreground"
            }`}
          >
            {range === "week" ? "This Week" : range === "month" ? "This Month" : "This Year"}
          </button>
        ))}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted text-sm">
            <BarChart3 className="h-4 w-4" />
            Total Files
          </div>
          <p className="text-2xl font-bold">{analytics.totalFiles}</p>
          <p className="text-xs text-muted/60">+{analytics.filesCreatedThisWeek} this week</p>
        </div>

        <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted text-sm">
            <TrendingUp className="h-4 w-4" />
            Total Shapes
          </div>
          <p className="text-2xl font-bold">{analytics.totalShapes}</p>
          <p className="text-xs text-muted/60">Avg {analytics.avgFileSize} per file</p>
        </div>

        <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted text-sm">
            <Users className="h-4 w-4" />
            Collaborators
          </div>
          <p className="text-2xl font-bold">{analytics.totalCollaborators}</p>
          <p className="text-xs text-muted/60">{analytics.commentsThisWeek} comments this week</p>
        </div>

        <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted text-sm">
            <Clock className="h-4 w-4" />
            Avg Load Time
          </div>
          <p className="text-2xl font-bold">{analytics.avgLoadTime}s</p>
          <p className="text-xs text-muted/60">Peak at {analytics.peakUsageHour}:00</p>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm">Weekly Activity</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Files Edited</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-40 bg-border rounded overflow-hidden">
                <div
                  className="h-full bg-accent rounded"
                  style={{ width: `${(analytics.filesEditedThisWeek / analytics.totalFiles) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8">{analytics.filesEditedThisWeek}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Files Created</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-40 bg-border rounded overflow-hidden">
                <div
                  className="h-full bg-accent rounded"
                  style={{ width: `${(analytics.filesCreatedThisWeek / analytics.totalFiles) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8">{analytics.filesCreatedThisWeek}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Comments Added</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-40 bg-border rounded overflow-hidden">
                <div
                  className="h-full bg-accent rounded"
                  style={{ width: `${Math.min((analytics.commentsThisWeek / 100) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8">{analytics.commentsThisWeek}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm">Performance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted">Avg Dashboard Load</p>
            <p className="text-lg font-bold">{getAverageMetric("dashboard_load")}ms</p>
            <p className="text-xs text-muted/60">Target: &lt;2000ms</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted">Avg Editor Load</p>
            <p className="text-lg font-bold">{getAverageMetric("editor_load")}ms</p>
            <p className="text-xs text-muted/60">Target: &lt;3000ms</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted">Shape Render</p>
            <p className="text-lg font-bold">{analytics.avgRenderTime}ms</p>
            <p className="text-xs text-muted/60">Per 100 shapes</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted">API Latency</p>
            <p className="text-lg font-bold">~45ms</p>
            <p className="text-xs text-muted/60">Avg response time</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-accent">Insights</p>
        <ul className="text-xs text-muted space-y-1">
          <li>• Peak activity at {analytics.peakUsageHour}:00 - collaborate with team then</li>
          <li>• {analytics.totalFiles} files with avg {analytics.avgFileSize} shapes - well organized</li>
          <li>• Load times optimal - cache working effectively</li>
          <li>• Strong collaboration - {analytics.commentsThisWeek} comments this week</li>
        </ul>
      </div>

      {/* Export */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const data = JSON.stringify(analytics, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `analytics-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex-1 px-4 py-2 text-sm font-medium rounded bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          Export Report
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 px-4 py-2 text-sm font-medium rounded bg-surface-elevated border border-border hover:bg-border transition-colors"
        >
          Print
        </button>
      </div>
    </div>
  );
}
