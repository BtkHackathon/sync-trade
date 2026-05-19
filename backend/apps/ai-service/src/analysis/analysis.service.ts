import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PrismaService,
  AiReport,
  AiReportDocument,
  DocumentParseLog,
  DocumentParseLogDocument,
  FraudDetectionLog,
  FraudDetectionLogDocument,
  RagQueryLog,
  RagQueryLogDocument,
} from '@app/database';
import { CompanyRole, JwtPayload } from '@app/common';
import { EventsService, RedisEvents } from '@app/events';
import { Prisma } from '@prisma/client';
import { GeminiService } from '../gemini/gemini.service';
import { FraudService } from '../fraud/fraud.service';
import { RagService } from '../rag/rag.service';
import { SpecAssistantService } from '../spec-assistant/spec-assistant.service';
import {
  AuctionAnalysisResult,
  BidForFraud,
  BidHistoryForFraud,
  FraudDetectionResult,
  SpecAnalysisResult,
  StoredAuctionReport,
  SupplierRanking,
  SupplierRiskResult,
} from './analysis.types';

// Prisma'nın include'lu sorgu dönüş tipini statik olarak çıkar
const auctionWithBidsArgs = {
  include: {
    buyer: { select: { id: true, name: true, email: true } },
    bids: {
      where: { status: 'ACTIVE' as const },
      orderBy: { amount: 'asc' as const },
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
    bidHistories: {
      orderBy: { createdAt: 'asc' as const },
      take: 200,
    },
  },
} as const;

type AuctionWithBids = NonNullable<
  Prisma.Result<
    PrismaService['auction'],
    typeof auctionWithBidsArgs,
    'findUnique'
  >
>;
type AuctionBid = AuctionWithBids['bids'][number];
type AuctionBidHistory = AuctionWithBids['bidHistories'][number];

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
    @InjectModel(DocumentParseLog.name)
    private readonly documentParseLogs: Model<DocumentParseLogDocument>,
    @InjectModel(FraudDetectionLog.name)
    private readonly fraudDetectionLogs: Model<FraudDetectionLogDocument>,
    @InjectModel(RagQueryLog.name)
    private readonly ragQueryLogs: Model<RagQueryLogDocument>,
  ) {}

  async analyzeClosedAuction(
    auctionId: string,
    viewer: JwtPayload,
  ): Promise<StoredAuctionReport> {
    const auction = await this.getAuctionWithBids(auctionId);
    this.assertBuyerOwnsAuction(auction, viewer);
    return this.createAuctionReport(auction);
  }

  async analyzeClosedAuctionFromEvent(
    auctionId: string,
  ): Promise<StoredAuctionReport> {
    const auction = await this.getAuctionWithBids(auctionId);
    return this.createAuctionReport(auction);
  }

  async detectFraud(
    auctionId: string,
    viewer: JwtPayload,
  ): Promise<FraudDetectionResult> {
    const auction = await this.getAuctionWithBids(auctionId);
    this.assertBuyerOwnsAuction(auction, viewer);
    const result = this.fraud.assessBids(
      this.toFraudInputs(auction.bids),
      this.toFraudHistoryInputs(auction.bidHistories ?? []),
    );

    await this.safeCreateLog('fraud-detection-log', () =>
      this.fraudDetectionLogs.create({
        auctionId,
        buyerId: viewer.sub,
        bidCount: auction.bids.length,
        historyCount: auction.bidHistories?.length ?? 0,
        result: result as unknown as Record<string, unknown>,
      }),
    );

    return result;
  }

  async analyzeSupplier(
    supplierId: string,
    viewer: JwtPayload,
  ): Promise<SupplierRiskResult> {
    if (viewer.role !== CompanyRole.BUYER) {
      throw new ForbiddenException('Yalnızca alıcılar tedarikçi risk analizi yapabilir.');
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
      throw new NotFoundException('Tedarikçi bulunamadı.');
    }

    const fallback = this.buildSupplierFallback(supplier);

    const supplierDataForPrompt = {
      id: supplier.id,
      name: supplier.name,
      sector: supplier.sector ?? 'Belirtilmemiş',
      city: supplier.city ?? 'Belirtilmemiş',
      isVerified: supplier.isVerified,
      profile: supplier.supplierProfile
        ? {
            certifications: supplier.supplierProfile.certifications ?? [],
            specializations: supplier.supplierProfile.specializations ?? [],
            description: supplier.supplierProfile.description ?? 'Belirtilmemiş',
            capacity: supplier.supplierProfile.capacity ?? 'Belirtilmemiş',
            reliabilityScore: supplier.supplierProfile.reliabilityScore ?? 0,
            completedAuctions: supplier.supplierProfile.completedAuctions ?? 0,
            cancelledAuctions: supplier.supplierProfile.cancelledAuctions ?? 0,
            onTimeDeliveryRate: supplier.supplierProfile.onTimeDeliveryRate ?? 0,
          }
        : null,
      recentBids: supplier.bids.map((b) => ({
        amount: b.amount,
        auctionCategory: b.auction.category,
        auctionStatus: b.auction.status,
      })),
    };

    const raw = await this.gemini.generateJson<SupplierRiskResult>({
      task: 'supplier-risk-analysis',
      fallback,
      prompt: [
        'Sen bir B2B tersine ihale platformu için tedarikçi risk analistissin.',
        'Aşağıdaki tedarikçiyi değerlendir ve JSON döndür.',
        'ÖNEMLI KURALLAR:',
        '  1. Tüm metin alanları (summary, strengths, risks, recommendedUseCases) TÜRKÇE olsun.',
        '  2. riskLevel YALNIZCA "LOW", "MEDIUM" veya "HIGH" (büyük harf) olsun.',
        '  3. supplierName için tedarikçinin gerçek adını yaz, UUID yazma.',
        '  4. JSON şeması: { supplierId, supplierName, trustScore, riskLevel, summary, strengths[], risks[], recommendedUseCases[] }',
        '',
        JSON.stringify(supplierDataForPrompt, null, 2),
      ].join('\n'),
    });

    // Normalize et: riskLevel büyük harf, supplierId kontrolü
    return {
      ...raw,
      supplierName: this.isUuid(raw.supplierName) ? supplier.name : (raw.supplierName || supplier.name),
      riskLevel: this.normalizeRiskLevel(raw.riskLevel),
    };
  }

  async analyzeSpec(input: {
    text?: string;
    file?: Express.Multer.File;
    buyerId?: string;
  }): Promise<SpecAnalysisResult> {
    const result = await this.specAssistant.analyze(input);

    await this.safeCreateLog('document-parse-log', () =>
      this.documentParseLogs.create({
        buyerId: input.buyerId ?? 'unknown',
        sourceType: input.file
          ? input.file.mimetype === 'application/pdf'
            ? 'PDF'
            : 'FILE'
          : 'TEXT',
        fileName: input.file?.originalname,
        mimeType: input.file?.mimetype,
        textLength: input.text?.length ?? input.file?.size ?? 0,
        extractedFields: result as unknown as Record<string, unknown>,
      }),
    );

    return result;
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
      throw new NotFoundException('İhale bulunamadı.');
    }

    const canRead =
      (viewer.role === CompanyRole.BUYER && auction.buyerId === viewer.sub) ||
      (viewer.role === CompanyRole.SUPPLIER && auction.bids.length > 0);

    if (!canRead) {
      throw new ForbiddenException('Bu AI raporuna erişim yetkiniz yok.');
    }

    const report = await this.reports.findOne({ auctionId }).lean().exec();
    if (!report) {
      throw new NotFoundException('AI raporu bulunamadı.');
    }

    return this.toStoredReport(report);
  }

  private async createAuctionReport(
    auction: AuctionWithBids,
  ): Promise<StoredAuctionReport> {
    if (!['CLOSED', 'AWARDED'].includes(auction.status)) {
      throw new BadRequestException(
        'AI raporu yalnızca kapalı ihaleler için oluşturulabilir.',
      );
    }

    if (!auction.bids.length) {
      throw new BadRequestException(
        'AI raporu için en az bir aktif teklif gereklidir.',
      );
    }

    const startedAt = Date.now();
    await this.safePublish(RedisEvents.AI_ANALYSIS_STARTED, {
      auctionId: auction.id,
      buyerId: auction.buyerId,
    });

    const rankings = this.buildRankings(auction.bids);
    const fraudDetection = this.fraud.assessBids(
      this.toFraudInputs(auction.bids),
      this.toFraudHistoryInputs(auction.bidHistories ?? []),
    );
    const ragContextUsed = await this.buildRagContext(auction);
    const fallback = this.buildAuctionFallback(
      auction,
      rankings,
      fraudDetection,
    );

    // Gerçek isim haritası: Gemini supplierId yerine isim yazarsa normalize edilsin
    const nameMap = new Map(
      auction.bids.map((b) => [b.supplierId, b.supplier.name]),
    );

    const bidsForPrompt = auction.bids.map((b) => ({
      supplierId: b.supplierId,
      supplierName: b.supplier.name,
      amount: this.toNumber(b.amount),
      note: b.note,
      supplier: {
        id: b.supplier.id,
        name: b.supplier.name,
        sector: b.supplier.sector ?? 'Belirtilmemiş',
        city: b.supplier.city,
        isVerified: b.supplier.isVerified,
        profile: b.supplier.supplierProfile
          ? {
              certifications: b.supplier.supplierProfile.certifications ?? [],
              specializations: b.supplier.supplierProfile.specializations ?? [],
              description: b.supplier.supplierProfile.description ?? 'Belirtilmemiş',
              capacity: b.supplier.supplierProfile.capacity ?? 'Belirtilmemiş',
              reliabilityScore: b.supplier.supplierProfile.reliabilityScore ?? 0,
              completedAuctions: b.supplier.supplierProfile.completedAuctions ?? 0,
              cancelledAuctions: b.supplier.supplierProfile.cancelledAuctions ?? 0,
              onTimeDeliveryRate: b.supplier.supplierProfile.onTimeDeliveryRate ?? 0,
            }
          : null,
      },
    }));

    const rawResult =
      await this.gemini.generateJson<AuctionAnalysisResult>({
        task: 'auction-risk-and-winner-recommendation',
        fallback,
        prompt: [
          'Sen bir B2B tersine ihale platformu için AI risk analistissin.',
          'Teklif tutarı, güvenilirlik, teslimat geçmişi, sertifikalar ve sahtekarlık riski göz önünde bulundurularak kazanan tedarikçiyi öner.',
          'ÖNEMLI KURALLAR:',
          '  1. Tüm metin alanları (summary, reason, marketInsights, finalRecommendation, strengths, risks) TÜRKÇE olsun.',
          '  2. riskLevel değerleri YALNIZCA şu değerlerden biri olmalı: "LOW", "MEDIUM", "HIGH" (büyük harf).',
          '  3. supplierName alanlarına gerçek firma isimlerini yaz, kesinlikle UUID/ID yazma.',
          '  4. Aşağıdaki fallback objesinin JSON yapısını AYNEN koru (ekstra alan ekleme, alan silme).',
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
              bids: bidsForPrompt,
              ragContextUsed,
              fallback,
            },
            null,
            2,
          ),
        ].join('\n'),
      });

    const analysisResult = this.normalizeAnalysisResult(rawResult, nameMap);

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
      recommendedSupplierName:
        report.analysisResult.recommendedBid.supplierName,
      finalRecommendation: report.analysisResult.finalRecommendation,
    });

    return report;
  }

  private async buildRagContext(auction: AuctionWithBids): Promise<string[]> {
    const suppliers = auction.bids.map((bid: any) => bid.supplier);
    const baseContext = this.rag.buildSupplierMemory(suppliers);

    await Promise.all(
      auction.bids.map((bid: any, index: number) =>
        this.rag.upsertSupplierMemory({
          supplier: bid.supplier,
          auctionId: auction.id,
          context: baseContext[index],
        }),
      ),
    );

    const query = `${auction.title} ${auction.category} ${auction.description}`;
    const supplierIds = auction.bids.map((bid: any) => bid.supplierId);
    const vectorContext = await this.rag.findRelevantSupplierMemories({
      query,
      supplierIds,
      limit: 8,
    });
    const context = vectorContext.length > 0 ? vectorContext : baseContext;

    await this.safeCreateLog('rag-query-log', () =>
      this.ragQueryLogs.create({
        auctionId: auction.id,
        query,
        supplierIds,
        resultCount: context.length,
        context,
      }),
    );

    return context;
  }
  private async safeCreateLog(
    label: string,
    writer: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await writer();
    } catch (error) {
      this.logger.warn(
        `Could not persist ${label}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  private async safePublish(
    event: RedisEvents,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.events.publish(event, payload);
    } catch (error) {
      this.logger.warn(
        `Could not publish ${event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getAuctionWithBids(auctionId: string): Promise<AuctionWithBids> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      ...auctionWithBidsArgs,
    });

    if (!auction) {
      throw new NotFoundException('İhale bulunamadı.');
    }

    return auction;
  }

  private assertBuyerOwnsAuction(auction: AuctionWithBids, viewer: JwtPayload): void {
    if (viewer.role !== CompanyRole.BUYER || auction.buyerId !== viewer.sub) {
      throw new ForbiddenException(
        'Bu analizi yalnızca ihale sahibi alıcı çalıştırabilir.',
      );
    }
  }

  private buildRankings(bids: AuctionBid[]): SupplierRanking[] {
    const lowest = Math.min(...bids.map((bid) => this.toNumber(bid.amount)));

    return bids
      .map((bid) => {
        const profile = bid.supplier.supplierProfile;
        const amount = this.toNumber(bid.amount);
        const reliability = profile?.reliabilityScore ?? 0;
        const onTime = profile?.onTimeDeliveryRate ?? 0;
        const completed = profile?.completedAuctions ?? 0;
        const cancelled = profile?.cancelledAuctions ?? 0;
        const certificationBonus =
          Math.min(profile?.certifications?.length ?? 0, 4) * 1.5;
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
              priceScore +
                reliabilityScore +
                deliveryScore +
                experienceScore +
                certificationBonus -
                penalty,
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
    auction: AuctionWithBids,
    rankings: SupplierRanking[],
    fraudDetection: FraudDetectionResult,
  ): AuctionAnalysisResult {
    // Gerçek verilerden hesaplanan değerler
    const sortedByAmount = [...auction.bids].sort(
      (a, b) => this.toNumber(a.amount) - this.toNumber(b.amount),
    );
    const lowestBid = sortedByAmount[0];
    const highestBid = sortedByAmount[sortedByAmount.length - 1];
    const recommended = rankings[0];
    const runner = rankings[1];

    const lowestAmount = this.toNumber(lowestBid.amount);
    const recommendedAmount = recommended.bidAmount;
    const priceSpread = this.round(
      ((this.toNumber(highestBid.amount) - lowestAmount) / lowestAmount) * 100,
    );
    const maxBudget = this.toNumber(auction.maxBudget);
    const budgetSaving = maxBudget > 0
      ? this.round(((maxBudget - recommendedAmount) / maxBudget) * 100)
      : 0;
    const recProfile = auction.bids.find(
      (b) => b.supplierId === recommended.supplierId,
    )?.supplier?.supplierProfile;
    const onTimeRate = recProfile?.onTimeDeliveryRate ?? 0;
    const completedCount = recProfile?.completedAuctions ?? 0;
    const certCount = recProfile?.certifications?.length ?? 0;

    const summaryParts: string[] = [
      `"${auction.title}" ihalesine ${auction.bids.length} tedarikçi teklif verdi.`,
      `Teklifler ${this.formatAmount(lowestAmount)} ile ${this.formatAmount(this.toNumber(highestBid.amount))} arasında seyretmiş olup fiyat aralığı %${priceSpread}'dir.`,
    ];
    if (fraudDetection.suspicionLevel !== 'NONE') {
      summaryParts.push(
        `Fiyat anlaşması risk değerlendirmesinde ${fraudDetection.suspicionLevel === 'HIGH' ? 'yüksek' : 'orta düzey'} şüphe tespit edilmiştir; tekliflerin bağımsızlığı dikkatlice incelenmelidir.`,
      );
    } else {
      summaryParts.push(
        'Tekliflerin bağımsız ve rekabetçi nitelikte olduğu değerlendirilmektedir.',
      );
    }

    const reasonParts: string[] = [];
    if (recommended.aiScore >= 75) {
      reasonParts.push(
        `${recommended.supplierName}, ${recommended.aiScore} puanlık üstün AI skoru ile değerlendirme zirvesinde yer almaktadır.`,
      );
    } else {
      reasonParts.push(
        `${recommended.supplierName}, mevcut tedarikçiler arasında en dengeli risk-fiyat profiline sahiptir.`,
      );
    }
    if (onTimeRate >= 0.9) {
      reasonParts.push(
        `%${Math.round(onTimeRate * 100)} zamanında teslimat oranı sektör ortalamasının belirgin üzerindedir.`,
      );
    } else if (onTimeRate > 0) {
      reasonParts.push(
        `%${Math.round(onTimeRate * 100)} zamanında teslimat oranı orta düzeyde kabul edilebilir aralıktadır.`,
      );
    }
    if (certCount > 0) {
      reasonParts.push(
        `${certCount} adet uluslararası standart sertifikası tedarikçinin kalite güvencesini tescillemektedir.`,
      );
    }
    if (completedCount > 0) {
      reasonParts.push(
        `Platformdaki ${completedCount} tamamlanmış ihale, operasyonel güvenilirliği kanıtlamaktadır.`,
      );
    }
    if (runner) {
      const scoreDiff = recommended.aiScore - runner.aiScore;
      if (scoreDiff > 5) {
        reasonParts.push(
          `İkinci sıradaki ${runner.supplierName} ile ${scoreDiff} puanlık skor farkı önerinin belirginliğini güçlendirmektedir.`,
        );
      }
    }

    const marketInsightParts: string[] = [
      `${auction.category} kategorisindeki ${auction.bids.length} tekliflik rekabet, pazar fiyatlamasının sağlıklı şekilde oluştuğuna işaret etmektedir.`,
    ];
    if (budgetSaving > 0) {
      marketInsightParts.push(
        `Önerilen teklif, ${budgetSaving > 20 ? 'olağanüstü' : budgetSaving > 10 ? 'kayda değer' : 'makul'} düzeyde %${budgetSaving} bütçe tasarrufu sunmaktadır.`,
      );
    }
    if (priceSpread > 25) {
      marketInsightParts.push(
        `%${priceSpread} fiyat aralığı, tedarikçilerin maliyet yapıları veya teknik yorumları arasında önemli farklılıklar olduğuna işaret etmektedir; sözleşme öncesi kapsam netleştirmesi önerilir.`,
      );
    } else {
      marketInsightParts.push(
        'Yakın fiyat kümelenmesi pazarın rekabetçi ve olgun bir yapıda olduğunu göstermektedir.',
      );
    }
    marketInsightParts.push(
      'Nihai tedarikçi seçiminde fiyatın yanı sıra teslimat planı, kalite güvence belgeleri ve referans projelerin talep edilmesi değerlendirme kalitesini artıracaktır.',
    );

    const finalParts: string[] = [
      `Platform verileri ışığında ${recommended.supplierName} birinci sırada önerilmektedir.`,
    ];
    if (recommended.riskLevel === 'LOW') {
      finalParts.push('Düşük risk profili ve güçlü geçmiş performans verileri bu tercihi desteklemektedir.');
    } else if (recommended.riskLevel === 'MEDIUM') {
      finalParts.push('Orta düzey risk profili nedeniyle sözleşmeye performans güvencesi maddeleri eklenmesi tavsiye edilir.');
    }
    if (budgetSaving > 5) {
      finalParts.push(
        `Bütçeye kıyasla elde edilecek %${budgetSaving} tasarruf, bu seçimi mali açıdan da cazip kılmaktadır.`,
      );
    }

    return {
      summary: summaryParts.join(' '),
      lowestBid: {
        supplierId: lowestBid.supplierId,
        supplierName: lowestBid.supplier.name,
        amount: lowestAmount,
      },
      recommendedBid: {
        supplierId: recommended.supplierId,
        supplierName: recommended.supplierName,
        amount: recommendedAmount,
        reason: reasonParts.join(' '),
      },
      supplierRankings: rankings,
      fraudDetection,
      marketInsights: marketInsightParts.join(' '),
      finalRecommendation: finalParts.join(' '),
    };
  }

  private buildSupplierFallback(supplier: any): SupplierRiskResult {
    const profile = supplier.supplierProfile;
    const reliability = profile?.reliabilityScore ?? 0;
    const completed = profile?.completedAuctions ?? 0;
    const cancelled = profile?.cancelledAuctions ?? 0;
    const onTime = profile?.onTimeDeliveryRate ?? 0;
    const totalBids = profile?.totalBids ?? completed + cancelled;
    const certCount = profile?.certifications?.length ?? 0;
    const successRate = totalBids > 0
      ? this.round((completed / totalBids) * 100)
      : 0;

    const trustScore = this.round(
      Math.max(
        0,
        Math.min(
          100,
          reliability * 7 +
            onTime * 20 +
            Math.min(completed, 30) -
            cancelled * 5,
        ),
      ),
    );
    const riskLevel = this.toRiskLevel(trustScore, reliability, cancelled);

    // Detaylı özet
    const summaryParts: string[] = [];
    if (reliability >= 8) {
      summaryParts.push(
        `${supplier.name}, ${reliability}/10 güvenilirlik skoru ile platformun üst diliminde konumlanmaktadır.`,
      );
    } else if (reliability >= 5) {
      summaryParts.push(
        `${supplier.name}, ${reliability}/10 güvenilirlik skoru ile orta seviye performans sergilemektedir.`,
      );
    } else if (reliability > 0) {
      summaryParts.push(
        `${supplier.name}, ${reliability}/10 güvenilirlik skoru ile dikkat gerektiren bir risk profiline sahiptir.`,
      );
    } else {
      summaryParts.push(`${supplier.name} tedarikçisinin profil bilgileri değerlendirildi.`);
    }

    if (completed > 0) {
      summaryParts.push(
        `Tamamlanan ${completed} ihale${cancelled > 0 ? ` (${cancelled} iptal, %${successRate} başarı oranı)` : ''} operasyonel geçmişini ortaya koymaktadır.`,
      );
    }
    if (onTime > 0) {
      summaryParts.push(
        `%${Math.round(onTime * 100)} zamanında teslimat oranı ${onTime >= 0.9 ? 'sektör ortalamasının üzerinde güçlü' : onTime >= 0.7 ? 'kabul edilebilir' : 'iyileştirme gerektiren'} bir lojistik performansına işaret etmektedir.`,
      );
    }
    if (profile?.capacity) {
      summaryParts.push(`Beyan edilen kapasite: ${profile.capacity}.`);
    }

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      trustScore,
      riskLevel,
      summary: summaryParts.join(' '),
      strengths: this.buildStrengths(profile, false),
      risks: this.buildRisks(profile, 0, 0),
      recommendedUseCases: profile?.specializations?.length
        ? profile.specializations
        : [supplier.sector ?? 'Genel tedarik'],
    };
  }

  private toFraudInputs(bids: AuctionBid[]): BidForFraud[] {
    return bids.map((bid) => ({
      supplierId: bid.supplierId,
      supplierName: bid.supplier.name,
      amount: this.toNumber(bid.amount),
      createdAt: bid.createdAt,
      reliabilityScore: bid.supplier.supplierProfile?.reliabilityScore ?? 0,
    }));
  }

  private toFraudHistoryInputs(histories: AuctionBidHistory[]): BidHistoryForFraud[] {
    return histories.map((history) => ({
      supplierId: history.supplierId,
      amount: this.toNumber(history.amount),
      previousAmount:
        history.previousAmount === null || history.previousAmount === undefined
          ? null
          : this.toNumber(history.previousAmount),
      action: history.action,
      ipAddress: history.ipAddress ?? null,
      createdAt: history.createdAt,
    }));
  }
  private buildStrengths(profile: any, isLowest: boolean): string[] {
    const strengths: string[] = [];
    const reliability: number = profile?.reliabilityScore ?? 0;
    const onTime: number = profile?.onTimeDeliveryRate ?? 0;
    const completed: number = profile?.completedAuctions ?? 0;
    const certs: string[] = profile?.certifications ?? [];
    const avgDays: number = profile?.avgDeliveryDays ?? 0;

    if (isLowest) {
      strengths.push('İhaledeki en rekabetçi fiyat teklifini sunuyor');
    }
    if (reliability >= 9) {
      strengths.push(`Olağanüstü güvenilirlik skoru (${reliability}/10) — sektörün en iyileri arasında`);
    } else if (reliability >= 8) {
      strengths.push(`Yüksek güvenilirlik skoru (${reliability}/10) — tutarlı ve güvenilir operasyon`);
    } else if (reliability >= 7) {
      strengths.push(`İyi güvenilirlik skoru (${reliability}/10) — ortalama üstü performans`);
    }
    if (onTime >= 0.95) {
      strengths.push(`%${Math.round(onTime * 100)} zamanında teslimat oranı — lojistik üstünlüğü kanıtlanmış`);
    } else if (onTime >= 0.9) {
      strengths.push(`%${Math.round(onTime * 100)} zamanında teslimat oranı — güçlü lojistik yönetimi`);
    }
    if (certs.length >= 3) {
      strengths.push(`${certs.length} adet uluslararası kalite sertifikası (${certs.slice(0, 2).join(', ')} vb.) — kalite güvencesi tescilli`);
    } else if (certs.length > 0) {
      strengths.push(`${certs.join(', ')} sertifikaları ile kalite standartları belgelenmiş`);
    }
    if (completed >= 30) {
      strengths.push(`${completed} başarıyla tamamlanmış ihale — derin sektör deneyimi`);
    } else if (completed >= 10) {
      strengths.push(`${completed} tamamlanmış ihale ile kanıtlanmış operasyonel kapasite`);
    }
    if (avgDays > 0 && avgDays <= 20) {
      strengths.push(`Ortalama ${avgDays} günlük hızlı teslimat süresi`);
    }
    if (profile?.capacity && !profile.capacity.includes('Belirtilmemiş') && !profile.capacity.includes('beyan edilmedi')) {
      strengths.push(`Yeterli üretim kapasitesi beyan edilmiş: ${profile.capacity}`);
    }
    return strengths.length
      ? strengths
      : ['Tedarikçi profili eksiksiz; hesaplanan metrikler ortalama aralıkta'];
  }

  private buildRisks(profile: any, amount: number, lowest: number): string[] {
    const risks: string[] = [];
    const reliability: number = profile?.reliabilityScore ?? 0;
    const onTime: number = profile?.onTimeDeliveryRate ?? 0;
    const cancelled: number = profile?.cancelledAuctions ?? 0;
    const totalBids: number = (profile?.totalBids ?? 0) || ((profile?.completedAuctions ?? 0) + cancelled);
    const cancelRate = totalBids > 0 ? cancelled / totalBids : 0;

    if (reliability > 0 && reliability < 4) {
      risks.push(`Düşük güvenilirlik skoru (${reliability}/10) — tedarikçi geçmişi kapsamlı incelenmelidir`);
    } else if (reliability > 0 && reliability < 6) {
      risks.push(`Orta-düşük güvenilirlik skoru (${reliability}/10) — performans iyileştirme maddeleri sözleşmeye eklenebilir`);
    }
    if (cancelled > 10 || cancelRate > 0.25) {
      risks.push(
        `Yüksek iptal oranı (${cancelled} iptal${cancelRate > 0 ? `, toplam ihalelerin %${Math.round(cancelRate * 100)}'i` : ''}) — operasyonel güvenilirlik sorgulanabilir`,
      );
    } else if (cancelled > 2) {
      risks.push(`${cancelled} iptal edilmiş ihale — geçmiş sözleşme uyumu incelenmelidir`);
    }
    if (onTime > 0 && onTime < 0.6) {
      risks.push(`Düşük zamanında teslimat oranı (%${Math.round(onTime * 100)}) — ciddi lojistik risk; cezai yaptırım maddesi önerilir`);
    } else if (onTime > 0 && onTime < 0.75) {
      risks.push(`Teslimat dakikliği orta-düşük (%${Math.round(onTime * 100)}) — teslimat takvimi yakından izlenmelidir`);
    }
    if (amount > 0 && lowest > 0 && amount > lowest * 1.15) {
      const pct = Math.round(((amount - lowest) / lowest) * 100);
      risks.push(`Teklif tutarı en düşük teklifin %${pct} üzerinde — fiyat gerekçesi talep edilmeli`);
    }
    if (!(profile?.certifications?.length)) {
      risks.push('Kalite sertifikasyonu mevcut değil — tedarikçiden belge talep edilmesi önerilir');
    }
    return risks.length
      ? risks
      : ['Mevcut platform verilerinde kayda değer risk sinyali tespit edilmedi'];
  }

  private toRiskLevel(
    score: number,
    reliability: number,
    cancelled: number,
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score >= 78 && reliability >= 7 && cancelled <= 2) return 'LOW';
    if (score < 45 || cancelled >= 5) return 'HIGH';
    return 'MEDIUM';
  }

  private normalizeRiskLevel(level: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const upper = (level ?? '').toUpperCase();
    if (upper === 'LOW' || upper === 'MEDIUM' || upper === 'HIGH') return upper;
    return 'MEDIUM';
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value ?? '',
    );
  }

  private normalizeAnalysisResult(
    result: AuctionAnalysisResult,
    nameMap: Map<string, string>,
  ): AuctionAnalysisResult {
    const resolveName = (id: string, name: string): string => {
      if (!name?.trim() || this.isUuid(name)) return nameMap.get(id) ?? name;
      return name;
    };

    return {
      ...result,
      lowestBid: {
        ...result.lowestBid,
        supplierName: resolveName(
          result.lowestBid.supplierId,
          result.lowestBid.supplierName,
        ),
      },
      recommendedBid: {
        ...result.recommendedBid,
        supplierName: resolveName(
          result.recommendedBid.supplierId,
          result.recommendedBid.supplierName,
        ),
      },
      supplierRankings: result.supplierRankings.map((r) => ({
        ...r,
        supplierName: resolveName(r.supplierId, r.supplierName),
        riskLevel: this.normalizeRiskLevel(r.riskLevel),
      })),
    };
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

  private formatAmount(amount: number): string {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(2).replace('.', ',')} M₺`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)} K₺`;
    }
    return `${amount.toFixed(0)} ₺`;
  }

  private toNumber(value: unknown): number {
    return Number(value ?? 0);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
