import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisEvents } from '@app/events';
import { AnalysisService } from '../analysis/analysis.service';

@Injectable()
export class AuctionListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionListenerService.name);
  private subscriber?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly analysis: AnalysisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 2,
    });

    this.subscriber.on('message', (_, message) => {
      void this.handleClosedAuction(message);
    });

    try {
      await this.subscriber.subscribe(RedisEvents.AUCTION_CLOSED);
      this.logger.log(`Listening for ${RedisEvents.AUCTION_CLOSED}`);
    } catch (error) {
      this.logger.warn(
        `Redis listener could not subscribe: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  private async handleClosedAuction(message: string): Promise<void> {
    try {
      const envelope = JSON.parse(message) as { payload?: { auctionId?: string } };
      const auctionId = envelope.payload?.auctionId;
      if (!auctionId) {
        return;
      }

      await this.analysis.analyzeClosedAuctionFromEvent(auctionId);
      this.logger.log(`AI report generated for closed auction ${auctionId}`);
    } catch (error) {
      this.logger.warn(
        `Closed auction analysis failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
