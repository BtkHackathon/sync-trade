import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

export type BidLockHandle = { key: string; token: string };

@Injectable()
export class BidLockService implements OnModuleDestroy {
  private redis?: Redis;

  constructor(private readonly config: ConfigService) {}

  async acquire(auctionId: string, ttlMs = 15_000): Promise<BidLockHandle> {
    const key = `bid:lock:${auctionId}`;
    const token = randomUUID();
    const client = this.getClient();
    const ok = await client.set(key, token, 'PX', ttlMs, 'NX');
    if (ok !== 'OK') {
      throw new Error('LOCK_NOT_ACQUIRED');
    }
    return { key, token };
  }

  async release(handle: BidLockHandle): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.getClient().eval(script, 1, handle.key, handle.token);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private getClient(): Redis {
    if (!this.redis) {
      this.redis = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        maxRetriesPerRequest: 2,
      });
    }
    return this.redis;
  }
}
