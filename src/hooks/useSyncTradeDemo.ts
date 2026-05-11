import { useMemo, useState } from "react";
import { createMatch } from "../domain/matchEngine";
import { initialActivity, initialCapacities, initialMatches, initialRequests } from "../data/seedData";
import type { ActivityEvent, ManufacturingRequest, ProductionCapacity } from "../types";

type NewRequestInput = Omit<ManufacturingRequest, "id" | "owner" | "urgency"> & {
  owner?: string;
};

type NewCapacityInput = Omit<ProductionCapacity, "id" | "trustScore" | "verificationStatus" | "carbonSavingKg"> & {
  trustScore?: number;
};

const nextId = (prefix: string, length: number) =>
  `${prefix}-${String(Math.floor(Math.random() * 900) + length + 100).padStart(3, "0")}`;

const now = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function useSyncTradeDemo() {
  const [requests, setRequests] = useState(initialRequests);
  const [capacities, setCapacities] = useState(initialCapacities);
  const [matches, setMatches] = useState(initialMatches);
  const [activity, setActivity] = useState(initialActivity);
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatches[0]?.id ?? "");

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? matches[0];

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedMatch?.requestId) ?? requests[0],
    [requests, selectedMatch],
  );

  const selectedCapacity = useMemo(
    () => capacities.find((capacity) => capacity.id === selectedMatch?.capacityId) ?? capacities[0],
    [capacities, selectedMatch],
  );

  const pushActivity = (events: ActivityEvent[]) => {
    setActivity((current) => [...events, ...current].slice(0, 9));
  };

  const addRequest = (input: NewRequestInput) => {
    const request: ManufacturingRequest = {
      ...input,
      id: nextId("REQ", requests.length),
      owner: input.owner?.trim() || "Yeni Talep Sahibi",
      urgency: input.deadlineDays <= 14 ? "high" : "medium",
    };

    const targetCapacity = capacities[0];
    const match = createMatch(request, targetCapacity);

    setRequests((current) => [request, ...current]);
    setMatches((current) => [match, ...current]);
    setSelectedMatchId(match.id);
    pushActivity([
      {
        id: crypto.randomUUID(),
        type: "NEW_REQUEST",
        title: "Yeni talep açıldı",
        detail: `${request.title} AI analiz kuyruğuna alındı.`,
        timestamp: now(),
      },
      {
        id: crypto.randomUUID(),
        type: "AI_ANALYSIS",
        title: "Semantic extraction tamamlandı",
        detail: `${request.material} ve ${request.process} parametreleri yapılandırıldı.`,
        timestamp: now(),
      },
      {
        id: crypto.randomUUID(),
        type: "NEW_MATCH",
        title: "Yeni eşleşme bulundu",
        detail: `${targetCapacity.supplier} ile %${match.score} match score üretildi.`,
        timestamp: now(),
      },
    ]);
  };

  const addCapacity = (input: NewCapacityInput) => {
    const capacity: ProductionCapacity = {
      ...input,
      id: nextId("CAP", capacities.length),
      trustScore: input.trustScore ?? 84,
      verificationStatus: "review",
      carbonSavingKg: Math.max(6, Math.round(input.availableHours * 0.7)),
    };

    const targetRequest = requests[0];
    const match = createMatch(targetRequest, capacity);

    setCapacities((current) => [capacity, ...current]);
    setMatches((current) => [match, ...current]);
    setSelectedMatchId(match.id);
    pushActivity([
      {
        id: crypto.randomUUID(),
        type: "NEW_CAPACITY",
        title: "Yeni kapasite girişi",
        detail: `${capacity.supplier}, ${capacity.machineType} kapasitesini açtı.`,
        timestamp: now(),
      },
      {
        id: crypto.randomUUID(),
        type: "NEW_MATCH",
        title: "Kapasite talep ile eşleşti",
        detail: `${targetRequest.title} için %${match.score} final skor hesaplandı.`,
        timestamp: now(),
      },
    ]);
  };

  const metrics = useMemo(
    () => ({
      requests: requests.length,
      capacities: capacities.length,
      matches: matches.length,
      averageScore: Math.round(matches.reduce((sum, match) => sum + match.score, 0) / matches.length),
      carbonSaving: capacities.reduce((sum, capacity) => sum + capacity.carbonSavingKg, 0),
      verifiedSuppliers: capacities.filter((capacity) => capacity.verificationStatus === "verified").length,
    }),
    [capacities, matches, requests],
  );

  return {
    requests,
    capacities,
    matches,
    activity,
    selectedMatch,
    selectedRequest,
    selectedCapacity,
    metrics,
    addRequest,
    addCapacity,
    selectMatch: setSelectedMatchId,
  };
}
