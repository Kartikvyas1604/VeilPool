type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    this.logLevel = envLevel && envLevel in this.levels ? envLevel : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry);
    }

    const { timestamp, level, message, context, correlationId } = entry;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const correlationStr = correlationId ? ` [${correlationId}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${correlationStr} ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, correlationId?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      correlationId,
    };

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'error':
        console.error(formattedLog);
        break;
    }
  }

  debug(message: string, context?: Record<string, any>, correlationId?: string): void {
    this.log('debug', message, context, correlationId);
  }

  info(message: string, context?: Record<string, any>, correlationId?: string): void {
    this.log('info', message, context, correlationId);
  }

  warn(message: string, context?: Record<string, any>, correlationId?: string): void {
    this.log('warn', message, context, correlationId);
  }

  error(message: string, context?: Record<string, any>, correlationId?: string): void {
    this.log('error', message, context, correlationId);
  }
}

export const logger = new Logger();
