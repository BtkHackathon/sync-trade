import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentParseLogDocument = DocumentParseLog & Document;

@Schema({ collection: 'document_parse_logs', timestamps: true })
export class DocumentParseLog {
  @Prop({ required: true })
  buyerId: string;

  @Prop()
  auctionId?: string;

  @Prop({ required: true })
  sourceType: 'TEXT' | 'PDF' | 'FILE';

  @Prop()
  fileName?: string;

  @Prop()
  mimeType?: string;

  @Prop({ required: true })
  textLength: number;

  @Prop({ type: Object, required: true })
  extractedFields: Record<string, unknown>;
}

export const DocumentParseLogSchema =
  SchemaFactory.createForClass(DocumentParseLog);
