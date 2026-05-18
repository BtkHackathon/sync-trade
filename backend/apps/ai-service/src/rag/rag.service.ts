import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { GeminiService } from '../gemini/gemini.service';

type SupplierContextInput = {
  id: string;
  name: string;
  sector?: string | null;
  supplierProfile?: {
    reliabilityScore?: number | null;
    completedAuctions?: number | null;
    cancelledAuctions?: number | null;
    onTimeDeliveryRate?: number | null;
    certifications?: string[] | null;
    specializations?: string[] | null;
    capacity?: string | null;
  } | null;
};

export interface SupplierMemoryRecord {
  supplierId: string;
  auctionId: string;
  context: string;
  similarity: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly dimensions = 768;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  buildSupplierMemory(suppliers: SupplierContextInput[]): string[] {
    return suppliers.map((supplier) => this.buildSupplierContext(supplier));
  }

  async upsertSupplierMemory(args: {
    supplier: SupplierContextInput;
    auctionId: string;
    context?: string;
  }): Promise<void> {
    const context = args.context ?? this.buildSupplierContext(args.supplier);

    // Önce Gemini embedding dene, API key yoksa deterministik fallback kullan
    const geminiEmbedding = await this.gemini.generateEmbedding(context);
    const embedding = this.toVectorLiteral(
      geminiEmbedding ?? this.generateDeterministicEmbedding(context),
    );
    const id = randomUUID();

    try {
      await this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO supplier_embeddings (
            id,
            supplier_id,
            auction_id,
            context,
            embedding,
            similarity,
            created_at,
            updated_at
          )
          VALUES (
            ${id},
            ${args.supplier.id},
            ${args.auctionId},
            ${context},
            ${embedding}::vector,
            0,
            NOW(),
            NOW()
          )
          ON CONFLICT (supplier_id, auction_id)
          DO UPDATE SET
            context = EXCLUDED.context,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
        `,
      );
    } catch (error) {
      this.logger.warn(
        `Could not persist supplier RAG memory: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findRelevantSupplierMemories(args: {
    query: string;
    supplierIds: string[];
    limit?: number;
  }): Promise<string[]> {
    if (args.supplierIds.length === 0) {
      return [];
    }

    const geminiQueryEmbedding = await this.gemini.generateEmbedding(args.query);
    const queryVector = this.toVectorLiteral(
      geminiQueryEmbedding ?? this.generateDeterministicEmbedding(args.query),
    );
    const limit = args.limit ?? 8;

    try {
      const rows = await this.prisma.$queryRaw<SupplierMemoryRecord[]>(
        Prisma.sql`
          SELECT
            supplier_id AS "supplierId",
            auction_id AS "auctionId",
            context,
            (1 - (embedding <=> ${queryVector}::vector))::float8 AS similarity
          FROM supplier_embeddings
          WHERE supplier_id IN (${Prisma.join(args.supplierIds)})
          ORDER BY embedding <=> ${queryVector}::vector
          LIMIT ${limit}
        `,
      );

      return rows.map(
        (row) =>
          `[similarity=${Number(row.similarity).toFixed(3)} auction=${row.auctionId}] ${
            row.context
          }`,
      );
    } catch (error) {
      this.logger.warn(
        `Could not retrieve vector RAG context: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private buildSupplierContext(supplier: SupplierContextInput): string {
    const profile = supplier.supplierProfile;
    const certifications =
      profile?.certifications?.join(', ') || 'no certifications';
    const specializations =
      profile?.specializations?.join(', ') || 'general supply';
    const reliability = profile?.reliabilityScore ?? 0;
    const completed = profile?.completedAuctions ?? 0;
    const cancelled = profile?.cancelledAuctions ?? 0;
    const onTime = Math.round((profile?.onTimeDeliveryRate ?? 0) * 100);

    return [
      `supplier=${supplier.name}`,
      `sector=${supplier.sector ?? 'unknown'}`,
      `reliability=${reliability}/10`,
      `completed=${completed}`,
      `cancelled=${cancelled}`,
      `on_time=${onTime}%`,
      `certifications=${certifications}`,
      `specializations=${specializations}`,
      `capacity=${profile?.capacity ?? 'unknown'}`,
    ].join('; ');
  }

  private generateDeterministicEmbedding(text: string): number[] {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const vector = Array(this.dimensions).fill(0) as number[];

    for (const token of tokens) {
      const hash = this.hashToken(token);
      const index = Math.abs(hash) % this.dimensions;
      vector[index] += 1;
    }

    const magnitude = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    if (magnitude === 0) {
      vector[0] = 1;
      return vector;
    }

    return vector.map((value) => value / magnitude);
  }

  private hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private toVectorLiteral(values: number[]): string {
    return `[${values.map((value) => value.toFixed(6)).join(',')}]`;
  }
}
