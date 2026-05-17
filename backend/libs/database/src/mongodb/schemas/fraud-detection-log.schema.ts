import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FraudDetectionLogDocument = FraudDetectionLog & Document;

@Schema({ collection: 'fraud_detection_logs', timestamps: true })
export class FraudDetectionLog {
  @Prop({ required: true })
  auctionId: string;

  @Prop({ required: true })
  buyerId: string;

  @Prop({ required: true })
  bidCount: number;

  @Prop({ required: true })
  historyCount: number;

  @Prop({ type: Object, required: true })
  result: Record<string, unknown>;
}

export const FraudDetectionLogSchema =
  SchemaFactory.createForClass(FraudDetectionLog);
