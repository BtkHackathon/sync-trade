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
import { FraudServiceEnhanced } from '../fraud/fraud-enhanced.service';
import { RagService } from '../rag/rag-enhanced.service';
import { SpecAssistantService } from '../spec-assistant/spec-assistant.service';
import { PromptBuilderService } from '../shared/prompt-builder.service';

import {
  AuctionAnalysisResult,
  BidForFraud,
  FraudDetectionResult,
  SpecAnalysisResult,
  StoredAuctionReport,
  SupplierRanking,
  SupplierRiskResult,
} from './analysis.types';

/**
 * Analysis Service - Orchestrates AI analysis workflows
 * Responsibilities:
 * - Coordinate between GeminiService, FraudService, RagService
 * - Manage data retrieval and transformation
 * - Persist analysis results
 * - Publish analysis events
 *
 * SOLID Principles Applied:
 * S: Single Responsibility - Focuses on orchestration only
 * O: Open/Closed - Easy to add new analysis types
 * L: Liskov Substitution - Implements consistent interfaces
 * I: Interface Segregation - Services injected have specific contracts
 * D: Dependency Inversion - Depends on abstractions (services) not concrete types
 */
@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly fraudAnalysis: FraudServiceEnhanced,
    private readonly rag: RagService,
    private readonly specAssistant: SpecAssistantService,
    private readonly prompts: PromptBuilderService,
    private readonly events: EventsService,
    @InjectModel(AiReport.name)
    private readonly reports: Model<AiReportDocument>,
  ) {}

  /**
   * Analyze a closed auction and generate comprehensive report
   */
  async analyzeClosedAuction(
    auctionId: string,
    viewer: JwtPayload,
  ): Promise<StoredAuctionReport> {
    const auction = await this.getAuctionWithBids(auctionId);
    this.assertBuyerOwnsAuction(auction, viewer);
    return this.createAuctionReport(auction);
  }

  /**
   * Analyze auction from event (no access control needed)
   */
  async analyzeClosedAuctionFromEvent(auctionId: string): Promise<StoredAuctionReport> {
    const auction = await this.getAuctionWithBids(auctionId);
    return this.createAuctionReport(auction);
  }

  /**
   * Detect fraud in auction bids
   */
  async detectFraud(
    auctionId: string,
    viewer: JwtPayload,
  ): Promise<FraudDetectionResult> {
    const auction = await this.getAuctionWithBids(auctionId);
    this.assertBuyerOwnsAuction(auction, viewer);

    const fraudInputs = this.toFraudInputs(auction.bids);
    return this.fraudAnalysis.assessBidsWithAi(fraudInputs);
  }

  /**
   * Analyze a specific supplier for risk assessment
   */
  async analyzeSupplier(
    supplierId: string,
    viewer: JwtPayload,
  ): Promise<SupplierRiskResult> {
    this.assertBuyerRole(viewer);

    const supplier = await this.getSupplierData(supplierId);
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    const context = await this.rag.getSupplierContext(supplierId);
    const prompt = this.prompts.buildSupplierRiskAnalysisPrompt({
      supplier,
      recentBidCount: supplier.bids.length,
      context,
    });

    return this.gemini.generateJson<SupplierRiskResult>({
      task: 'supplier-risk-analysis',
      fallback: this.buildSupplierFallback(supplier),
      prompt,
    });
  }

  /**
   * Extract and analyze auction specifications from documents
   */
  analyzeSpec(input: {
    text?: string;
    file?: Express.Multer.File;
  }): Promise<SpecAnalysisResult> {
    return this.specAssistant.analyze(input);
  }

  /**
   * Retrieve previously generated AI report
   */
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

    this.assertCanAccessReport(auction, viewer);

    const report = await this.reports.findOne({ auctionId }).lean().exec();
    if (!report) {
      throw new NotFoundException('AI report not found.');
    }

    return this.toStoredReport(report);
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE IMPLEMENTATION METHODS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Create comprehensive auction report
   * Workflow:
   * 1. Validate auction is closed
   * 2. Build supplier rankings
   * 3. Run fraud detection
   * 4. Get RAG context
   * 5. Run Gemini analysis
   * 6. Persist report
   * 7. Publish events
   */
  private async createAuctionReport(auction: any): Promise<StoredAuctionReport> {
    if (!['CLOSED', 'AWARDED'].includes(auction.status)) {
      throw new BadRequestException(
        'AI report can only be created for closed or awarded auctions.',
      );
    }

    try {
      // Step 1: Build supplier rankings
      const rankings = this.buildRankings(auction.bids);

      // Step 2: Run fraud detection
      const fraudAnalysis = await this.fraudAnalysis.assessBidsWithAi(
        this.toFraudInputs(auction.bids),
      );

      // Step 3: Get RAG context for all suppliers
      const supplierContexts = await Promise.all(
        auction.bids.map((bid: any) => this.rag.getSupplierContext(bid.supplierId)),
      );

      // Step 4: Run Gemini analysis with RAG context
      const prompt = this.prompts.buildAuctionAnalysisPrompt(
        { ...auction, rankings },
        supplierContexts.filter((c): c is string => c !== null),
      );

      const aiAnalysis = await this.gemini.generateJson<AuctionAnalysisResult>({
        task: 'auction-analysis',
        fallback: this.buildAuctionFallback(auction, rankings, fraudAnalysis),
        prompt,
      });

      // Step 5: Persist report
      const report = await this.persistReport(auction, aiAnalysis, fraudAnalysis, rankings);
      if (!report) {
        throw new Error('Failed to persist AI report.');
      }

      // Step 6: Publish event
      await this.safePublish(RedisEvents.AI_ANALYSIS_COMPLETED, {
        auctionId: auction.id,
        reportId: report._id ?? report.id,
        recommendedWinner: aiAnalysis.supplierRankings?.[0]?.supplierId,
      });

      return this.toStoredReport(report);
    } catch (error) {
      this.logger.error(`Failed to create auction report for ${auction.id}:`, error);

      // Return fallback report even on error
      const fallback = this.buildAuctionFallback(
        auction,
        this.buildRankings(auction.bids),
        await this.fraudAnalysis.assessBidsWithAi(this.toFraudInputs(auction.bids)),
      );

      const persisted = await this.persistReport(
        auction,
        fallback,
        await this.fraudAnalysis.assessBidsWithAi(this.toFraudInputs(auction.bids)),
        this.buildRankings(auction.bids),
      );

      return this.toStoredReport(persisted);
    }
  }

  /**
   * Get auction with all related bid data
   */
  private async getAuctionWithBids(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            sector: true,
          },
        },
        bids: {
          include: {
            supplier: {
              include: { supplierProfile: true },
            },
          },
        },
        documents: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found.');
    }

    return auction;
  }

  /**
   * Get supplier with profile and recent bid history
   */
  private async getSupplierData(supplierId: string) {
    return this.prisma.company.findUnique({
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
  }

  /**
   * Build supplier rankings from bid data
   */
  private buildRankings(bids: any[]): SupplierRanking[] {
    if (bids.length === 0) {
      return [];
    }

    const lowest = Math.min(...bids.map((b) => b.amount));
    const average = bids.reduce((sum, b) => sum + b.amount, 0) / bids.length;

    return bids
      .sort((a, b) => a.amount - b.amount)
      .map((bid, index) => {
        const score = Math.max(0, 100 - Math.round((bid.amount / average) * 100));
        const reliabilityScore = bid.supplier?.supplierProfile?.reliabilityScore ?? 0;

        return {
          rank: index + 1,
          supplierId: bid.supplierId,
          supplierName: bid.supplier?.name ?? 'Unknown',
          bidAmount: bid.amount,
          reliabilityScore,
          riskLevel: reliabilityScore >= 7 ? 'LOW' : reliabilityScore >= 4 ? 'MEDIUM' : 'HIGH',
          strengths: [],
          risks: [],
          aiScore: score,
        };
      });
  }

  /**
   * Convert bids to fraud analysis input format
   */
  private toFraudInputs(bids: any[]): BidForFraud[] {
    return bids.map((bid) => ({
      supplierId: bid.supplierId,
      supplierName: bid.supplier?.name ?? 'Unknown',
      amount: bid.amount,
      reliabilityScore: bid.supplier?.supplierProfile?.reliabilityScore ?? 0,
      createdAt: bid.createdAt,
    }));
  }

  /**
   * Persist report to MongoDB
   */
  private async persistReport(
    auction: any,
    analysis: AuctionAnalysisResult,
    fraud: FraudDetectionResult,
    rankings: SupplierRanking[],
  ) {
    return this.reports.create({
      auctionId: auction.id,
      buyerId: auction.buyerId,
      analysisResult: analysis,
      ragContextUsed: [],
      modelUsed: 'gemini-1.5-pro',
      processingTimeMs: 0,
    });
  }

  /**
   * Publish event safely (non-blocking)
   */
  private async safePublish(
    event: RedisEvents,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.events.publish(event, payload);
    } catch (error) {
      this.logger.warn(`Failed to publish event ${event}:`, error);
    }
  }

  /**
   * Build fallback auction analysis (when Gemini fails)
   */
  private buildAuctionFallback(
    auction: any,
    rankings: SupplierRanking[],
    fraud: FraudDetectionResult,
  ): AuctionAnalysisResult {
    const lowestBid = rankings[0];

    return {
      summary: `Auction ${auction.title} completed with ${rankings.length} competitive bids.`,
      lowestBid: {
        supplierId: lowestBid?.supplierId ?? 'unknown',
        supplierName: lowestBid?.supplierName ?? 'unknown',
        amount: lowestBid?.bidAmount ?? 0,
      },
      recommendedBid: {
        supplierId: lowestBid?.supplierId ?? 'unknown',
        supplierName: lowestBid?.supplierName ?? 'unknown',
        amount: lowestBid?.bidAmount ?? 0,
        reason: 'Lowest priced supplier with acceptable reliability.',
      },
      supplierRankings: rankings,
      fraudDetection: fraud,
      marketInsights: `Market assessment for ${auction.category} procurement.`,
      finalRecommendation: `Award to ${lowestBid?.supplierName ?? 'the lowest bidder'}.`,
    };
  }

  /**
   * Build fallback supplier risk assessment
   */
  private buildSupplierFallback(supplier: any): SupplierRiskResult {
    const profile = supplier.supplierProfile;
    const reliability = profile?.reliabilityScore ?? 0;

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      trustScore: Math.round(reliability * 10),
      riskLevel: reliability >= 7 ? 'LOW' : reliability >= 4 ? 'MEDIUM' : 'HIGH',
      summary: `Supplier with ${reliability}/10 reliability score.`,
      strengths: [],
      risks: [],
      recommendedUseCases: [],
    };
  }

  /**
   * Convert stored report to DTO
   */
  private toStoredReport(report: any): StoredAuctionReport {
    return {
      reportId: String(report._id ?? report.id),
      auctionId: report.auctionId,
      buyerId: report.buyerId,
      analysisResult: report.analysis,
      ragContextUsed: report.ragContextUsed,
      modelUsed: report.modelUsed,
      processingTimeMs: report.processingTimeMs,
      generatedWithFallback: report.generatedWithFallback,
    };
  }

  /**
   * Access control: Assert buyer owns auction
   */
  private assertBuyerOwnsAuction(auction: any, viewer: JwtPayload): void {
    if (viewer.role !== CompanyRole.BUYER || auction.buyerId !== viewer.sub) {
      throw new ForbiddenException('You cannot access this auction.');
    }
  }

  /**
   * Access control: Assert buyer role
   */
  private assertBuyerRole(viewer: JwtPayload): void {
    if (viewer.role !== CompanyRole.BUYER) {
      throw new ForbiddenException('Only buyers can analyze suppliers.');
    }
  }

  /**
   * Access control: Assert can access report
   */
  private assertCanAccessReport(auction: any, viewer: JwtPayload): void {
    const isBuyerOwner = viewer.role === CompanyRole.BUYER && auction.buyerId === viewer.sub;
    const isSupplierWithBid = auction.bids.length > 0;

    if (!isBuyerOwner && !isSupplierWithBid) {
      throw new ForbiddenException('You cannot access this AI report.');
    }
  }
}
