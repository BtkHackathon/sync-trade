export type AiRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type FraudSuspicionLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface LowestBidSnapshot {
  supplierId: string;
  supplierName: string;
  amount: number;
}

export interface RecommendedBidSnapshot extends LowestBidSnapshot {
  reason: string;
}

export interface SupplierRanking {
  rank: number;
  supplierId: string;
  supplierName: string;
  bidAmount: number;
  reliabilityScore: number;
  riskLevel: AiRiskLevel;
  strengths: string[];
  risks: string[];
  aiScore: number;
}

export interface FraudDetectionResult {
  suspicionLevel: FraudSuspicionLevel;
  suspiciousSuppliers: string[];
  reasoning: string;
}

export interface AuctionAnalysisResult {
  summary: string;
  lowestBid: LowestBidSnapshot;
  recommendedBid: RecommendedBidSnapshot;
  supplierRankings: SupplierRanking[];
  fraudDetection: FraudDetectionResult;
  marketInsights: string;
  finalRecommendation: string;
}

export interface StoredAuctionReport {
  reportId: string;
  auctionId: string;
  buyerId: string;
  analysisResult: AuctionAnalysisResult;
  ragContextUsed: string[];
  modelUsed: string;
  processingTimeMs: number;
  generatedWithFallback: boolean;
}

export interface SupplierRiskResult {
  supplierId: string;
  supplierName: string;
  trustScore: number;
  riskLevel: AiRiskLevel;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendedUseCases: string[];
}

export interface SpecAnalysisResult {
  title: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  estimatedBudget: number | null;
  deadline: string | null;
  requirements: string[];
  technicalSpecs: Record<string, string | number | boolean | null>;
}

export interface BidHistoryForFraud {
  supplierId: string;
  amount: number;
  previousAmount: number | null;
  action: 'PLACED' | 'UPDATED' | 'WITHDRAWN';
  ipAddress: string | null;
  createdAt: Date;
}
export interface BidForFraud {
  supplierId: string;
  supplierName: string;
  amount: number;
  createdAt: Date;
  reliabilityScore: number;
}
