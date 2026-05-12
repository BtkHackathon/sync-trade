import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupplierEmbeddingDocument = SupplierEmbedding & Document;

@Schema({ collection: 'supplier_embeddings', timestamps: true })
export class SupplierEmbedding {
  @Prop({ required: true, index: true })
  supplierId: string;

  @Prop({ required: true })
  supplierName: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];

  @Prop({ required: true })
  contentType: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SupplierEmbeddingSchema = SchemaFactory.createForClass(SupplierEmbedding);
