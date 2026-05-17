import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuctionStatus, BidStatus, CompanyRole, Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { EventOutboxService, RedisEvents } from '@app/events';
import { JwtPayload } from '@app/common';
import { BidLockService } from './bid-lock.service';
import { BidsService } from './bids.service';

describe('BidsService', () => {
  let service: BidsService;
  let prisma: any;
  let outbox: any;
  let locks: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback: any) => callback(prisma)),
      $executeRaw: jest.fn(),
      auction: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bid: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
      bidHistory: {
        create: jest.fn(),
      },
    };

    outbox = {
      enqueue: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      publishOne: jest.fn().mockResolvedValue(true),
    };

    locks = {
      acquire: jest
        .fn()
        .mockResolvedValue({ key: 'bid:lock:auction-1', token: 't' }),
      release: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventOutboxService, useValue: outbox },
        { provide: BidLockService, useValue: locks },
      ],
    }).compile();

    service = module.get(BidsService);
  });

  it('rejects bid placement before supplier verification', async () => {
    prisma.company.findUnique.mockResolvedValue({
      role: CompanyRole.SUPPLIER,
      isVerified: false,
    });

    await expect(
      service.placeBid('supplier-1', {
        auctionId: 'auction-1',
        amount: 95_000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(locks.acquire).not.toHaveBeenCalled();
    expect(prisma.bid.upsert).not.toHaveBeenCalled();
  });

  it('places a lower bid and publishes a bid placed event through outbox', async () => {
    prisma.company.findUnique.mockResolvedValueOnce({
      role: CompanyRole.SUPPLIER,
      isVerified: true,
    });

    prisma.auction.findUnique.mockResolvedValue({
      id: 'auction-1',
      status: AuctionStatus.OPEN,
      endsAt: new Date(Date.now() + 60_000),
      maxBudget: new Prisma.Decimal(120_000),
      buyerId: 'buyer-1',
      lowestBidAmount: new Prisma.Decimal(100_000),
    });
    prisma.bid.aggregate
      .mockResolvedValueOnce({
        _min: { amount: new Prisma.Decimal(100_000) },
        _count: { _all: 1 },
      })
      .mockResolvedValueOnce({
        _min: { amount: new Prisma.Decimal(95_000) },
        _count: { _all: 2 },
      });
    prisma.company.findUnique.mockResolvedValueOnce({
      name: 'Guvenilir Tedarik A.S.',
    });
    prisma.bid.findUnique.mockResolvedValue(null);
    prisma.bid.upsert.mockResolvedValue({
      id: 'bid-1',
      auctionId: 'auction-1',
      supplierId: 'supplier-1',
      amount: new Prisma.Decimal(95_000),
      status: BidStatus.ACTIVE,
    });

    const result = await service.placeBid(
      'supplier-1',
      {
        auctionId: 'auction-1',
        amount: 95_000,
      },
      '127.0.0.1',
    );

    expect(result.id).toBe('bid-1');
    expect(prisma.auction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'auction-1' },
        data: expect.objectContaining({
          lowestBidAmount: new Prisma.Decimal(95_000),
          bidCount: 2,
        }),
      }),
    );
    expect(outbox.enqueue).toHaveBeenCalledWith(
      prisma,
      RedisEvents.BID_PLACED,
      expect.objectContaining({
        bidId: 'bid-1',
        auctionId: 'auction-1',
        supplierId: 'supplier-1',
        amount: 95_000,
        previousLowestAmount: 100_000,
        isNewLowest: true,
        totalBidCount: 2,
      }),
    );
    expect(outbox.publishOne).toHaveBeenCalledWith('outbox-1');
    expect(locks.release).toHaveBeenCalledWith({
      key: 'bid:lock:auction-1',
      token: 't',
    });
  });

  it('allows only the owner buyer to list auction bids', async () => {
    prisma.auction.findUnique.mockResolvedValue({ buyerId: 'another-buyer' });

    await expect(
      service.listForAuction('auction-1', {
        sub: 'buyer-1',
        role: CompanyRole.BUYER,
      } as JwtPayload),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.bid.findMany).not.toHaveBeenCalled();
  });
});
