export type BudgetLevel = "low" | "balanced" | "premium";
export type Urgency = "low" | "medium" | "high";
export type VerificationStatus = "verified" | "review" | "risk";

export interface ManufacturingRequest {
  id: string;
  title: string;
  description: string;
  material: string;
  process: string;
  quantity: number;
  deadlineDays: number;
  budgetLevel: BudgetLevel;
  urgency: Urgency;
  city: string;
  owner: string;
}

export interface ProductionCapacity {
  id: string;
  supplier: string;
  city: string;
  machineType: string;
  materialAvailable: string;
  availableHours: number;
  productionCapacity: number;
  trustScore: number;
  verificationStatus: VerificationStatus;
  carbonSavingKg: number;
}

export interface ScoreBreakdown {
  material: number;
  machine: number;
  deadline: number;
  trust: number;
}

export interface MatchResult {
  id: string;
  requestId: string;
  capacityId: string;
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  type: "NEW_REQUEST" | "NEW_CAPACITY" | "AI_ANALYSIS" | "NEW_MATCH" | "VERIFICATION_COMPLETE";
  title: string;
  detail: string;
  timestamp: string;
}
