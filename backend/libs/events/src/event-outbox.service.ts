import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { RedisEvents } from './events.enum';
import { EventsService } from './events.service';

type OutboxWriter = PrismaService | Prisma.TransactionClient;

@Injectable()
export class EventOutboxService {
  private readonly logger = new Logger(EventOutboxService.name);
  private readonly maxAttempts = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async enqueue<T>(writer: OutboxWriter, event: RedisEvents, payload: T) {
    return writer.eventOutbox.create({
      data: {
        event,
        payload: payload as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  }

  async publishOne(id: string): Promise<boolean> {
    const outboxEvent = await this.prisma.eventOutbox.findUnique({
      where: { id },
    });

    if (!outboxEvent || outboxEvent.status === OutboxEventStatus.PUBLISHED) {
      return false;
    }

    const locked = await this.prisma.eventOutbox.updateMany({
      where: {
        id,
        status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] },
        attempts: { lt: this.maxAttempts },
      },
      data: {
        status: OutboxEventStatus.PROCESSING,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    if (locked.count !== 1) {
      return false;
    }

    try {
      await this.events.publish(
        outboxEvent.event as RedisEvents,
        outboxEvent.payload,
      );

      await this.prisma.eventOutbox.update({
        where: { id },
        data: {
          status: OutboxEventStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      await this.prisma.eventOutbox.update({
        where: { id },
        data: {
          status: OutboxEventStatus.FAILED,
          lastError: error instanceof Error ? error.message : String(error),
        },
      });

      this.logger.error(
        `outbox publish failed for ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      return false;
    }
  }

  async publishPending(limit = 25): Promise<number> {
    const pendingEvents = await this.prisma.eventOutbox.findMany({
      where: {
        status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] },
        attempts: { lt: this.maxAttempts },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let publishedCount = 0;

    for (const event of pendingEvents) {
      if (await this.publishOne(event.id)) {
        publishedCount += 1;
      }
    }

    return publishedCount;
  }

  @Cron('*/30 * * * * *')
  async publishPendingCron(): Promise<void> {
    const publishedCount = await this.publishPending();

    if (publishedCount > 0) {
      this.logger.log(`Published ${publishedCount} pending outbox event(s).`);
    }
  }
}
