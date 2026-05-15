import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService, AiReport, AiReportDocument } from '@app/database';
import { CompanyRole, JwtPayload } from '@app/common';
import { EventsService, RedisEvents } from '@app/events';
import { GeminiService } from '../gemini/gemini.service';
import { FraudService } from '../fraud/fraud.service';
import { RagService } from '../rag/rag.service';
import { SpecAssistantService } from '../spec-assistant/spec-assistant.service';
import {
  AuctionAnalysisResult,
  BidForFraud,
  FraudDetectionResult,
  SpecAnalysisResult,
  StoredAuctionReport,
  SupplierRanking,
  SupplierRiskResult,
} from './analysis.types';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly fraud: FraudService,
    private readonly rag: RagService,
    private readonly specAssistant: SpecAssistantService,
    private readonly events: EventsService,
    @InjectModel(AiReport.name)
    private readonly reports: Model<AiReportDocument>,
  ) {}

  async analyzeClosedAuction(
    auctionId: string,
    viewer: JwtPayload,
  ): Promise<StoredAuctionReport> {
    const auction = await this.getAuctionWithBids(auctionId);
    this.assertBuyerOwnsAuction(auction, viewer);
    return this.createAuctionReport(auction);
  }

  async analyzeClosedAuctionFromEvent(auctionId: string): Promise<StoredAuctionReport> {
    const auction = await this.getAuctionWithBids(auctionId);
    return this.createAuctionReport(auction);
  }

  async detectFraud(
    auctionId: string,
    viewer: JwtPayload,
  ): Promise<FraudDetectionResult> {
    const auction = await this.getAuctionWithBids(auctionId);
    this.assertBuyerOwnsAuction(auction, viewer);
    return this.fraud.assessBids(this.toFraudInputs(auction.bids));
  }

  async analyzeSupplier(
    supplierId: string,
    viewer: JwtPayload,
  ): Promise<SupplierRiskResult> {
    if (viewer.role !== CompanyRole.BUYER) {
      throw new ForbiddenException('Only buyers can analyze supplier risk.');
    }

    const supplier = await this.prisma.company.findUnique({
      where: { id: supplierId },
      include: {
        supplierProfile: true,
        bids: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { auction: { select: { category: true, status: true } } },
        },
      },
    });

    if (!supplier || supplier.role !== CompanyRole.SUPPLIER) {
      throw new NotFoundException('Supplier not found.');
    }

    const fallback = this.buildSupplierFallback(supplier);
    return this.gemini.generateJson<SupplierRiskResult>({
      task: 'supplier-risk-analysis',
      fallback,
      prompt: [
        'Analyze this supplier for a B2B reverse-auction procurement decision.',
        'Return JSON with supplierId, supplierName, trustScore, riskLevel, summary, strengths, risks, recommendedUseCases.',
        JSON.stringify(
          {
            supplier,
            recentBidCount: supplier.bids.length,
          },
          null,
          2,
        ),
      ].join('\n\n'),
    });
  }

  analyzeSpec(input: {
    text?: string;
    file?: Express.Multer.File;
  }): Promise<SpecAnalysisResult> {
    return this.specAssistant.analyze(input);
  }

  async getReport(
    auctionId: string,
    viewer: JwtPayload,
  ): Promise<StoredAuctionReport> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: { where: { supplierId: viewer.sub }, select: { id: true } },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found.');
    }

    const canRead =
      (viewer.role === CompanyRole.BUYER && auction.buyerId === viewer.sub) ||
      (viewer.role === CompanyRole.SUPPLIER && auction.bids.length > 0);

    if (!canRead) {
      throw new ForbiddenException('You cannot access this AI report.');
    }

    const report = await this.reports.findOne({ auctionId }).lean().exec();
    if (!report) {
      throw new NotFoundException('AI report not found.');
    }

    return this.toStoredReport(report);
  }

  private async createAuctionReport(auction: any): Promise<StoredAuctionReport> {
    if (!['CLOSED', 'AWARDED'].includes(auction.status)) {
      throw new BadRequestException('AI report can be created after the auction is closed.');
    }

    if (!auction.bids.length) {
      throw new BadRequestException('AI report requires at least one active bid.');
    }

    const startedAt = Date.now();
    await this.safePublish(RedisEvents.AI_ANALYSIS_STARTED, {
      auctionId: auction.id,
      buyerId: auction.buyerId,
    });

    const rankings = this.buildRankings(auction.bids);
    const fraudDetection = this.fraud.assessBids(this.toFraudInputs(auction.bids));
    const ragContextUsed = this.rag.buildSupplierMemory(
      auction.bids.map((bid) => bid.supplier),
    );
    const fallback = this.buildAuctionFallback(auction, rankings, fraudDetection);

    const analysisResult = await this.gemini.generateJson<AuctionAnalysisResult>({
      task: 'auction-risk-and-winner-recommendation',
      fallback,
      prompt: [
        'You are an AI risk analyst for a B2B reverse-auction procurement platform.',
        'Recommend a winner by considering bid amount, reliability, delivery history, certifications and fraud risk.',
        'Return the exact JSON shape of the fallback object.',
        '',
        JSON.stringify(
          {
            auction: {
              id: auction.id,
              title: auction.title,
              category: auction.category,
              quantity: auction.quantity,
              unit: auction.unit,
              maxBudget: this.toNumber(auction.maxBudget),
              status: auction.status,
              deliveryDeadline: auction.deliveryDeadline,
            },
            bids: auction.bids,
            ragContextUsed,
            fallback,
          },
          null,
          2,
        ),
      ].join('\n'),
    });

    const processingTimeMs = Date.now() - startedAt;
    const saved = await this.reports
      .findOneAndUpdate(
        { auctionId: auction.id },
        {
          auctionId: auction.id,
          buyerId: auction.buyerId,
          analysisResult,
          ragContextUsed,
          modelUsed: this.gemini.modelName,
          processingTimeMs,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    await this.prisma.auction.update({
      where: { id: auction.id },
      data: { aiReportId: saved.id },
    });

    const report = this.toStoredReport(saved.toObject());
    await this.safePublish(RedisEvents.AI_ANALYSIS_COMPLETED, {
      auctionId: auction.id,
      reportId: report.reportId,
      recommendedSupplierId: report.analysisResult.recommendedBid.supplierId,
      recommendedSupplierName: report.analysisResult.recommendedBid.supplierName,
      finalRecommendation: report.analysisResult.finalRecommendation,
    });

    return report;
  }

  private async safePublish(event: RedisEvents, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.events.publish(event, payload);
    } catch (error) {
      this.logger.warn(
        `Could not publish ${event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getAuctionWithBids(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        bids: {
          where: { status: 'ACTIVE' },
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
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found.');
    }

    return auction;
  }

  private assertBuyerOwnsAuction(auction: any, viewer: JwtPayload): void {
    if (viewer.role !== CompanyRole.BUYER || auction.buyerId !== viewer.sub) {
      throw new ForbiddenException('Only the auction owner buyer can run this analysis.');
    }
  }

  private buildRankings(bids: any[]): SupplierRanking[] {
    const lowest = Math.min(...bids.map((bid) => this.toNumber(bid.amount)));

    return bids
      .map((bid) => {
        const profile = bid.supplier.supplierProfile;
        const amount = this.toNumber(bid.amount);
        const reliability = profile?.reliabilityScore ?? 0;
        const onTime = profile?.onTimeDeliveryRate ?? 0;
        const completed = profile?.completedAuctions ?? 0;
        const cancelled = profile?.cancelledAuctions ?? 0;
        const certificationBonus = Math.min(profile?.certifications?.length ?? 0, 4) * 1.5;
        const priceScore = (lowest / amount) * 42;
        const reliabilityScore = reliability * 4;
        const deliveryScore = onTime * 14;
        const experienceScore = Math.min(completed, 20) * 0.6;
        const penalty = cancelled * 3;
        const aiScore = this.round(
          Math.max(
            0,
            Math.min(
              100,
              priceScore + reliabilityScore + deliveryScore + experienceScore + certificationBonus - penalty,
            ),
          ),
        );

        return {
          rank: 0,
          supplierId: bid.supplierId,
          supplierName: bid.supplier.name,
          bidAmount: amount,
          reliabilityScore: this.round(reliability),
          riskLevel: this.toRiskLevel(aiScore, reliability, cancelled),
          strengths: this.buildStrengths(profile, amount === lowest),
          risks: this.buildRisks(profile, amount, lowest),
          aiScore,
        };
      })
      .sort((a, b) => b.aiScore - a.aiScore)
      .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
  }

  private buildAuctionFallback(
    auction: any,
    rankings: SupplierRanking[],
    fraudDetection: FraudDetectionResult,
  ): AuctionAnalysisResult {
    const lowestBid = auction.bids[0];
    const recommended = rankings[0];

    return {
      summary: `${auction.title} ihalesinde ${auction.bids.length} aktif teklif analiz edildi.`,
      lowestBid: {
        supplierId: lowestBid.supplierId,
        supplierName: lowestBid.supplier.name,
        amount: this.toNumber(lowestBid.amount),
      },
      recommendedBid: {
        supplierId: recommended.supplierId,
        supplierName: recommended.supplierName,
        amount: recommended.bidAmount,
        reason: 'Recommendation balances price, reliability, delivery history and fraud risk.',
      },
      supplierRankings: rankings,
      fraudDetection,
      marketInsights:
        'Reverse auction result should be evaluated with total procurement risk, not only the lowest amount.',
      finalRecommendation: `${recommended.supplierName} is recommended with AI score ${recommended.aiScore}.`,
    };
  }

  private buildSupplierFallback(supplier: any): SupplierRiskResult {
    const profile = supplier.supplierProfile;
    const reliability = profile?.reliabilityScore ?? 0;
    const completed = profile?.completedAuctions ?? 0;
    const cancelled = profile?.cancelledAuctions ?? 0;
    const onTime = profile?.onTimeDeliveryRate ?? 0;
    const trustScore = this.round(
      Math.max(0, Math.min(100, reliability * 7 + onTime * 20 + Math.min(completed, 30) - cancelled * 5)),
    );

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      trustScore,
      riskLevel: this.toRiskLevel(trustScore, reliability, cancelled),
      summary: `${supplier.name} supplier profile was evaluated with delivery and bid history.`,
      strengths: this.buildStrengths(profile, false),
      risks: this.buildRisks(profile, 0, 0),
      recommendedUseCases: profile?.specializations?.length
        ? profile.specializations
        : [supplier.sector ?? 'General procurement'],
    };
  }

  private toFraudInputs(bids: any[]): BidForFraud[] {
    return bids.map((bid) => ({
      supplierId: bid.supplierId,
      supplierName: bid.supplier.name,
      amount: this.toNumber(bid.amount),
      createdAt: bid.createdAt,
      reliabilityScore: bid.supplier.supplierProfile?.reliabilityScore ?? 0,
    }));
  }

  private buildStrengths(profile: any, isLowest: boolean): string[] {
    const strengths: string[] = [];
    if (isLowest) strengths.push('Lowest price in the auction');
    if ((profile?.reliabilityScore ?? 0) >= 8) strengths.push('High reliability score');
    if ((profile?.onTimeDeliveryRate ?? 0) >= 0.9) strengths.push('Strong on-time delivery rate');
    if ((profile?.certifications?.length ?? 0) > 0) strengths.push('Relevant certifications');
    if ((profile?.completedAuctions ?? 0) >= 10) strengths.push('Proven similar auction history');
    return strengths.length ? strengths : ['Basic supplier profile is complete'];
  }

  private buildRisks(profile: any, amount: number, lowest: number): string[] {
    const risks: string[] = [];
    if ((profile?.reliabilityScore ?? 0) > 0 && profile.reliabilityScore < 4) {
      risks.push('Low reliability score');
    }
    if ((profile?.cancelledAuctions ?? 0) > 2) {
      risks.push('Cancelled auction history requires review');
    }
    if ((profile?.onTimeDeliveryRate ?? 0) > 0 && profile.onTimeDeliveryRate < 0.7) {
      risks.push('Delivery punctuality risk');
    }
    if (amount > 0 && lowest > 0 && amount > lowest * 1.12) {
      risks.push('Price is materially above the lowest bid');
    }
    return risks.length ? risks : ['No major risk signal in available platform data'];
  }

  private toRiskLevel(score: number, reliability: number, cancelled: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score >= 78 && reliability >= 7 && cancelled <= 2) return 'LOW';
    if (score < 45 || cancelled >= 5) return 'HIGH';
    return 'MEDIUM';
  }

  private toStoredReport(report: any): StoredAuctionReport {
    return {
      reportId: String(report._id ?? report.id),
      auctionId: report.auctionId,
      buyerId: report.buyerId,
      analysisResult: report.analysisResult,
      ragContextUsed: report.ragContextUsed ?? [],
      modelUsed: report.modelUsed ?? this.gemini.modelName,
      processingTimeMs: report.processingTimeMs ?? 0,
      generatedWithFallback: this.gemini.isFallbackMode,
    };
  }

  private toNumber(value: unknown): number {
    return Number(value ?? 0);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
