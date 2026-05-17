-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create SupplierEmbedding table for RAG/semantic search
CREATE TABLE "supplier_embeddings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplier_id" TEXT NOT NULL UNIQUE,
  "auction_id" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "embedding" TEXT NOT NULL,
  "similarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "supplier_embeddings_supplier_id_fkey"
    FOREIGN KEY ("supplier_id")
    REFERENCES "companies" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  
  CONSTRAINT "supplier_embeddings_auction_id_fkey"
    FOREIGN KEY ("auction_id")
    REFERENCES "auctions" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX "supplier_embeddings_supplier_id_idx" ON "supplier_embeddings" ("supplier_id");
CREATE INDEX "supplier_embeddings_auction_id_idx" ON "supplier_embeddings" ("auction_id");
