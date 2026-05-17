import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OutboxEventStatus } from '@prisma/client';
import { PrismaService } from '@app/database';
import { EventOutboxService } from './event-outbox.service';
import { EventsService } from './events.service';
import { RedisEvents } from './events.enum';

describe('EventOutboxService', () => {
  let service: EventOutboxService;
  let prisma: any;
  let events: any;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    prisma = {
      eventOutbox: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    events = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventOutboxService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: events },
      ],
    }).compile();

    service = module.get(EventOutboxService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('enqueues an event without publishing inside the transaction', async () => {
    prisma.eventOutbox.create.mockResolvedValue({ id: 'outbox-1' });

    const result = await service.enqueue(prisma, RedisEvents.AUCTION_OPENED, {
      auctionId: 'auction-1',
    });

    expect(result).toEqual({ id: 'outbox-1' });
    expect(prisma.eventOutbox.create).toHaveBeenCalledWith({
      data: {
        event: RedisEvents.AUCTION_OPENED,
        payload: { auctionId: 'auction-1' },
      },
      select: { id: true },
    });
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('marks an outbox event as published after Redis publish succeeds', async () => {
    prisma.eventOutbox.findUnique.mockResolvedValue({
      id: 'outbox-1',
      event: RedisEvents.AUCTION_CLOSED,
      payload: { auctionId: 'auction-1' },
      status: OutboxEventStatus.PENDING,
    });
    prisma.eventOutbox.updateMany.mockResolvedValue({ count: 1 });
    prisma.eventOutbox.update.mockResolvedValue({});

    await expect(service.publishOne('outbox-1')).resolves.toBe(true);

    expect(events.publish).toHaveBeenCalledWith(RedisEvents.AUCTION_CLOSED, {
      auctionId: 'auction-1',
    });
    expect(prisma.eventOutbox.update).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: expect.objectContaining({
        status: OutboxEventStatus.PUBLISHED,
      }),
    });
  });

  it('keeps a failed publish retryable', async () => {
    prisma.eventOutbox.findUnique.mockResolvedValue({
      id: 'outbox-1',
      event: RedisEvents.AUCTION_CLOSED,
      payload: { auctionId: 'auction-1' },
      status: OutboxEventStatus.PENDING,
    });
    prisma.eventOutbox.updateMany.mockResolvedValue({ count: 1 });
    prisma.eventOutbox.update.mockResolvedValue({});
    events.publish.mockRejectedValue(new Error('redis unavailable'));

    await expect(service.publishOne('outbox-1')).resolves.toBe(false);

    expect(prisma.eventOutbox.update).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: {
        status: OutboxEventStatus.FAILED,
        lastError: 'redis unavailable',
      },
    });
  });
});
