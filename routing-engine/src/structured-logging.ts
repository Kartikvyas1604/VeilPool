/**
 * Structured Logging System for VeilPool
 * Provides consistent, searchable logs across all services
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogContext {
  service: string;
  requestId?: string;
  userId?: string;
  nodeId?: string;
  transactionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class StructuredLogger {
  private serviceName: string;
  private minLevel: LogLevel;
  private logBuffer: LogEntry[] = [];
  private bufferSize: number = 1000;

  constructor(serviceName: string, minLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  private createLogEntry(level: LogLevel, message: string, context: Partial<LogContext>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        service: this.serviceName,
        ...context
      }
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return entry;
  }

  private writeLog(entry: LogEntry) {
    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }

    // Output to console
    const output = JSON.stringify(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }

  debug(message: string, context: Partial<LogContext> = {}) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context: Partial<LogContext> = {}) {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.createLogEntry(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context: Partial<LogContext> = {}) {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.createLogEntry(LogLevel.WARN, message, context));
    }
  }

  error(message: string, context: Partial<LogContext> = {}, error?: Error) {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog(this.createLogEntry(LogLevel.ERROR, message, context, error));
    }
  }

  fatal(message: string, context: Partial<LogContext> = {}, error?: Error) {
    if (this.shouldLog(LogLevel.FATAL)) {
      this.writeLog(this.createLogEntry(LogLevel.FATAL, message, context, error));
    }
  }

  // Service-specific logging methods
  
  logNodeHeartbeat(nodeId: string, latency: number, packetLoss: number, bandwidth: number) {
    this.info('Node heartbeat received', {
      nodeId,
      latency_ms: latency,
      packet_loss_pct: packetLoss,
      bandwidth_gb: bandwidth,
      event: 'node_heartbeat'
    });
  }

  logNodeReputationChange(nodeId: string, oldRep: number, newRep: number, reason: string) {
    const change = newRep - oldRep;
    const level = change < 0 ? LogLevel.WARN : LogLevel.INFO;
    
    if (this.shouldLog(level)) {
      this.writeLog(this.createLogEntry(level, `Node reputation ${change > 0 ? 'increased' : 'decreased'}`, {
        nodeId,
        old_reputation: oldRep,
        new_reputation: newRep,
        change,
        reason,
        event: 'reputation_change'
      }));
    }
  }

  logPassPurchase(userId: string, passType: string, amount: number, price: number, demandFactor: number) {
    this.info('Privacy pass purchased', {
      userId,
      pass_type: passType,
      amount_gb: amount,
      price_usdc: price,
      demand_factor: demandFactor,
      price_per_gb: price / amount,
      event: 'pass_purchase'
    });
  }

  logDemandPricingUpdate(oldFactor: number, newFactor: number, reason: string) {
    this.info('Demand pricing factor updated', {
      old_factor: oldFactor,
      new_factor: newFactor,
      change_pct: ((newFactor - oldFactor) / oldFactor) * 100,
      reason,
      event: 'demand_pricing_update'
    });
  }

  logPoolUsage(poolId: string, beneficiaryId: string, amountGb: number, remainingGb: number) {
    this.info('Privacy pool bandwidth redeemed', {
      poolId,
      beneficiaryId,
      amount_gb: amountGb,
      remaining_gb: remainingGb,
      utilization_pct: ((remainingGb / (remainingGb + amountGb)) * 100),
      event: 'pool_redemption'
    });
  }

  logDailyLimitExceeded(poolId: string, beneficiaryId: string, attempted: number, limit: number) {
    this.warn('Daily bandwidth limit exceeded', {
      poolId,
      beneficiaryId,
      attempted_gb: attempted,
      limit_gb: limit,
      excess_gb: attempted - limit,
      event: 'daily_limit_exceeded'
    });
  }

  logNodeSelection(nodeId: string, score: number, load: number, latencyMs: number, cacheHit: boolean) {
    this.debug('Node selected for routing', {
      nodeId,
      score,
      load,
      selection_latency_ms: latencyMs,
      cache_hit: cacheHit,
      event: 'node_selection'
    });
  }

  logProxyRequest(nodeId: string, url: string, bytesUsed: number, latencyMs: number, statusCode: number) {
    this.info('Proxy request completed', {
      nodeId,
      url,
      bytes_used: bytesUsed,
      latency_ms: latencyMs,
      status_code: statusCode,
      mb_used: (bytesUsed / (1024 * 1024)).toFixed(3),
      event: 'proxy_request'
    });
  }

  logCredentialValidation(passAccount: string, valid: boolean, reason?: string) {
    const level = valid ? LogLevel.DEBUG : LogLevel.WARN;
    
    if (this.shouldLog(level)) {
      this.writeLog(this.createLogEntry(level, 
        valid ? 'Pass credential validated' : 'Pass credential validation failed',
        {
          pass_account: passAccount,
          valid,
          reason,
          event: 'credential_validation'
        }
      ));
    }
  }

  logUsageSettlement(nodeId: string, recordCount: number, totalBytes: number, earningsUsdc: number) {
    this.info('Usage records settled on-chain', {
      nodeId,
      record_count: recordCount,
      total_bytes: totalBytes,
      total_mb: (totalBytes / (1024 * 1024)).toFixed(2),
      earnings_usdc: earningsUsdc,
      avg_earnings_per_mb: earningsUsdc / (totalBytes / (1024 * 1024)),
      event: 'usage_settlement'
    });
  }

  logBlockchainTransaction(programId: string, instruction: string, signature: string, success: boolean, latencyMs: number, error?: Error) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    
    if (this.shouldLog(level)) {
      this.writeLog(this.createLogEntry(level,
        success ? 'Blockchain transaction successful' : 'Blockchain transaction failed',
        {
          program_id: programId,
          instruction,
          signature,
          latency_ms: latencyMs,
          event: 'blockchain_transaction'
        },
        error
      ));
    }
  }

  logApiRequest(method: string, path: string, statusCode: number, durationMs: number, userId?: string) {
    this.debug('API request processed', {
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
      userId,
      event: 'api_request'
    });
  }

  logSystemError(component: string, errorMessage: string, error: Error) {
    this.error(`System error in ${component}`, {
      component,
      error_message: errorMessage,
      event: 'system_error'
    }, error);
  }

  // Query logs
  queryLogs(filter: {
    level?: LogLevel;
    service?: string;
    event?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogEntry[] {
    let results = [...this.logBuffer];

    if (filter.level) {
      results = results.filter(log => log.level === filter.level);
    }

    if (filter.service) {
      results = results.filter(log => log.context.service === filter.service);
    }

    if (filter.event) {
      results = results.filter(log => log.context.event === filter.event);
    }

    if (filter.startTime) {
      results = results.filter(log => new Date(log.timestamp) >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter(log => new Date(log.timestamp) <= filter.endTime!);
    }

    if (filter.limit) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  // Get log statistics
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {
      total: this.logBuffer.length,
      byLevel: {},
      byEvent: {},
      recentErrors: []
    };

    for (const log of this.logBuffer) {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      // Count by event
      if (log.context.event) {
        stats.byEvent[log.context.event] = (stats.byEvent[log.context.event] || 0) + 1;
      }

      // Collect recent errors
      if ((log.level === LogLevel.ERROR || log.level === LogLevel.FATAL) && log.error) {
        stats.recentErrors.push({
          timestamp: log.timestamp,
          message: log.message,
          error: log.error.message
        });
      }
    }

    // Keep only last 20 errors
    stats.recentErrors = stats.recentErrors.slice(-20);

    return stats;
  }

  // Clear buffer
  clearBuffer() {
    this.logBuffer = [];
  }

  // Export logs
  exportLogs(): LogEntry[] {
    return [...this.logBuffer];
  }
}

// Create logger instances for each service
export const nodeRegistryLogger = new StructuredLogger('node-registry', LogLevel.INFO);
export const privacyPoolLogger = new StructuredLogger('privacy-pool', LogLevel.INFO);
export const privacyPassLogger = new StructuredLogger('privacy-pass', LogLevel.INFO);
export const routingEngineLogger = new StructuredLogger('routing-engine', LogLevel.INFO);
export const proxyLogger = new StructuredLogger('http-402-proxy', LogLevel.INFO);
export const systemLogger = new StructuredLogger('system', LogLevel.INFO);

// Export class for custom loggers
export { StructuredLogger };
