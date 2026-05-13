import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuctionStatus,
  BidStatus,
  CompanyRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/database';
import { JwtPayload } from '@app/common';
import {
  AuctionClosedEvent,
  AuctionOpenedEvent,
  EventOutboxService,
  RedisEvents,
} from '@app/events';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { QueryAuctionDto } from './dto/query-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  private readonly buyerSelect = {
    id: true,
    name: true,
    email: true,
    sector: true,
    city: true,
    isVerified: true,
  } as const;

  private readonly auctionListInclude = {
    buyer: { select: this.buyerSelect },
  } as const;

  private readonly auctionPublicInclude = {
    buyer: { select: this.buyerSelect },
    awardedBid: true,
    documents: true,
  } as const;

  private readonly auctionOwnerDetailInclude = {
    buyer: { select: this.buyerSelect },
    bids: {
      orderBy: { amount: 'asc' },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            sector: true,
            city: true,
            isVerified: true,
            supplierProfile: true,
          },
        },
      },
    },
    awardedBid: true,
    documents: true,
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: EventOutboxService,
  ) {}

  async create(buyerId: string, dto: CreateAuctionDto) {
    await this.assertVerifiedBuyer(buyerId);
    this.assertValidAuctionDates(dto.deliveryDeadline, dto.endsAt);

    return this.prisma.auction.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        quantity: dto.quantity,
        unit: dto.unit,
        maxBudget: dto.maxBudget,
        deliveryDeadline: new Date(dto.deliveryDeadline),
        deliveryAddress: dto.deliveryAddress,
        requirements: dto.requirements ?? [],
        endsAt: new Date(dto.endsAt),
        buyerId,
        specDocumentUrl: dto.specDocumentUrl,
        status: AuctionStatus.DRAFT,
      },
      include: this.auctionOwnerDetailInclude,
    });
  }

  async findAll(query: QueryAuctionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { status: 'asc' },
          { endsAt: 'asc' },
        ],
        include: this.auctionListInclude,
      }),
      this.prisma.auction.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, viewer: JwtPayload) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: this.auctionPublicInclude,
    });

    if (!auction) {
      throw new NotFoundException('Ihale bulunamadi.');
    }

    if (viewer.role === CompanyRole.BUYER && auction.buyerId === viewer.sub) {
      return this.prisma.auction.findUnique({
        where: { id },
        include: this.auctionOwnerDetailInclude,
      });
    }

    const bids = await this.findVisibleBidsForViewer(id, viewer);

    return {
      ...auction,
      bids,
      awardedBid:
        auction.awardedBid?.supplierId === viewer.sub ? auction.awardedBid : null,
    };
  }

  async update(id: string, buyerId: string, dto: UpdateAuctionDto) {
    const auction = await this.getOwnedAuction(id, buyerId);

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Sadece taslak ihaleler guncellenebilir.');
    }

    this.assertValidAuctionDates(
      dto.deliveryDeadline ?? auction.deliveryDeadline,
      dto.endsAt ?? auction.endsAt,
    );

    const data: Prisma.AuctionUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.maxBudget !== undefined) data.maxBudget = dto.maxBudget;
    if (dto.deliveryDeadline !== undefined) {
      data.deliveryDeadline = new Date(dto.deliveryDeadline);
    }
    if (dto.deliveryAddress !== undefined) data.deliveryAddress = dto.deliveryAddress;
    if (dto.requirements !== undefined) data.requirements = { set: dto.requirements };
    if (dto.endsAt !== undefined) data.endsAt = new Date(dto.endsAt);
    if (dto.specDocumentUrl !== undefined) data.specDocumentUrl = dto.specDocumentUrl;

    return this.prisma.auction.update({
      where: { id },
      data,
      include: this.auctionOwnerDetailInclude,
    });
  }

  async open(id: string, buyerId: string) {
    const auction = await this.getOwnedAuction(id, buyerId);

    if (auction.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Sadece taslak ihaleler yayina alinabilir.');
    }

    if (auction.endsAt <= new Date()) {
      throw new BadRequestException('Bitis tarihi gecmis ihale yayina alinamaz.');
    }

    const { openedAuction, outboxId } = await this.prisma.$transaction(async (tx) => {
      const openedAuction = await tx.auction.update({
        where: { id },
        data: { status: AuctionStatus.OPEN },
        include: this.auctionOwnerDetailInclude,
      });

      const outboxRecord = await this.outbox.enqueue(
        tx,
        RedisEvents.AUCTION_OPENED,
        this.buildAuctionOpenedEvent(openedAuction),
      );

      return { openedAuction, outboxId: outboxRecord.id };
    });

    await this.outbox.publishOne(outboxId);

    return openedAuction;
  }

  async close(id: string, buyerId: string) {
    const auction = await this.getOwnedAuction(id, buyerId);

    if (auction.status !== AuctionStatus.OPEN) {
      throw new BadRequestException('Sadece acik ihaleler kapatilabilir.');
    }

    const { closedAuction, outboxId } = await this.prisma.$transaction(async (tx) => {
      const closedAuction = await tx.auction.update({
        where: { id },
        data: { status: AuctionStatus.CLOSED },
        include: this.auctionOwnerDetailInclude,
      });

      const outboxRecord = await this.outbox.enqueue(
        tx,
        RedisEvents.AUCTION_CLOSED,
        this.buildAuctionClosedEvent(closedAuction),
      );

      return { closedAuction, outboxId: outboxRecord.id };
    });

    await this.outbox.publishOne(outboxId);

    return closedAuction;
  }

  async cancel(id: string, buyerId: string) {
    const auction = await this.getOwnedAuction(id, buyerId);

    if (
      auction.status !== AuctionStatus.DRAFT &&
      auction.status !== AuctionStatus.OPEN
    ) {
      throw new BadRequestException('Bu durumdaki ihale iptal edilemez.');
    }

    return this.prisma.auction.update({
      where: { id },
      data: { status: AuctionStatus.CANCELLED },
      include: this.auctionOwnerDetailInclude,
    });
  }

  async award(id: string, bidId: string, buyerId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const auction = await tx.auction.findUnique({
          where: { id },
          select: { id: true, buyerId: true, status: true },
        });

        if (!auction) {
          throw new NotFoundException('Ihale bulunamadi.');
        }

        if (auction.buyerId !== buyerId) {
          throw new ForbiddenException('Bu ihale uzerinde islem yapma yetkiniz yok.');
        }

        const buyer = await tx.company.findUnique({
          where: { id: buyerId },
          select: { role: true, isVerified: true },
        });

        this.assertBuyerCanManageAuctions(buyer);

        const existingAward = await tx.awardedBid.findUnique({
          where: { auctionId: id },
        });

        if (existingAward) {
          throw new ConflictException('Bu ihale icin kazanan zaten secilmis.');
        }

        if (auction.status !== AuctionStatus.CLOSED) {
          throw new BadRequestException('Kazanan secmek icin ihale once kapatilmalidir.');
        }

        const bid = await tx.bid.findFirst({
          where: {
            id: bidId,
            auctionId: id,
            status: BidStatus.ACTIVE,
          },
        });

        if (!bid) {
          throw new NotFoundException('Teklif bulunamadi.');
        }

        await tx.awardedBid.create({
          data: {
            auctionId: id,
            bidId,
            supplierId: bid.supplierId,
          },
        });

        await tx.auction.update({
          where: { id },
          data: { status: AuctionStatus.AWARDED },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Bu ihale icin kazanan zaten secilmis.');
      }

      throw error;
    }

    return this.findOne(id, { sub: buyerId, role: CompanyRole.BUYER } as JwtPayload);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpired() {
    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.OPEN,
        endsAt: { lte: new Date() },
      },
      select: {
        id: true,
        buyerId: true,
        title: true,
        bidCount: true,
        lowestBidAmount: true,
      },
    });

    let closedCount = 0;

    for (const auction of expiredAuctions) {
      const outboxId = await this.prisma.$transaction(async (tx) => {
        const result = await tx.auction.updateMany({
          where: {
            id: auction.id,
            status: AuctionStatus.OPEN,
            endsAt: { lte: new Date() },
          },
          data: { status: AuctionStatus.CLOSED },
        });

        if (result.count !== 1) {
          return null;
        }

        const outboxRecord = await this.outbox.enqueue(
          tx,
          RedisEvents.AUCTION_CLOSED,
          this.buildAuctionClosedEvent(auction),
        );

        return outboxRecord.id;
      });

      if (outboxId) {
        closedCount += 1;
        await this.outbox.publishOne(outboxId);
      }
    }

    if (closedCount > 0) {
      this.logger.log(`${closedCount} expired auction(s) closed.`);
    }

    return closedCount;
  }

  private buildWhere(query: QueryAuctionDto): Prisma.AuctionWhereInput {
    const where: Prisma.AuctionWhereInput = {};

    if (query.status) {
      where.status = query.status as AuctionStatus;
    }

    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private findVisibleBidsForViewer(id: string, viewer: JwtPayload) {
    if (viewer.role !== CompanyRole.SUPPLIER) {
      return [];
    }

    return this.prisma.bid.findMany({
      where: {
        auctionId: id,
        supplierId: viewer.sub,
      },
      orderBy: { amount: 'asc' },
      select: {
        id: true,
        auctionId: true,
        supplierId: true,
        amount: true,
        note: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async assertVerifiedBuyer(buyerId: string) {
    const buyer = await this.prisma.company.findUnique({
      where: { id: buyerId },
      select: { role: true, isVerified: true },
    });

    this.assertBuyerCanManageAuctions(buyer);
  }

  private assertBuyerCanManageAuctions(
    buyer: { role: CompanyRole; isVerified: boolean } | null,
  ) {
    if (!buyer) {
      throw new NotFoundException('Alici firma bulunamadi.');
    }

    if (buyer.role !== CompanyRole.BUYER) {
      throw new ForbiddenException('Sadece alici firmalar ihale islemi yapabilir.');
    }

    if (!buyer.isVerified) {
      throw new ForbiddenException('Firma dogrulamasi tamamlanmadan ihale islemi yapilamaz.');
    }
  }

  private async getOwnedAuction(id: string, buyerId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        status: true,
        deliveryDeadline: true,
        endsAt: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('Ihale bulunamadi.');
    }

    if (auction.buyerId !== buyerId) {
      throw new ForbiddenException('Bu ihale uzerinde islem yapma yetkiniz yok.');
    }

    await this.assertVerifiedBuyer(buyerId);

    return auction;
  }

  private assertValidAuctionDates(
    deliveryDeadline?: string | Date,
    endsAt?: string | Date,
    requireBoth = true,
  ) {
    const now = new Date();
    const deliveryDate = this.toDate(deliveryDeadline);
    const endDate = this.toDate(endsAt);

    if (requireBoth && (!deliveryDate || !endDate)) {
      throw new BadRequestException('Teslim tarihi ve ihale bitis tarihi zorunludur.');
    }

    if (deliveryDate && deliveryDate <= now) {
      throw new BadRequestException('Teslim tarihi gelecekte olmalidir.');
    }

    if (endDate && endDate <= now) {
      throw new BadRequestException('Ihale bitis tarihi gelecekte olmalidir.');
    }

    if (deliveryDate && endDate && deliveryDate <= endDate) {
      throw new BadRequestException('Teslim tarihi ihale bitis tarihinden sonra olmalidir.');
    }
  }

  private toDate(value?: string | Date) {
    if (value === undefined) return undefined;
    return value instanceof Date ? value : new Date(value);
  }

  private buildAuctionOpenedEvent(auction: {
    id: string;
    buyerId: string;
    title: string;
    category: string;
    quantity: number;
    unit: string;
    maxBudget: Prisma.Decimal | number;
    endsAt: Date;
  }): AuctionOpenedEvent {
    return {
      auctionId: auction.id,
      buyerId: auction.buyerId,
      title: auction.title,
      category: auction.category,
      quantity: auction.quantity,
      unit: auction.unit,
      maxBudget: Number(auction.maxBudget),
      endsAt: auction.endsAt.toISOString(),
      openedAt: new Date().toISOString(),
    };
  }

  private buildAuctionClosedEvent(auction: {
    id: string;
    buyerId: string;
    title: string;
    bidCount: number;
    lowestBidAmount: Prisma.Decimal | number | null;
  }): AuctionClosedEvent {
    return {
      auctionId: auction.id,
      buyerId: auction.buyerId,
      title: auction.title,
      totalBids: auction.bidCount,
      lowestBidAmount:
        auction.lowestBidAmount === null ? null : Number(auction.lowestBidAmount),
      closedAt: new Date().toISOString(),
    };
  }
}
