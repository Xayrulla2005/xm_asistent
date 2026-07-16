import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (url) {
      this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
      this.client.on('error', (err) => this.log.error(`Redis error: ${err.message}`));
    } else {
      this.log.warn('REDIS_URL not set — Redis caching disabled');
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.client) await this.client.connect().catch((e) => this.log.error(`Redis connect: ${e.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => void 0);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.set(key, value, 'EX', ttlSeconds).catch((e) => this.log.error(`Redis SET ${key}: ${e.message}`));
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key).catch((e) => { this.log.error(`Redis GET ${key}: ${e.message}`); return null; });
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key).catch((e) => this.log.error(`Redis DEL ${key}: ${e.message}`));
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const n = await this.client.exists(key).catch(() => 0);
    return n > 0;
  }
}
