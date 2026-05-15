import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import {
  BidForFraud,
  FraudDetectionResult,
  FraudSuspicionLevel,
} from '../analysis/analysis.types';

export interface AiFraudAnalysis {
  suspicionLevel: FraudSuspicionLevel;
  riskScore: number;
  patterns: string[];
  reasoning: string;
  recommendations: string[];
}

@Injectable()
export class FraudServiceEnhanced {
  private readonly logger = new Logger(FraudServiceEnhanced.name);

  // Configuration thresholds (externalize to config in production)
  private readonly MIN_SPREAD_HIGH = 0.02;
  private readonly MIN_SPREAD_MEDIUM = 0.05;
  private readonly TIME_WINDOW_HIGH_MS = 5 * 60_000; // 5 minutes
  private readonly TIME_WINDOW_MEDIUM_MS = 15 * 60_000; // 15 minutes
  private readonly PRICE_OUTLIER_THRESHOLD = 0.82; // 82% of average = outlier
  private readonly MIN_RELIABILITY_THRESHOLD = 3;

  constructor(private readonly gemini: GeminiService) {}

  /**
   * Enhanced fraud detection combining heuristics with AI analysis
   * Step 1: Run heuristic patterns
   * Step 2: Use Gemini for deep pattern interpretation
   * Step 3: Return combined assessment
   */
  async assessBidsWithAi(bids: BidForFraud[]): Promise<FraudDetectionResult> {
    if (bids.length < 2) {
      return {
        suspicionLevel: 'NONE',
        suspiciousSuppliers: [],
        reasoning: 'Fraud analysis requires at least 2 bids.',
      };
    }

    // Stage 1: Heuristic analysis
    const heuristicResult = this.analyzeHeuristics(bids);

    // Stage 2: If medium or high suspicion, run Gemini analysis
    if (heuristicResult.suspicionLevel !== 'NONE') {
      const aiResult = await this.runAiAnalysis(bids, heuristicResult);
      return this.mergeAnalysis(heuristicResult, aiResult);
    }

    return heuristicResult;
  }

  /**
   * Heuristic pattern detection (fast, deterministic)
   */
  private analyzeHeuristics(bids: BidForFraud[]): FraudDetectionResult {
    const sortedByPrice = [...bids].sort((a, b) => a.amount - b.amount);
    const lowest = sortedByPrice[0].amount;
    const average =
      sortedByPrice.reduce((sum, bid) => sum + bid.amount, 0) / sortedByPrice.length;
    const spreadRatio = (sortedByPrice[sortedByPrice.length - 1].amount - lowest) / average;

    const sortedByTime = [...bids].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const timeWindowMs =
      sortedByTime[sortedByTime.length - 1].createdAt.getTime() -
      sortedByTime[0].createdAt.getTime();

    const suspiciousSuppliers = new Set<string>();
    const reasons: string[] = [];
    let suspicionLevel: FraudSuspicionLevel = 'NONE';

    // Pattern 1: Tight clustering (LOW spread, SHORT time)
    if (spreadRatio < this.MIN_SPREAD_HIGH && timeWindowMs < this.TIME_WINDOW_HIGH_MS) {
      suspicionLevel = 'HIGH';
      reasons.push('Bidders submitted nearly identical amounts within a very short timeframe.');
      sortedByPrice.forEach((bid) => suspiciousSuppliers.add(bid.supplierId));
    }
    // Pattern 2: Narrow spread over medium time
    else if (
      spreadRatio < this.MIN_SPREAD_MEDIUM &&
      timeWindowMs < this.TIME_WINDOW_MEDIUM_MS
    ) {
      suspicionLevel = 'MEDIUM';
      reasons.push('Suspicious bid clustering detected with narrow spread in short time window.');
      sortedByPrice.slice(0, 3).forEach((bid) => suspiciousSuppliers.add(bid.supplierId));
    }

    // Pattern 3: Weak suppliers with suspiciously low bids
    for (const bid of sortedByPrice) {
      const tooCheap = bid.amount < average * this.PRICE_OUTLIER_THRESHOLD;
      const weakProfile =
        bid.reliabilityScore > 0 && bid.reliabilityScore < this.MIN_RELIABILITY_THRESHOLD;

      if (tooCheap && weakProfile) {
        if (suspicionLevel === 'NONE') {
          suspicionLevel = 'LOW';
        }
        reasons.push(
          `Supplier ${bid.supplierId} has low reliability (${bid.reliabilityScore}/10) but placed suspiciously cheap bid (${bid.amount}).`,
        );
        suspiciousSuppliers.add(bid.supplierId);
      }
    }

    return {
      suspicionLevel,
      suspiciousSuppliers: Array.from(suspiciousSuppliers),
      reasoning: reasons.length > 0 ? reasons.join(' ') : 'No suspicious patterns detected.',
    };
  }

  /**
   * AI-powered deep analysis using Gemini
   * Analyzes supplier network, bidding patterns, and historical behavior
   */
  private async runAiAnalysis(
    bids: BidForFraud[],
    heuristic: FraudDetectionResult,
  ): Promise<AiFraudAnalysis> {
    const fallback: AiFraudAnalysis = {
      suspicionLevel: heuristic.suspicionLevel,
      riskScore: this.suspicionToRiskScore(heuristic.suspicionLevel),
      patterns: [],
      reasoning: heuristic.reasoning,
      recommendations: [],
    };

    try {
      const prompt = this.buildFraudAnalysisPrompt(bids, heuristic);

      const result = await this.gemini.generateJson<AiFraudAnalysis>({
        task: 'fraud-pattern-analysis',
        fallback,
        prompt,
      });

      return result;
    } catch (error) {
      this.logger.error('AI fraud analysis failed, using heuristic fallback:', error);
      return fallback;
    }
  }

  /**
   * Build detailed prompt for Gemini fraud analysis
   */
  private buildFraudAnalysisPrompt(
    bids: BidForFraud[],
    heuristic: FraudDetectionResult,
  ): string {
    const bidsJson = bids.map((b) => ({
      supplierId: b.supplierId,
      amount: b.amount.toString(),
      reliability: b.reliabilityScore,
      bidTime: b.createdAt.toISOString(),
    }));

    return [
      'Analyze these bids for collusion and fraud patterns in a B2B reverse auction.',
      'Return JSON: { suspicionLevel: HIGH|MEDIUM|LOW|NONE, riskScore: 0-100, patterns: [...], reasoning: "...", recommendations: [...] }',
      '',
      'Heuristic findings:',
      heuristic.reasoning,
      '',
      'Bid data:',
      JSON.stringify(bidsJson, null, 2),
      '',
      'Analyze for:',
      '1. Coordination signals (timing, price alignment)',
      '2. Supplier reputation mismatches',
      '3. Historical bidding anomalies',
      '4. Geographic/sectoral clustering',
      '5. Recommend acceptance or further investigation',
    ].join('\n');
  }

  /**
   * Merge heuristic and AI results
   */
  private mergeAnalysis(
    heuristic: FraudDetectionResult,
    ai: AiFraudAnalysis,
  ): FraudDetectionResult {
    // Prefer AI analysis if available
    const finalSuspicionLevel = this.elevateSuspicion(heuristic.suspicionLevel, ai.riskScore);

    return {
      suspicionLevel: finalSuspicionLevel,
      suspiciousSuppliers: Array.from(
        new Set([...heuristic.suspiciousSuppliers, ...this.extractSuspiciousFromAi(ai)]),
      ),
      reasoning: [
        `Heuristic Analysis: ${heuristic.reasoning}`,
        `AI Pattern Analysis: ${ai.reasoning}`,
        ai.recommendations.length > 0
          ? `Recommendations: ${ai.recommendations.join('; ')}`
          : '',
      ]
        .filter(Boolean)
        .join(' | '),
    };
  }

  /**
   * Convert risk score to suspicion level
   */
  private elevateSuspicion(
    heuristic: FraudSuspicionLevel,
    riskScore: number,
  ): FraudSuspicionLevel {
    if (riskScore >= 80) return 'HIGH';
    if (riskScore >= 50) return 'MEDIUM';
    if (riskScore >= 20) return 'LOW';
    return heuristic; // Fall back to heuristic if AI score is low
  }

  /**
   * Extract suspicious supplier IDs from AI analysis
   */
  private extractSuspiciousFromAi(ai: AiFraudAnalysis): string[] {
    // In production, parse AI response to extract specific supplier IDs
    // For now, return empty as it would be in the reasoning text
    return [];
  }

  /**
   * Convert suspicion level to numeric risk score
   */
  private suspicionToRiskScore(level: FraudSuspicionLevel): number {
    switch (level) {
      case 'HIGH':
        return 85;
      case 'MEDIUM':
        return 55;
      case 'LOW':
        return 25;
      case 'NONE':
        return 0;
      default:
        return 0;
    }
  }
}
