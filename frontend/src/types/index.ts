export type CompanyRole = 'BUYER' | 'SUPPLIER';
export type AuctionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'CANCELLED';
export type BidStatus = 'ACTIVE' | 'WITHDRAWN';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type FraudLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface SupplierProfile {
  id: string;
  reliabilityScore: number;
  completedAuctions: number;
  cancelledAuctions: number;
  onTimeDeliveryRate: number;
  certifications: string[];
  specializations: string[];
  capacity?: string;
  description?: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  role: CompanyRole;
  sector?: string;
  taxId?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  isVerified: boolean;
  createdAt: string;
  supplierProfile?: SupplierProfile;
}

export interface AuctionBuyer {
  id: string;
  name: string;
  email: string;
  sector?: string;
  city?: string;
  isVerified: boolean;
}

export interface BidSupplier {
  id: string;
  name: string;
  email: string;
  sector?: string;
  city?: string;
  isVerified: boolean;
  supplierProfile?: SupplierProfile;
}

export interface Bid {
  id: string;
  auctionId: string;
  supplierId: string;
  amount: string;
  note?: string;
  status: BidStatus;
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: BidSupplier;
  auction?: {
    id: string;
    title: string;
    status: AuctionStatus;
    endsAt: string;
    maxBudget: string;
    lowestBidAmount?: string;
  };
}

export interface AwardedBid {
  id: string;
  auctionId: string;
  bidId: string;
  supplierId: string;
  status: string;
  awardedAt: string;
  deliveredAt?: string;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  maxBudget: string;
  deliveryAddress?: string;
  deliveryDeadline: string;
  requirements: string[];
  status: AuctionStatus;
  endsAt: string;
  buyerId: string;
  specDocumentUrl?: string;
  aiReportId?: string;
  lowestBidAmount?: string;
  bidCount: number;
  createdAt: string;
  updatedAt: string;
  buyer: AuctionBuyer;
  bids?: Bid[];
  awardedBid?: AwardedBid;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role: CompanyRole;
  sector?: string;
  taxId?: string;
  phone?: string;
  city?: string;
  country?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  company: Company;
}

export interface CreateAuctionDto {
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  maxBudget: number;
  deliveryAddress?: string;
  deliveryDeadline: string;
  requirements?: string[];
  endsAt: string;
  specDocumentUrl?: string;
}

export interface SpecAnalysisResult {
  title: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  estimatedBudget: number | null;
  deadline: string | null;
  requirements: string[];
  technicalSpecs: Record<string, unknown>;
}

export interface SupplierRanking {
  rank: number;
  supplierId: string;
  supplierName: string;
  bidAmount: number;
  reliabilityScore: number;
  riskLevel: RiskLevel;
  strengths: string[];
  risks: string[];
  aiScore: number;
}

export interface FraudDetectionResult {
  suspicionLevel: FraudLevel;
  suspiciousSuppliers: string[];
  reasoning: string;
}

export interface AuctionAnalysisResult {
  summary: string;
  lowestBid: { supplierId: string; supplierName: string; amount: number };
  recommendedBid: { supplierId: string; supplierName: string; amount: number; reason: string };
  supplierRankings: SupplierRanking[];
  fraudDetection: FraudDetectionResult;
  marketInsights: string;
  finalRecommendation: string;
}

export interface AiReport {
  reportId: string;
  auctionId: string;
  buyerId: string;
  analysisResult: AuctionAnalysisResult;
  ragContextUsed: string[];
  modelUsed: string;
  processingTimeMs: number;
  generatedWithFallback: boolean;
}

// WebSocket event payloads
export interface BidUpdateEvent {
  bidId: string;
  auctionId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  isNewLowest: boolean;
  totalBidCount: number;
  timestamp: string;
}

export interface AuctionClosedEvent {
  auctionId: string;
  buyerId: string;
  closedAt: string;
}

export interface AuctionAwardedEvent {
  auctionId: string;
  supplierId: string;
  winningAmount: number;
  awardedAt: string;
}
