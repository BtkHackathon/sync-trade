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
        reasoning:
          'Kartel analizi için en az iki bağımsız tedarikçi teklifi gerekmektedir. Mevcut veriyle anlamlı bir örüntü tespiti yapılamamaktadır.',
      };
    }

    // Tedarikçi id → isim haritası (hem score hem de history analizi için)
    const nameMap = new Map<string, string>(
      bids.map((b) => [b.supplierId, b.supplierName]),
    );

    const sortedByPrice = [...bids].sort((a, b) => a.amount - b.amount);
    const lowest = sortedByPrice[0].amount;
    const highest = sortedByPrice[sortedByPrice.length - 1].amount;
    const total = sortedByPrice.reduce((sum, bid) => sum + bid.amount, 0);
    const average = total / sortedByPrice.length;
    const spreadRatio = (highest - lowest) / average;
    const spreadPct = Math.round(spreadRatio * 100);

    const sortedByTime = [...bids].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const timeWindowMinutes = Math.round(
      (sortedByTime[sortedByTime.length - 1].createdAt.getTime() -
        sortedByTime[0].createdAt.getTime()) /
        60_000,
    );

    // İsimleri saklayan set
    const suspiciousNames = new Set<string>();
    const reasons: string[] = [];
    let suspicionLevel: FraudSuspicionLevel = 'LOW';

    // ── Kural 1: Çok dar fiyat aralığı + çok kısa süre ──
    if (spreadRatio < 0.02 && timeWindowMinutes < 5) {
      suspicionLevel = 'HIGH';
      const names = sortedByPrice.map((b) => b.supplierName).join(', ');
      sortedByPrice.forEach((bid) => suspiciousNames.add(bid.supplierName));
      reasons.push(
        `Teklif tutarları arasındaki fark yalnızca %${spreadPct} iken tüm teklifler ${timeWindowMinutes < 1 ? 'bir dakikadan kısa' : timeWindowMinutes + ' dakika'} gibi son derece kısa bir süreye sıkışmıştır. ` +
        `Bu tablo (${names}), tekliflerin önceden koordineli biçimde belirlendiğine dair güçlü bir kartel bulgusunu işaret etmektedir.`,
      );
    } else if (spreadRatio < 0.05 && timeWindowMinutes < 15) {
      suspicionLevel = 'MEDIUM';
      sortedByPrice
        .slice(0, Math.min(3, sortedByPrice.length))
        .forEach((bid) => suspiciousNames.add(bid.supplierName));
      reasons.push(
        `Teklifler %${spreadPct} gibi dar bir fiyat bandında kümelenmiş ve ${timeWindowMinutes} dakika gibi kısa bir sürede verilmiştir. ` +
        'Bu örüntü rekabetçi bir piyasayla değil, önceden anlaşılmış fiyatlarla uyumlu görünmektedir.',
      );
    }

    // ── Kural 2: Anormal düşük fiyat + zayıf profil ──
    for (const bid of sortedByPrice) {
      const tooCheap = bid.amount < average * 0.82;
      const weakProfile = bid.reliabilityScore > 0 && bid.reliabilityScore < 3;
      if (tooCheap && weakProfile) {
        suspicionLevel = this.maxSuspicion(suspicionLevel, 'MEDIUM');
        suspiciousNames.add(bid.supplierName);
        const pctBelow = Math.round(((average - bid.amount) / average) * 100);
        reasons.push(
          `${bid.supplierName} ortalama teklifin %${pctBelow} altında bir fiyat önermiş ve güvenilirlik skoru 3/10'un altındadır. ` +
          'Bu kombinasyon; sözleşme alıp yerine getiremeyen "phantom bid" davranışına veya piyasayı bozma amacına işaret edebilir.',
        );
      }
    }

    // ── Kural 3: IP adresi ve zaman örüntüleri ──
    this.assessHistoryPatterns(
      histories,
      nameMap,
      suspiciousNames,
      reasons,
      (level) => {
        suspicionLevel = this.maxSuspicion(suspicionLevel, level);
      },
    );

    if (reasons.length === 0) {
      return {
        suspicionLevel: 'NONE',
        suspiciousSuppliers: [],
        reasoning:
          `${bids.length} teklifin fiyat, zamanlama ve IP analizinde kayda değer bir kartel ya da fiyat anlaşması örüntüsü tespit edilmedi. ` +
          `Teklif fiyat aralığı %${spreadPct} olup rekabetçi bir dağılım sergileniyor.`,
      };
    }

    return {
      suspicionLevel,
      suspiciousSuppliers: Array.from(suspiciousNames),
      reasoning: reasons.join(' '),
    };
  }

  private assessHistoryPatterns(
    histories: BidHistoryForFraud[],
    nameMap: Map<string, string>,
    suspiciousNames: Set<string>,
    reasons: string[],
    elevate: (level: FraudSuspicionLevel) => void,
  ): void {
    if (histories.length < 3) {
      return;
    }

    // ── IP paylaşımı ──
    const byIp = new Map<string, Set<string>>();
    for (const history of histories) {
      if (!history.ipAddress) continue;
      const ids = byIp.get(history.ipAddress) ?? new Set<string>();
      ids.add(history.supplierId);
      byIp.set(history.ipAddress, ids);
    }

    for (const [ipAddress, ids] of byIp.entries()) {
      if (ids.size >= 2) {
        elevate('HIGH');
        const names = Array.from(ids).map(
          (id) => nameMap.get(id) ?? id,
        );
        names.forEach((name) => suspiciousNames.add(name));
        reasons.push(
          `${names.join(' ve ')} tedarikçilerinin teklifleri aynı IP adresinden (${ipAddress}) iletilmiştir. ` +
          'Bu durum söz konusu firmaların ortak bir altyapı veya yönetim altında hareket ettiğine dair çok güçlü bir kanıt niteliği taşımaktadır.',
        );
      }
    }

    // ── Çok hızlı sıralı çapraz teklifler ──
    const sorted = [...histories].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    let quickCount = 0;
    const quickPairs: string[] = [];

    sorted.forEach((history, index) => {
      const previous = sorted[index - 1];
      if (!previous || previous.supplierId === history.supplierId) return;
      const gapMs = history.createdAt.getTime() - previous.createdAt.getTime();
      if (gapMs < 20_000) {
        quickCount++;
        const nameA = nameMap.get(previous.supplierId) ?? previous.supplierId;
        const nameB = nameMap.get(history.supplierId) ?? history.supplierId;
        const pair = `${nameA} → ${nameB}`;
        if (!quickPairs.includes(pair)) quickPairs.push(pair);
        suspiciousNames.add(nameA);
        suspiciousNames.add(nameB);
      }
    });

    if (quickCount > 0) {
      elevate('MEDIUM');
      reasons.push(
        `${quickCount} adet farklı tedarikçi çifti teklifini 20 saniyeden kısa aralıklarla güncelledi (${quickPairs.slice(0, 3).join('; ')}). ` +
        'Bu hız insana özgü bağımsız tepki süreleriyle uyumsuz olup tekliflerin koordineli şekilde yönetildiğine işaret edebilir.',
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
