import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface MetricPoint {
  timestamp: number;
  value: number;
}

interface Histogram {
  buckets: Map<number, number>;
  sum: number;
  count: number;
}

class Metrics {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private timeSeries: Map<string, MetricPoint[]> = new Map();
  private readonly maxTimeSeriesPoints = 1000;

  // Counter: monotonically increasing value
  incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  getCounter(name: string, labels: Record<string, string> = {}): number {
    const key = this.buildKey(name, labels);
    return this.counters.get(key) || 0;
  }

  // Gauge: arbitrary value that can go up or down
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
    this.recordTimeSeries(key, value);
  }

  getGauge(name: string, labels: Record<string, string> = {}): number {
    const key = this.buildKey(name, labels);
    return this.gauges.get(key) || 0;
  }

  // Histogram: distribution of values
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        buckets: new Map([
          [10, 0], [25, 0], [50, 0], [100, 0],
          [250, 0], [500, 0], [1000, 0], [2500, 0], [5000, 0], [Infinity, 0],
        ]),
        sum: 0,
        count: 0,
      };
      this.histograms.set(key, histogram);
    }

    histogram.sum += value;
    histogram.count += 1;

    for (const [bucket, _] of histogram.buckets) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  getHistogram(name: string, labels: Record<string, string> = {}): Histogram | undefined {
    const key = this.buildKey(name, labels);
    return this.histograms.get(key);
  }

  // Time series recording
  private recordTimeSeries(key: string, value: number): void {
    let series = this.timeSeries.get(key);
    if (!series) {
      series = [];
      this.timeSeries.set(key, series);
    }

    series.push({ timestamp: Date.now(), value });

    if (series.length > this.maxTimeSeriesPoints) {
      series.shift();
    }
  }

  getTimeSeries(name: string, labels: Record<string, string> = {}): MetricPoint[] {
    const key = this.buildKey(name, labels);
    return this.timeSeries.get(key) || [];
  }

  private buildKey(name: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  // Prometheus-compatible export
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    for (const [key, value] of this.counters) {
      lines.push(`# TYPE ${key} counter`);
      lines.push(`${key} ${value}`);
    }

    // Export gauges
    for (const [key, value] of this.gauges) {
      lines.push(`# TYPE ${key} gauge`);
      lines.push(`${key} ${value}`);
    }

    // Export histograms
    for (const [key, histogram] of this.histograms) {
      lines.push(`# TYPE ${key} histogram`);
      for (const [bucket, count] of histogram.buckets) {
        const bucketLabel = bucket === Infinity ? '+Inf' : bucket.toString();
        lines.push(`${key}_bucket{le="${bucketLabel}"} ${count}`);
      }
      lines.push(`${key}_sum ${histogram.sum}`);
      lines.push(`${key}_count ${histogram.count}`);
    }

    return lines.join('\n') + '\n';
  }

  // JSON export for dashboards
  exportJSON(): any {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, hist]) => [
          key,
          {
            buckets: Object.fromEntries(hist.buckets),
            sum: hist.sum,
            count: hist.count,
            mean: hist.count > 0 ? hist.sum / hist.count : 0,
          },
        ])
      ),
      timeSeries: Object.fromEntries(this.timeSeries),
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timeSeries.clear();
  }
}

// Singleton instance
export const metrics = new Metrics();

// Middleware to track HTTP metrics
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const labels = {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode.toString(),
      };

      metrics.incrementCounter('http_requests_total', 1, labels);
      metrics.recordHistogram('http_request_duration_ms', duration, labels);

      if (res.statusCode >= 500) {
        metrics.incrementCounter('http_errors_total', 1, { ...labels, type: 'server' });
      } else if (res.statusCode >= 400) {
        metrics.incrementCounter('http_errors_total', 1, { ...labels, type: 'client' });
      }
    });

    next();
  };
}

// Track node metrics
export function trackNodeMetrics(
  nodeId: string,
  latency: number,
  bandwidth: number,
  reputation: number
): void {
  metrics.setGauge('node_latency_ms', latency, { node_id: nodeId });
  metrics.setGauge('node_bandwidth_mbps', bandwidth, { node_id: nodeId });
  metrics.setGauge('node_reputation_score', reputation, { node_id: nodeId });
}

// Track routing decisions
export function trackRoutingDecision(
  userId: string,
  nodeId: string,
  decisionTime: number,
  cached: boolean
): void {
  metrics.incrementCounter('routing_decisions_total', 1, {
    node_id: nodeId,
    cached: cached.toString(),
  });
  metrics.recordHistogram('routing_decision_time_ms', decisionTime);
}

// Track connection metrics
export function trackConnection(
  userId: string,
  nodeId: string,
  action: 'established' | 'terminated' | 'failed'
): void {
  metrics.incrementCounter('vpn_connections_total', 1, {
    node_id: nodeId,
    action,
  });
}

// System metrics
export function updateSystemMetrics(): void {
  const usage = process.memoryUsage();
  metrics.setGauge('nodejs_memory_heap_used_bytes', usage.heapUsed);
  metrics.setGauge('nodejs_memory_heap_total_bytes', usage.heapTotal);
  metrics.setGauge('nodejs_memory_external_bytes', usage.external);
  metrics.setGauge('nodejs_memory_rss_bytes', usage.rss);
  metrics.setGauge('nodejs_uptime_seconds', process.uptime());

  const cpuUsage = process.cpuUsage();
  metrics.setGauge('nodejs_cpu_user_microseconds', cpuUsage.user);
  metrics.setGauge('nodejs_cpu_system_microseconds', cpuUsage.system);
}

// Start periodic system metrics collection
export function startSystemMetricsCollection(intervalMs: number = 10000): NodeJS.Timer {
  updateSystemMetrics();
  return setInterval(updateSystemMetrics, intervalMs);
}
