import { Injectable } from '@nestjs/common';

// TODO: analyzeSupplier(supplierId)
//   → Prisma'dan supplier verisi çek (geçmiş ihaleler, skor, teslimat oranı)
//   → GeminiService ile risk raporu üret
//   → Raporu MongoDB'ye kaydet

// TODO: analyzeSpec(fileBuffer, mimeType)
//   → pdf-parse ile metni çıkar
//   → GeminiService ile yapılandırılmış teknik gereksinimler üret (JSON)

// TODO: detectFraud(auctionId)
//   → İhale tekliflerini çek (fiyat, zaman, supplier)
//   → GeminiService ile kartel örüntüsü analizi yap
//   → Şüpheli ise uyarı raporu üret + MongoDB'ye kaydet

@Injectable()
export class AnalysisService {}
