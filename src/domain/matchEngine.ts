import type { ManufacturingRequest, MatchResult, ProductionCapacity, ScoreBreakdown } from "../types";

const materialAliases: Record<string, string[]> = {
  "oak wood": ["oak", "wood", "meşe", "timber"],
  aluminum: ["aluminum", "aluminium", "6061", "metal"],
  "recycled textile": ["textile", "canvas", "fabric", "kumaş"],
};

const processAliases: Record<string, string[]> = {
  "cnc cutting": ["cnc", "router", "cutting"],
  "cnc milling": ["cnc", "milling", "machining"],
  sewing: ["sewing", "stitch", "industrial sewing"],
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const includesAny = (text: string, values: string[]) => {
  const normalized = text.toLowerCase();
  return values.some((value) => normalized.includes(value.toLowerCase()));
};

export function calculateBreakdown(
  request: ManufacturingRequest,
  capacity: ProductionCapacity,
): ScoreBreakdown {
  const materialSignals = materialAliases[request.material] ?? [request.material];
  const processSignals = processAliases[request.process] ?? [request.process];

  const material = includesAny(capacity.materialAvailable, materialSignals) ? 92 : 54;
  const machine = includesAny(capacity.machineType, processSignals) ? 94 : 48;
  const deadline = capacity.availableHours >= request.quantity || request.deadlineDays >= 18 ? 86 : 68;
  const trust = capacity.trustScore;

  return {
    material: clampScore(material),
    machine: clampScore(machine),
    deadline: clampScore(deadline),
    trust: clampScore(trust),
  };
}

export function calculateMatchScore(breakdown: ScoreBreakdown) {
  return clampScore(
    breakdown.material * 0.4 +
      breakdown.machine * 0.3 +
      breakdown.deadline * 0.2 +
      breakdown.trust * 0.1,
  );
}

export function createMatch(request: ManufacturingRequest, capacity: ProductionCapacity): MatchResult {
  const breakdown = calculateBreakdown(request, capacity);
  const score = calculateMatchScore(breakdown);

  return {
    id: `MAT-${Math.floor(9000 + Math.random() * 900)}`,
    requestId: request.id,
    capacityId: capacity.id,
    score,
    breakdown,
    reason: `${capacity.supplier}, ${request.material} ve ${request.process} ihtiyacını mevcut ${capacity.machineType} kapasitesiyle karşılayabiliyor. Boş saat ve güven skoru final skoru güçlendiriyor.`,
    createdAt: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };
}
