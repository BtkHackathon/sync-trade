import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RagQueryLogDocument = RagQueryLog & Document;

@Schema({ collection: 'rag_query_logs', timestamps: true })
export class RagQueryLog {
  @Prop({ required: true })
  auctionId: string;

  @Prop({ required: true })
  query: string;

  @Prop({ type: [String], default: [] })
  supplierIds: string[];

  @Prop({ required: true })
  resultCount: number;

  @Prop({ type: [String], default: [] })
  context: string[];
}

export const RagQueryLogSchema = SchemaFactory.createForClass(RagQueryLog);
