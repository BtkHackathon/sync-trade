import { Injectable } from '@nestjs/common';

// TODO: buildFraudPrompt(bids) → teklifleri prompt'a çevir (fiyat, zaman, supplier adı)
// TODO: parseFraudResponse(text) → Gemini çıktısını { isSuspicious, reasons[], riskScore } şekline çevir
// TODO: saveFraudReport(auctionId, result) → MongoDB'ye kaydet

@Injectable()
export class FraudService {}
