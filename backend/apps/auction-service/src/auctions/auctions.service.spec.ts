import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuctionStatus, BidStatus, CompanyRole } from '@prisma/client';
import { PrismaService } from '@app/database';
import { EventOutboxService, RedisEvents } from '@app/events';
import { JwtPayload } from '@app/common';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';

describe('AuctionsService', () => {
  let service: AuctionsService;
  let prisma: any;
  let outbox: any;

  const validDto: CreateAuctionDto = {
    title: '500 Adet Ofis Koltugu',
    description: 'Manisa ofisi icin ergonomik calisma koltugu alimi.',
    category: 'Ofis Mobilyasi',
    quantity: 500,
    unit: 'adet',
    maxBudget: 1000000,
    deliveryDeadline: new Date(
      Date.now() + 20 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryAddress: 'Manisa OSB',
    requirements: ['CE sertifikasi zorunlu'],
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((input: any) => {
        if (Array.isArray(input)) return Promise.all(input);
        return input(prisma);
      }),
      auction: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      awardedBid: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      bid: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
    };

    outbox = {
      enqueue: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      publishOne: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventOutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(AuctionsService);
  });

  it('rejects auction creation for unverified buyers', async () => {
    prisma.company.findUnique.mockResolvedValue({
      role: CompanyRole.BUYER,
      isVerified: false,
    });

    await expect(service.create('buyer-1', validDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.auction.create).not.toHaveBeenCalled();
  });

  it('returns full bid detail only to the owner buyer', async () => {
    const publicAuction = {
      id: 'auction-1',
      buyerId: 'buyer-1',
      awardedBid: null,
      documents: [],
    };
    const ownerAuction = {
      ...publicAuction,
      bids: [
        {
          id: 'bid-1',
          supplierId: 'supplier-1',
          amount: 900000,
          supplier: { id: 'supplier-1', email: 'supplier@example.com' },
        },
      ],
    };

    prisma.auction.findUnique.mockResolvedValue(ownerAuction);

    const result = await service.findOne('auction-1', {
      sub: 'buyer-1',
      role: CompanyRole.BUYER,
    } as JwtPayload);

    expect(result).toEqual(ownerAuction);
    expect(prisma.bid.findMany).not.toHaveBeenCalled();
  });

  it('returns only the supplier own bids to suppliers', async () => {
    prisma.auction.findUnique.mockResolvedValue({
      id: 'auction-1',
      buyerId: 'buyer-1',
      awardedBid: { id: 'award-1', supplierId: 'another-supplier' },
      documents: [],
    });
    prisma.bid.findMany.mockResolvedValue([
      {
        id: 'bid-own',
        auctionId: 'auction-1',
        supplierId: 'supplier-1',
        amount: 910000,
        note: null,
        status: BidStatus.ACTIVE,
      },
    ]);

    const result = await service.findOne('auction-1', {
      sub: 'supplier-1',
      role: CompanyRole.SUPPLIER,
    } as JwtPayload);

    expect((result as any).bids).toEqual([
      expect.objectContaining({
        id: 'bid-own',
        supplierId: 'supplier-1',
      }),
    ]);
    expect(result.awardedBid).toBeNull();
    expect(prisma.bid.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          auctionId: 'auction-1',
          supplierId: 'supplier-1',
        },
      }),
    );
  });

  it('opens an auction and persists the opened event through outbox', async () => {
    const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    prisma.auction.findUnique.mockResolvedValue({
      id: 'auction-1',
      buyerId: 'buyer-1',
      status: AuctionStatus.DRAFT,
      deliveryDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      endsAt,
    });
    prisma.company.findUnique.mockResolvedValue({
      role: CompanyRole.BUYER,
      isVerified: true,
    });
    prisma.auction.update.mockResolvedValue({
      id: 'auction-1',
      buyerId: 'buyer-1',
      title: '500 Adet Ofis Koltugu',
      category: 'Ofis Mobilyasi',
      quantity: 500,
      unit: 'adet',
      maxBudget: 1000000,
      endsAt,
      status: AuctionStatus.OPEN,
    });

    await service.open('auction-1', 'buyer-1');

    expect(outbox.enqueue).toHaveBeenCalledWith(
      prisma,
      RedisEvents.AUCTION_OPENED,
      expect.objectContaining({
        auctionId: 'auction-1',
        title: '500 Adet Ofis Koltugu',
      }),
    );
    expect(outbox.publishOne).toHaveBeenCalledWith('outbox-1');
  });
});
