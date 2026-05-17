import { Injectable } from '@nestjs/common';
import {
  BidForFraud,
  BidHistoryForFraud,
  FraudDetectionResult,
  FraudSuspicionLevel,
} from '../analysis/analysis.types';

@Injectable()
export class FraudService {
  assessBids(
    bids: BidForFraud[],
    histories: BidHistoryForFraud[] = [],
  ): FraudDetectionResult {
    if (bids.length < 2) {
      return {
        suspicionLevel: 'NONE',
        suspiciousSuppliers: [],
        reasoning: 'Fraud pattern analysis needs at least two bids.',
      };
    }

    const sortedByPrice = [...bids].sort((a, b) => a.amount - b.amount);
    const lowest = sortedByPrice[0].amount;
    const average =
      sortedByPrice.reduce((sum, bid) => sum + bid.amount, 0) /
      sortedByPrice.length;
    const spreadRatio =
      (sortedByPrice[sortedByPrice.length - 1].amount - lowest) / average;

    const sortedByTime = [...bids].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const timeWindowMinutes =
      (sortedByTime[sortedByTime.length - 1].createdAt.getTime() -
        sortedByTime[0].createdAt.getTime()) /
      60_000;

    const suspiciousSuppliers = new Set<string>();
    const reasons: string[] = [];
    let suspicionLevel: FraudSuspicionLevel = 'LOW';

    if (spreadRatio < 0.02 && timeWindowMinutes < 5) {
      suspicionLevel = 'HIGH';
      reasons.push('Bid amounts and timing are unusually parallel.');
      sortedByPrice.forEach((bid) => suspiciousSuppliers.add(bid.supplierId));
    } else if (spreadRatio < 0.05 && timeWindowMinutes < 15) {
      suspicionLevel = 'MEDIUM';
      reasons.push('Bid spread is narrow inside a short time window.');
      sortedByPrice
        .slice(0, 3)
        .forEach((bid) => suspiciousSuppliers.add(bid.supplierId));
    }

    for (const bid of sortedByPrice) {
      const tooCheap = bid.amount < average * 0.82;
      const weakProfile = bid.reliabilityScore > 0 && bid.reliabilityScore < 3;
      if (tooCheap && weakProfile) {
        suspicionLevel = suspicionLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
        suspiciousSuppliers.add(bid.supplierId);
        reasons.push(
          `${bid.supplierName} has a low reliability score and an outlier low bid.`,
        );
      }
    }

    this.assessHistoryPatterns(
      histories,
      suspiciousSuppliers,
      reasons,
      (level) => {
        suspicionLevel = this.maxSuspicion(suspicionLevel, level);
      },
    );

    if (reasons.length === 0) {
      return {
        suspicionLevel: 'LOW',
        suspiciousSuppliers: [],
        reasoning:
          'No strong collusion or outlier pricing pattern was detected.',
      };
    }

    return {
      suspicionLevel,
      suspiciousSuppliers: Array.from(suspiciousSuppliers),
      reasoning: reasons.join(' '),
    };
  }

  private assessHistoryPatterns(
    histories: BidHistoryForFraud[],
    suspiciousSuppliers: Set<string>,
    reasons: string[],
    elevate: (level: FraudSuspicionLevel) => void,
  ): void {
    if (histories.length < 3) {
      return;
    }

    const byIp = new Map<string, Set<string>>();
    for (const history of histories) {
      if (!history.ipAddress) continue;
      const suppliers = byIp.get(history.ipAddress) ?? new Set<string>();
      suppliers.add(history.supplierId);
      byIp.set(history.ipAddress, suppliers);
    }

    for (const [ipAddress, suppliers] of byIp.entries()) {
      if (suppliers.size >= 2) {
        elevate('HIGH');
        suppliers.forEach((supplierId) => suspiciousSuppliers.add(supplierId));
        reasons.push(
          `Multiple suppliers submitted bids from the same IP address (${ipAddress}).`,
        );
      }
    }

    const sorted = [...histories].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const quickSequence = sorted.some((history, index) => {
      const previous = sorted[index - 1];
      if (!previous || previous.supplierId === history.supplierId) {
        return false;
      }
      return (
        history.createdAt.getTime() - previous.createdAt.getTime() < 20_000
      );
    });

    if (quickSequence) {
      elevate('MEDIUM');
      sorted.forEach((history) => suspiciousSuppliers.add(history.supplierId));
      reasons.push(
        'Cross-supplier bid updates happened within suspiciously short intervals.',
      );
    }
  }

  private maxSuspicion(
    current: FraudSuspicionLevel,
    next: FraudSuspicionLevel,
  ): FraudSuspicionLevel {
    const rank: Record<FraudSuspicionLevel, number> = {
      NONE: 0,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
    };

    return rank[next] > rank[current] ? next : current;
  }
}
