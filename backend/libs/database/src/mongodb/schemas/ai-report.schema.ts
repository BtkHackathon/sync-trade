import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiReportDocument = AiReport & Document;

@Schema({ collection: 'ai_reports', timestamps: true })
export class AiReport {
  @Prop({ required: true })
  auctionId: string;

  @Prop({ required: true })
  buyerId: string;

  @Prop({ type: Object, required: true })
  analysisResult: {
    summary: string;
    lowestBid: {
      supplierId: string;
      supplierName: string;
      amount: number;
    };
    recommendedBid: {
      supplierId: string;
      supplierName: string;
      amount: number;
      reason: string;
    };
    supplierRankings: Array<{
      rank: number;
      supplierId: string;
      supplierName: string;
      bidAmount: number;
      reliabilityScore: number;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      strengths: string[];
      risks: string[];
      aiScore: number;
    }>;
    fraudDetection: {
      suspicionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
      suspiciousSuppliers: string[];
      reasoning: string;
    };
    marketInsights: string;
    finalRecommendation: string;
  };

  @Prop({ type: [String], default: [] })
  ragContextUsed: string[];

  @Prop({ default: 'gemini-2.5-flash' })
  modelUsed: string;

  @Prop({ required: true })
  processingTimeMs: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AiReportSchema = SchemaFactory.createForClass(AiReport);
