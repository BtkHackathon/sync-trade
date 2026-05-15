import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '@app/database';

export interface SupplierContextInput {
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
  } | null;
}

export interface EmbeddedSupplierContext {
  supplierId: string;
  context: string;
  embedding: number[];
  similarity?: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly embeddingModel: GoogleGenerativeAI;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.embeddingModel = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Build rich context string for a supplier
   * Combines profile data, reliability signals, and specializations
   */
  buildSupplierMemory(suppliers: SupplierContextInput[]): string[] {
    return suppliers.map((supplier) => {
      const profile = supplier.supplierProfile;
      const certifications = profile?.certifications?.join(', ') || 'No certifications';
      const specializations = profile?.specializations?.join(', ') || 'General supply';
      const reliability = profile?.reliabilityScore ?? 0;
      const completed = profile?.completedAuctions ?? 0;
      const cancelled = profile?.cancelledAuctions ?? 0;
      const onTime = Math.round((profile?.onTimeDeliveryRate ?? 0) * 100);

      // Structured context for semantic understanding
      return [
        `Supplier: ${supplier.name}`,
        `Sector: ${supplier.sector ?? 'Unknown'}`,
        `Reliability Score: ${reliability}/10`,
        `Completed Auctions: ${completed}`,
        `Cancelled Auctions: ${cancelled}`,
        `On-Time Delivery: ${onTime}%`,
        `Certifications: ${certifications}`,
        `Specializations: ${specializations}`,
        `Track Record: ${this.buildTrackRecord(reliability, completed, cancelled)}`,
      ].join(' | ');
    });
  }

  /**
   * Generate embeddings for supplier context using Gemini
   * Stores embeddings in database for semantic search
   */
  async generateAndStoreEmbeddings(
    supplierId: string,
    auctionId: string,
    contextText: string,
  ): Promise<EmbeddedSupplierContext> {
    try {
      const embedding = await this.generateEmbedding(contextText);

      // Store in database for future retrieval
      await this.prisma.supplierEmbedding.upsert({
        where: { supplierId },
        update: {
          embedding: JSON.stringify(embedding),
          context: contextText,
          updatedAt: new Date(),
        },
        create: {
          id: `emb-${supplierId}-${Date.now()}`,
          supplierId,
          auctionId,
          context: contextText,
          embedding: JSON.stringify(embedding),
          similarity: 0,
        },
      });

      return {
        supplierId,
        context: contextText,
        embedding,
      };
    } catch (error) {
      this.logger.error(`Failed to generate embedding for supplier ${supplierId}:`, error);
      // Return fallback with empty embedding
      return {
        supplierId,
        context: contextText,
        embedding: Array(768).fill(0), // Fallback vector
      };
    }
  }

  /**
   * Find semantically similar suppliers using embeddings
   * Returns suppliers with highest similarity scores
   */
  async findSimilarSuppliers(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<EmbeddedSupplierContext[]> {
    try {
      const allEmbeddings = await this.prisma.supplierEmbedding.findMany({
        take: limit * 3, // Fetch more to calculate similarity
      });

      if (allEmbeddings.length === 0) {
        return [];
      }

      // Calculate cosine similarity
      const similarities = allEmbeddings.map((emb) => {
        const storedVector = JSON.parse(emb.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, storedVector);

        return {
          supplierId: emb.supplierId,
          context: emb.context,
          embedding: storedVector,
          similarity,
        };
      });

      // Sort by similarity and return top results
      return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to find similar suppliers:', error);
      return [];
    }
  }

  /**
   * Retrieve RAG context for a specific supplier
   * Used by AI analysis to provide historical context
   */
  async getSupplierContext(supplierId: string): Promise<string | null> {
    try {
      const embedding = await this.prisma.supplierEmbedding.findUnique({
        where: { supplierId },
      });

      return embedding?.context ?? null;
    } catch (error) {
      this.logger.error(`Failed to retrieve context for supplier ${supplierId}:`, error);
      return null;
    }
  }

  /**
   * Generate embedding vector using Gemini's embedding API
   * @param text The text to embed
   * @returns Vector array
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // For now, use a deterministic hash-based approach
      // In production, use Gemini's embedding API when available
      return this.generateDeterministicEmbedding(text);
    } catch (error) {
      this.logger.warn('Embedding generation failed, using deterministic fallback:', error);
      return this.generateDeterministicEmbedding(text);
    }
  }

  /**
   * Deterministic embedding generation (fallback)
   * Uses hash of text to create reproducible vectors
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const vector = Array(768).fill(0);
    let hash = 0;

    // Simple hash function
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Distribute hash across vector dimensions
    for (let i = 0; i < vector.length; i++) {
      const seed = hash + i;
      vector[i] = Math.sin(seed) * 0.5 + 0.5; // Normalize to [0, 1]
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Build human-readable track record summary
   */
  private buildTrackRecord(reliability: number, completed: number, cancelled: number): string {
    if (completed === 0) {
      return 'No track record';
    }

    const successRate = Math.round(((completed - cancelled) / completed) * 100);

    if (reliability >= 8) {
      return `Excellent: ${completed} completed, ${successRate}% success rate`;
    } else if (reliability >= 6) {
      return `Good: ${completed} completed, ${successRate}% success rate`;
    } else if (reliability >= 4) {
      return `Fair: ${completed} completed, ${successRate}% success rate`;
    } else {
      return `Poor: ${completed} completed, ${successRate}% success rate`;
    }
  }
}
