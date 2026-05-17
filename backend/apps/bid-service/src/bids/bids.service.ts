import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuctionStatus,
  BidHistoryAction,
  BidStatus,
  CompanyRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/database';
import { JwtPayload } from '@app/common';
import {
  BidPlacedEvent,
  BidWithdrawnEvent,
  EventOutboxService,
  RedisEvents,
} from '@app/events';
import { PlaceBidDto } from './dto/place-bid.dto';
import { BidLockHandle, BidLockService } from './bid-lock.service';

@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  private readonly bidListInclude = {
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
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: EventOutboxService,
    private readonly locks: BidLockService,
  ) {}

  async placeBid(
    supplierId: string,
    dto: PlaceBidDto,
    ipAddress?: string | null,
  ) {
    await this.assertVerifiedSupplier(supplierId);
    const amount = new Prisma.Decimal(dto.amount);

    let lock: BidLockHandle | undefined;
    try {
      lock = await this.locks.acquire(dto.auctionId);
    } catch (e) {
      if (e instanceof Error && e.message === 'LOCK_NOT_ACQUIRED') {
        throw new ConflictException(
          'Bu ihaleye su anda cok sayida teklif geliyor. Lutfen birkac saniye sonra tekrar deneyin.',
        );
      }
      throw e;
    }

    try {
      const { bid, outboxId, isNewLowest } = await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw(
            Prisma.sql`SELECT 1 FROM auctions WHERE id = ${dto.auctionId} FOR UPDATE`,
          );

          const auction = await tx.auction.findUnique({
            where: { id: dto.auctionId },
            select: {
              id: true,
              status: true,
              endsAt: true,
              maxBudget: true,
              buyerId: true,
              lowestBidAmount: true,
            },
          });

          if (!auction) {
            throw new NotFoundException('Ihale bulunamadi.');
          }

          if (auction.status !== AuctionStatus.OPEN) {
            throw new BadRequestException(
              'Sadece acik ihalelere teklif verilebilir.',
            );
          }

          if (auction.endsAt <= new Date()) {
            throw new BadRequestException(
              'Ihale suresi doldu, teklif kabul edilmiyor.',
            );
          }

          if (auction.buyerId === supplierId) {
            throw new ForbiddenException(
              'Ihale sahibi kendi ihalesine teklif veremez.',
            );
          }

          const prevLow = auction.lowestBidAmount;

          const agg = await tx.bid.aggregate({
            where: { auctionId: dto.auctionId, status: BidStatus.ACTIVE },
            _min: { amount: true },
            _count: { _all: true },
          });

          const globalMin = agg._min.amount;
          this.assertReverseAuctionAmount(amount, auction.maxBudget, globalMin);

          const supplier = await tx.company.findUnique({
            where: { id: supplierId },
            select: { name: true },
          });

          if (!supplier) {
            throw new NotFoundException('Tedarikci bulunamadi.');
          }

          const existing = await tx.bid.findUnique({
            where: {
              auctionId_supplierId: {
                auctionId: dto.auctionId,
                supplierId,
              },
            },
          });

          if (
            existing?.status === BidStatus.ACTIVE &&
            existing.amount.equals(amount)
          ) {
            throw new BadRequestException(
              'Ayni tutarda tekrar teklif verilemez.',
            );
          }

          const previousAmount = existing?.amount ?? null;
          const historyAction = existing
            ? BidHistoryAction.UPDATED
            : BidHistoryAction.PLACED;

          const bid = await tx.bid.upsert({
            where: {
              auctionId_supplierId: {
                auctionId: dto.auctionId,
                supplierId,
              },
            },
            create: {
              auctionId: dto.auctionId,
              supplierId,
              amount,
              note: dto.note,
              ipAddress: ipAddress ?? undefined,
              status: BidStatus.ACTIVE,
            },
            update: {
              amount,
              note: dto.note,
              ipAddress: ipAddress ?? undefined,
              status: BidStatus.ACTIVE,
            },
            include: this.bidListInclude,
          });

          await tx.bidHistory.create({
            data: {
              auctionId: dto.auctionId,
              supplierId,
              bidId: bid.id,
              amount,
              previousAmount,
              action: historyAction,
              note: dto.note,
              ipAddress: ipAddress ?? undefined,
            },
          });

          const stats = await tx.bid.aggregate({
            where: { auctionId: dto.auctionId, status: BidStatus.ACTIVE },
            _min: { amount: true },
            _count: { _all: true },
          });

          const newLowest = stats._min.amount;
          if (!newLowest) {
            throw new BadRequestException(
              'Teklif istatistikleri hesaplanamadi.',
            );
          }

          await tx.auction.update({
            where: { id: dto.auctionId },
            data: {
              lowestBidAmount: newLowest,
              bidCount: stats._count._all,
            },
          });

          const isNewLowest = prevLow === null || newLowest.lt(prevLow);

          const outboxRecord = await this.outbox.enqueue(
            tx,
            RedisEvents.BID_PLACED,
            this.buildBidPlacedEvent({
              bid,
              supplierName: supplier.name,
              previousLowestAmount: prevLow === null ? null : Number(prevLow),
              isNewLowest,
              totalBidCount: stats._count._all,
            }),
          );

          return { bid, outboxId: outboxRecord.id, isNewLowest };
        },
      );

      await this.outbox.publishOne(outboxId);

      this.logger.log(
        `Teklif: auction=${dto.auctionId} supplier=${supplierId} amount=${dto.amount} newLowest=${isNewLowest}`,
      );

      return bid;
    } finally {
      if (lock) await this.locks.release(lock);
    }
  }

  async listForAuction(auctionId: string, viewer: JwtPayload) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { buyerId: true },
    });

    if (!auction) {
      throw new NotFoundException('Ihale bulunamadi.');
    }

    if (auction.buyerId !== viewer.sub) {
      throw new ForbiddenException(
        'Bu ihalenin tekliflerini sadece ihale sahibi gorebilir.',
      );
    }

    return this.prisma.bid.findMany({
      where: { auctionId, status: BidStatus.ACTIVE },
      orderBy: { amount: 'asc' },
      include: this.bidListInclude,
    });
  }

  async listMine(supplierId: string) {
    return this.prisma.bid.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      include: {
        auction: {
          select: {
            id: true,
            title: true,
            status: true,
            endsAt: true,
            maxBudget: true,
            lowestBidAmount: true,
          },
        },
      },
    });
  }

  async withdraw(bidId: string, supplierId: string) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      select: {
        id: true,
        auctionId: true,
        supplierId: true,
        status: true,
        amount: true,
        note: true,
        ipAddress: true,
        auction: { select: { status: true } },
      },
    });

    if (!bid) {
      throw new NotFoundException('Teklif bulunamadi.');
    }

    if (bid.supplierId !== supplierId) {
      throw new ForbiddenException('Bu teklif size ait degil.');
    }

    if (bid.status !== BidStatus.ACTIVE) {
      throw new BadRequestException('Sadece aktif teklifler geri cekilebilir.');
    }

    if (bid.auction.status !== AuctionStatus.OPEN) {
      throw new BadRequestException(
        'Ihale acik degilken teklif geri cekilemez.',
      );
    }

    let lock: BidLockHandle | undefined;
    try {
      lock = await this.locks.acquire(bid.auctionId);
    } catch (e) {
      if (e instanceof Error && e.message === 'LOCK_NOT_ACQUIRED') {
        throw new ConflictException(
          'Bu ihaleye su anda cok sayida islem yapiliyor. Lutfen tekrar deneyin.',
        );
      }
      throw e;
    }

    try {
      const { outboxId } = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SELECT 1 FROM auctions WHERE id = ${bid.auctionId} FOR UPDATE`,
        );

        const fresh = await tx.bid.findFirst({
          where: {
            id: bidId,
            supplierId,
            status: BidStatus.ACTIVE,
            auction: { status: AuctionStatus.OPEN },
          },
          select: { id: true, auctionId: true },
        });

        if (!fresh) {
          throw new BadRequestException(
            'Teklif geri cekilemedi (durum degisti).',
          );
        }

        await tx.bid.update({
          where: { id: bidId },
          data: { status: BidStatus.WITHDRAWN },
        });

        await tx.bidHistory.create({
          data: {
            auctionId: bid.auctionId,
            supplierId,
            bidId,
            amount: bid.amount,
            previousAmount: bid.amount,
            action: BidHistoryAction.WITHDRAWN,
            note: bid.note,
            ipAddress: bid.ipAddress ?? undefined,
          },
        });

        const stats = await tx.bid.aggregate({
          where: { auctionId: bid.auctionId, status: BidStatus.ACTIVE },
          _min: { amount: true },
          _count: { _all: true },
        });

        const newLowest = stats._min.amount;
        await tx.auction.update({
          where: { id: bid.auctionId },
          data: {
            lowestBidAmount: newLowest ?? null,
            bidCount: stats._count._all,
          },
        });

        const supplier = await tx.company.findUnique({
          where: { id: supplierId },
          select: { name: true },
        });

        const outboxRecord = await this.outbox.enqueue(
          tx,
          RedisEvents.BID_WITHDRAWN,
          {
            bidId,
            auctionId: bid.auctionId,
            supplierId,
            supplierName: supplier?.name ?? '',
            withdrawnAt: new Date().toISOString(),
            lowestBidAmount: newLowest === null ? null : Number(newLowest),
            activeBidCount: stats._count._all,
          } satisfies BidWithdrawnEvent,
        );

        return { outboxId: outboxRecord.id };
      });

      await this.outbox.publishOne(outboxId);
    } finally {
      if (lock) await this.locks.release(lock);
    }

    return { id: bidId, status: BidStatus.WITHDRAWN };
  }

  private assertReverseAuctionAmount(
    amount: Prisma.Decimal,
    maxBudget: Prisma.Decimal,
    globalMinActive: Prisma.Decimal | null,
  ) {
    if (amount.lte(0)) {
      throw new BadRequestException('Teklif tutari sifirdan buyuk olmalidir.');
    }

    if (amount.gt(maxBudget)) {
      throw new BadRequestException('Teklif, ihale maksimum butcesini asamaz.');
    }

    if (globalMinActive === null) {
      return;
    }

    if (!amount.lt(globalMinActive)) {
      throw new BadRequestException(
        'Tersine ihalede yeni teklif, mevcut en iyi (en dusuk) aktif tekliften dusuk olmalidir.',
      );
    }
  }

  private buildBidPlacedEvent(args: {
    bid: {
      id: string;
      auctionId: string;
      supplierId: string;
      amount: Prisma.Decimal;
    };
    supplierName: string;
    previousLowestAmount: number | null;
    isNewLowest: boolean;
    totalBidCount: number;
  }): BidPlacedEvent {
    return {
      bidId: args.bid.id,
      auctionId: args.bid.auctionId,
      supplierId: args.bid.supplierId,
      supplierName: args.supplierName,
      amount: Number(args.bid.amount),
      previousLowestAmount: args.previousLowestAmount,
      isNewLowest: args.isNewLowest,
      totalBidCount: args.totalBidCount,
      timestamp: new Date().toISOString(),
    };
  }

  private async assertVerifiedSupplier(supplierId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: supplierId },
      select: { role: true, isVerified: true },
    });

    if (!company) {
      throw new NotFoundException('Sirket bulunamadi.');
    }

    if (company.role !== CompanyRole.SUPPLIER) {
      throw new ForbiddenException(
        'Sadece tedarikci firmalar teklif verebilir.',
      );
    }

    if (!company.isVerified) {
      throw new ForbiddenException(
        'Firma dogrulamasi tamamlanmadan teklif verilemez.',
      );
    }
  }
}
