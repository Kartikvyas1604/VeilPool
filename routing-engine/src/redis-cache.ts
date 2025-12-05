import { createClient, RedisClientType } from 'redis';

export class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(url: string): Promise<void> {
    try {
      this.client = createClient({ 
        url,
        socket: {
          reconnectStrategy: false // Don't auto-reconnect if initial connection fails
        }
      });
      
      this.client.on('error', (err: Error) => {
        // Only log once, don't spam
        if (this.isConnected) {
          console.error('Redis Client Error:', err.message);
          this.isConnected = false;
        }
      });

      this.client.on('connect', () => {
        console.log('Redis connected successfully');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.warn('Redis not available, using in-memory cache');
      this.isConnected = false;
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async setNodeRanking(region: string, nodes: any[]): Promise<void> {
    await this.set(`ranking:${region}`, nodes, 300);
  }

  async getNodeRanking(region: string): Promise<any[] | null> {
    return await this.get(`ranking:${region}`);
  }

  async cacheRoutingDecision(userId: string, decision: any): Promise<void> {
    await this.set(`routing:${userId}`, decision, 300);
  }

  async getCachedRouting(userId: string): Promise<any | null> {
    return await this.get(`routing:${userId}`);
  }

  async incrementCounter(key: string): Promise<number> {
    if (!this.isConnected || !this.client) return 0;

    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  async getStats(): Promise<Record<string, any>> {
    if (!this.isConnected || !this.client) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('stats');
      return {
        connected: true,
        info,
      };
    } catch (error) {
      return { connected: false, error: String(error) };
    }
  }
}
