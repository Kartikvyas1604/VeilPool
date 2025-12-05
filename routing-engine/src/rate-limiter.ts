import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      ...config,
    };

    this.startCleanup();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const identifier = this.getIdentifier(req);
      const now = Date.now();

      let entry = this.limits.get(identifier);

      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + this.config.windowMs,
        };
        this.limits.set(identifier, entry);
      }

      entry.count++;

      res.setHeader('X-RateLimit-Limit', this.config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      if (entry.count > this.config.maxRequests) {
        logger.warn('Rate limit exceeded', {
          identifier,
          count: entry.count,
          limit: this.config.maxRequests,
          path: req.path,
        });

        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again after ${new Date(entry.resetTime).toISOString()}`,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        });
        return;
      }

      next();
    };
  }

  private getIdentifier(req: Request): string {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return `api:${apiKey}`;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim()
      : req.socket.remoteAddress || 'unknown';

    return `ip:${ip}`;
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.limits.entries()) {
        if (now > entry.resetTime + this.config.windowMs) {
          this.limits.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  getStats(): { totalEntries: number; activeWindowsCount: number } {
    const now = Date.now();
    const active = Array.from(this.limits.values()).filter(
      entry => now <= entry.resetTime
    );

    return {
      totalEntries: this.limits.size,
      activeWindowsCount: active.length,
    };
  }
}
