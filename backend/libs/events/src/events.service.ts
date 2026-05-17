import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisEvents } from './events.enum';

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private publisher?: Redis;

  constructor(private readonly config: ConfigService) {}

  async publish<T>(event: RedisEvents, payload: T): Promise<void> {
    const message = JSON.stringify({
      event,
      payload,
      publishedAt: new Date().toISOString(),
    });

    await this.getPublisher().publish(event, message);
    this.logger.log(`Published ${event}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.publisher) {
      await this.publisher.quit();
    }
  }

  private getPublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        maxRetriesPerRequest: 2,
      });
    }

    return this.publisher;
  }
}
