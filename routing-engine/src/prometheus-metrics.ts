import { Request, Response, NextFunction } from 'express';

/**
 * Prometheus Metrics for VeilPool System
 * Tracks key performance indicators across all services
 */

interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

class PrometheusMetrics {
  private metrics: Map<string, MetricValue[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  // Node Registry Metrics
  recordNodeHeartbeat(nodeId: string, latency: number, packetLoss: number, bandwidth: number) {
    this.gauges.set(`node_latency_ms{node="${nodeId}"}`, latency);
    this.gauges.set(`node_packet_loss_pct{node="${nodeId}"}`, packetLoss);
    this.gauges.set(`node_bandwidth_gb{node="${nodeId}"}`, bandwidth);
    this.incrementCounter(`node_heartbeats_total{node="${nodeId}"}`);
    
    this.metrics.set(`node_heartbeat_${nodeId}`, [{
      value: latency,
      timestamp: Date.now(),
      labels: { nodeId, type: 'latency' }
    }]);
  }

  recordNodeReputationChange(nodeId: string, oldRep: number, newRep: number) {
    const change = newRep - oldRep;
    this.gauges.set(`node_reputation{node="${nodeId}"}`, newRep);
    this.incrementCounter(`node_reputation_changes_total{node="${nodeId}"}`, Math.abs(change));
    
    if (change < 0) {
      this.incrementCounter(`node_reputation_decreases_total{node="${nodeId}"}`, Math.abs(change));
    } else if (change > 0) {
      this.incrementCounter(`node_reputation_increases_total{node="${nodeId}"}`, change);
    }
  }

  recordNodeDowntime(nodeId: string, durationMs: number) {
    this.incrementCounter(`node_downtime_events_total{node="${nodeId}"}`);
    this.gauges.set(`node_downtime_duration_ms{node="${nodeId}"}`, durationMs);
    
    this.addHistogramValue(`node_downtime_duration_histogram`, durationMs);
  }

  // Privacy Pass Metrics
  recordPassPurchase(passType: string, amount: number, priceUsdc: number, demandFactor: number) {
    this.incrementCounter(`pass_purchases_total{type="${passType}"}`);
    this.incrementCounter(`pass_revenue_usdc_total{type="${passType}"}`, priceUsdc);
    this.gauges.set(`pass_current_price_usdc{type="${passType}"}`, priceUsdc / amount);
    this.gauges.set(`pass_demand_factor`, demandFactor);
    
    this.addHistogramValue(`pass_purchase_amount_gb_histogram`, amount);
    this.addHistogramValue(`pass_purchase_price_usdc_histogram`, priceUsdc);
  }

  recordDemandFactorUpdate(oldFactor: number, newFactor: number) {
    this.gauges.set('pass_demand_factor', newFactor);
    this.incrementCounter('pass_demand_updates_total');
    
    const change = newFactor - oldFactor;
    if (change > 0) {
      this.incrementCounter('pass_demand_increases_total');
    } else if (change < 0) {
      this.incrementCounter('pass_demand_decreases_total');
    }
  }

  // Privacy Pool Metrics
  recordPoolUsage(poolId: string, beneficiaryId: string, amountGb: number, dailyUsage: number, dailyLimit: number) {
    this.incrementCounter(`pool_usage_total{pool="${poolId}"}`);
    this.incrementCounter(`pool_bandwidth_consumed_gb{pool="${poolId}"}`, amountGb);
    this.gauges.set(`pool_daily_usage_gb{pool="${poolId}",beneficiary="${beneficiaryId}"}`, dailyUsage);
    this.gauges.set(`pool_daily_limit_utilization_pct{pool="${poolId}",beneficiary="${beneficiaryId}"}`, 
      (dailyUsage / dailyLimit) * 100);
    
    this.addHistogramValue(`pool_session_size_gb_histogram`, amountGb);
  }

  recordDailyLimitExceeded(poolId: string, beneficiaryId: string, attempted: number, limit: number) {
    this.incrementCounter(`pool_daily_limit_exceeded_total{pool="${poolId}"}`);
    this.gauges.set(`pool_limit_exceeded_amount_gb{pool="${poolId}",beneficiary="${beneficiaryId}"}`, 
      attempted - limit);
  }

  recordPoolSession(poolId: string, beneficiaryId: string, sessionCount: number) {
    this.incrementCounter(`pool_sessions_total{pool="${poolId}"}`);
    this.gauges.set(`pool_beneficiary_sessions{pool="${poolId}",beneficiary="${beneficiaryId}"}`, sessionCount);
  }

  // Routing Engine Metrics
  recordNodeSelection(nodeId: string, score: number, load: number, latencyMs: number) {
    this.incrementCounter(`routing_selections_total{node="${nodeId}"}`);
    this.gauges.set(`routing_node_score{node="${nodeId}"}`, score);
    this.gauges.set(`routing_node_load{node="${nodeId}"}`, load);
    
    this.addHistogramValue('routing_selection_latency_ms_histogram', latencyMs);
  }

  recordCacheHit(cacheKey: string) {
    this.incrementCounter('routing_cache_hits_total');
    this.gauges.set('routing_cache_hit_rate', this.calculateCacheHitRate());
  }

  recordCacheMiss(cacheKey: string) {
    this.incrementCounter('routing_cache_misses_total');
    this.gauges.set('routing_cache_hit_rate', this.calculateCacheHitRate());
  }

  recordLoadDecay(nodeId: string, oldLoad: number, newLoad: number) {
    this.gauges.set(`routing_node_load{node="${nodeId}"}`, newLoad);
    this.incrementCounter(`routing_load_decay_events_total{node="${nodeId}"}`);
  }

  // HTTP 402 Proxy Metrics
  recordProxyRequest(nodeId: string, bytesUsed: number, latencyMs: number, statusCode: number) {
    this.incrementCounter(`proxy_requests_total{node="${nodeId}",status="${statusCode}"}`);
    this.incrementCounter(`proxy_bandwidth_bytes_total{node="${nodeId}"}`, bytesUsed);
    
    this.addHistogramValue('proxy_request_latency_ms_histogram', latencyMs);
    this.addHistogramValue('proxy_request_size_bytes_histogram', bytesUsed);
  }

  recordCredentialValidation(valid: boolean, reason?: string) {
    const label = valid ? 'valid' : 'invalid';
    this.incrementCounter(`proxy_credential_validations_total{result="${label}"}`);
    
    if (!valid && reason) {
      this.incrementCounter(`proxy_credential_failures_total{reason="${reason}"}`);
    }
  }

  recordUsageSettlement(nodeId: string, recordCount: number, totalBytes: number, earningsUsdc: number) {
    this.incrementCounter(`proxy_settlements_total{node="${nodeId}"}`);
    this.incrementCounter(`proxy_settlement_records_total{node="${nodeId}"}`, recordCount);
    this.incrementCounter(`proxy_settlement_bandwidth_bytes_total{node="${nodeId}"}`, totalBytes);
    this.incrementCounter(`proxy_settlement_earnings_usdc_total{node="${nodeId}"}`, earningsUsdc);
    
    this.addHistogramValue('proxy_settlement_size_histogram', recordCount);
  }

  recordUsageBufferSize(size: number) {
    this.gauges.set('proxy_usage_buffer_size', size);
    
    if (size >= 900) { // Alert if approaching max buffer
      this.incrementCounter('proxy_buffer_high_watermark_total');
    }
  }

  // System-wide Metrics
  recordApiRequestDuration(endpoint: string, method: string, durationMs: number, statusCode: number) {
    this.addHistogramValue(`api_request_duration_ms{endpoint="${endpoint}",method="${method}"}`, durationMs);
    this.incrementCounter(`api_requests_total{endpoint="${endpoint}",method="${method}",status="${statusCode}"}`);
  }

  recordError(service: string, errorType: string, errorMessage: string) {
    this.incrementCounter(`errors_total{service="${service}",type="${errorType}"}`);
    
    console.error(`[${service}] ${errorType}: ${errorMessage}`, {
      timestamp: new Date().toISOString(),
      service,
      errorType,
      errorMessage
    });
  }

  recordBlockchainTransaction(programId: string, instruction: string, success: boolean, latencyMs: number) {
    const status = success ? 'success' : 'failure';
    this.incrementCounter(`blockchain_transactions_total{program="${programId}",instruction="${instruction}",status="${status}"}`);
    this.addHistogramValue(`blockchain_transaction_latency_ms_histogram`, latencyMs);
    
    if (!success) {
      this.incrementCounter(`blockchain_transaction_failures_total{program="${programId}",instruction="${instruction}"}`);
    }
  }

  // Helper Methods
  private incrementCounter(key: string, value: number = 1) {
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  private addHistogramValue(key: string, value: number) {
    const existing = this.histograms.get(key) || [];
    existing.push(value);
    
    // Keep only last 1000 values to prevent memory issues
    if (existing.length > 1000) {
      existing.shift();
    }
    
    this.histograms.set(key, existing);
  }

  private calculateCacheHitRate(): number {
    const hits = this.counters.get('routing_cache_hits_total') || 0;
    const misses = this.counters.get('routing_cache_misses_total') || 0;
    const total = hits + misses;
    
    return total > 0 ? (hits / total) * 100 : 0;
  }

  // Export metrics in Prometheus format
  exportPrometheusFormat(): string {
    let output = '';
    
    // Counters
    output += '# HELP Total counters across all services\n';
    output += '# TYPE counter\n';
    for (const [key, value] of this.counters.entries()) {
      output += `${key} ${value}\n`;
    }
    
    // Gauges
    output += '\n# HELP Gauge metrics for current values\n';
    output += '# TYPE gauge\n';
    for (const [key, value] of this.gauges.entries()) {
      output += `${key} ${value}\n`;
    }
    
    // Histograms (simplified - just avg, min, max, p95, p99)
    output += '\n# HELP Histogram metrics with percentiles\n';
    output += '# TYPE histogram\n';
    for (const [key, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      output += `${key}_avg ${avg.toFixed(2)}\n`;
      output += `${key}_min ${min}\n`;
      output += `${key}_max ${max}\n`;
      output += `${key}_p95 ${p95}\n`;
      output += `${key}_p99 ${p99}\n`;
    }
    
    return output;
  }

  // Export metrics as JSON
  exportJSON(): Record<string, any> {
    const histogramStats: Record<string, any> = {};
    
    for (const [key, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      histogramStats[key] = {
        count: values.length,
        avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }
    
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
      timestamp: Date.now(),
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  // Express middleware for automatic request metrics
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.recordApiRequestDuration(
          req.path,
          req.method,
          duration,
          res.statusCode
        );
      });
      
      next();
    };
  }

  // Reset all metrics (useful for testing)
  reset() {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  // Get summary stats
  getSummary(): Record<string, any> {
    return {
      totalCounters: this.counters.size,
      totalGauges: this.gauges.size,
      totalHistograms: this.histograms.size,
      cacheHitRate: this.calculateCacheHitRate(),
      topCounters: Array.from(this.counters.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => ({ key, value }))
    };
  }
}

// Singleton instance
export const metrics = new PrometheusMetrics();

// Export class for testing
export { PrometheusMetrics };
