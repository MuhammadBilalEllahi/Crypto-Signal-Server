/* eslint-disable prettier/prettier */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Signal } from 'src/signals/signal.schema';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public readonly redisClient: Redis;

  constructor(private configService: ConfigService) { 
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    console.log('Environment:', nodeEnv);

    if (nodeEnv === 'development') {
      console.log("Initializing Redis in development mode...");
      this.redisClient = new Redis({
        port: this.configService.get('REDIS_PORT', 6379),
        host: this.configService.get('REDIS_HOST', '127.0.0.1'),
        password: this.configService.get('REDIS_PASSWORD', ''),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    } else {
      console.log("Initializing Redis in production mode...");
      const redisUrl = this.configService.get('REDIS_URL');
      if (!redisUrl) {
        throw new Error('REDIS_URL is not defined in the production environment.');
      }
      this.redisClient = new Redis(`${redisUrl}?family=0`);
    }

    this.redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redisClient.on('connect', () => {
      console.log('Successfully connected to Redis');
    });
  }

  async onModuleInit() {
    // Additional initialization if needed
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.setex(key, ttl, stringValue);
      } else {
        await this.redisClient.set(key, stringValue);
      }
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async setHash(key: string, field: string, value: any): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      await this.redisClient.hset(key, field, stringValue);
    } catch (error) {
      console.error('Redis setHash error:', error);
      throw error;
    }
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redisClient.hget(key, field);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis getHash error:', error);
      return null;
    }
  }

  async delHash(key: string, field: string): Promise<void> {
    try {
      await this.redisClient.hdel(key, field);
    } catch (error) {
      console.error('Redis delHash error:', error);
      throw error;
    }
  }

  async setWithExpiry(key: string, value: any, seconds: number): Promise<void> {
    try {
      await this.redisClient.setex(key, seconds, JSON.stringify(value));
    } catch (error) {
      console.error('Redis setWithExpiry error:', error);
      throw error;
    }
  }

  async increment(key: string): Promise<number> {
    try {
      return await this.redisClient.incr(key);
    } catch (error) {
      console.error('Redis increment error:', error);
      throw error;
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      return await this.redisClient.decr(key);
    } catch (error) {
      console.error('Redis decrement error:', error);
      throw error;
    }
  }

  async removeFromHistory(signalId: string): Promise<void> {
    try {
      const history = await this.redisClient.get('signal_history') as string;
      if (history) {
        const historyArray = JSON.parse(history) as Signal[] | null;
        if (historyArray) {
          const index = historyArray.findIndex((signal: Signal) => signal._id === signalId);
          if (index !== -1) {
            historyArray.splice(index, 1);
          }
          await this.redisClient.set('signal_history', JSON.stringify(historyArray));
        }
      }
    } catch (error) {
      console.error('Redis removeFromHistory error:', error);
      throw error;
    }
  }

  async removeFromFavourites(signalId: string): Promise<void> {
    try {
      const favourites = await this.redisClient.get('user_favourite_signals') as string;
      if (favourites) {
        const favouritesArray = JSON.parse(favourites) as Signal[] | null;
        if (favouritesArray) {
          const index = favouritesArray.findIndex((signal: Signal) => signal._id === signalId);
          if (index !== -1) {
            favouritesArray.splice(index, 1);
          }
          await this.redisClient.set('user_favourite_signals', JSON.stringify(favouritesArray));
        }
      }
    } catch (error) {
      console.error('Redis removeFromFavourites error:', error);
      throw error;
    }
  }

  async updateSignalData(signalId: string, data: any): Promise<void> {
    try {
      const signal = await this.redisClient.get(`signal_${signalId}`);
      if (signal) {
        await this.redisClient.set(`signal_${signalId}`, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Redis updateSignalData error:', error);
      throw error;
    }
  }
}
