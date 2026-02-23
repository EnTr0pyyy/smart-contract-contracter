/**
 * Redis Cache Service
 * Production-grade caching layer with TTL and error handling
 */

import { createClient, RedisClientType } from 'redis';
import config from '../../config';

class CacheService {
  private client: RedisClientType | null = null;
  private connected: boolean = false;

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: config.redisUrl,
        password: config.redisPassword,
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.connected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      const ttl = ttlSeconds || config.redisTTL;
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.connected || !this.client) {
      return 0;
    }

    try {
      const value = await this.client.incr(key);
      
      // Set TTL only on first increment
      if (value === 1 && ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
      }
      
      return value;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    if (!this.connected || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export default new CacheService();
