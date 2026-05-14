import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisEvents } from '@app/events';
import { AuctionGateway } from './gateways/auction.gateway';

const SUBSCRIBED: RedisEvents[] = [
  RedisEvents.BID_PLACED,
  RedisEvents.BID_WITHDRAWN,
  RedisEvents.AUCTION_OPENED,
  RedisEvents.AUCTION_CLOSED,
];

@Injectable()
export class RedisEventsBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisEventsBridge.name);
  private subscriber?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly auctionGateway: AuctionGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 2,
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      this.dispatch(channel as RedisEvents, message);
    });

    for (const ch of SUBSCRIBED) {
      await this.subscriber.subscribe(ch);
    }

    this.logger.log(`Redis Pub/Sub dinleniyor: ${SUBSCRIBED.join(', ')}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  private dispatch(channel: RedisEvents, message: string) {
    try {
      const envelope = JSON.parse(message) as {
        event?: string;
        payload?: Record<string, unknown>;
        publishedAt?: string;
      };

      const payload = envelope.payload ?? {};
      const auctionId =
        typeof payload.auctionId === 'string' ? payload.auctionId : undefined;

      if (!auctionId) {
        return;
      }

      switch (channel) {
        case RedisEvents.BID_PLACED:
          this.auctionGateway.emitAuctionEvent(auctionId, 'bid-update', envelope);
          break;
        case RedisEvents.BID_WITHDRAWN:
          this.auctionGateway.emitAuctionEvent(auctionId, 'bid-withdrawn', envelope);
          break;
        case RedisEvents.AUCTION_OPENED:
          this.auctionGateway.emitAuctionEvent(auctionId, 'auction-opened', envelope);
          break;
        case RedisEvents.AUCTION_CLOSED:
          this.auctionGateway.emitAuctionEvent(auctionId, 'auction-closed', envelope);
          break;
        default:
          break;
      }
    } catch (e) {
      this.logger.warn(`Mesaj cozumlenemedi (${channel}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
