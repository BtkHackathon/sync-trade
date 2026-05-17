-- Add immutable bid history for fraud and audit analysis.
CREATE TYPE "BidHistoryAction" AS ENUM ('PLACED', 'UPDATED', 'WITHDRAWN');

CREATE TABLE "bid_history" (
  "id" TEXT NOT NULL,
  "auction_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "bid_id" TEXT,
  "amount" DECIMAL(15,2) NOT NULL,
  "previous_amount" DECIMAL(15,2),
  "action" "BidHistoryAction" NOT NULL,
  "note" TEXT,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bid_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bid_history_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bid_history_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bid_history_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "bid_history_auction_id_created_at_idx" ON "bid_history"("auction_id", "created_at");
CREATE INDEX "bid_history_supplier_id_created_at_idx" ON "bid_history"("supplier_id", "created_at");
CREATE INDEX "bid_history_auction_id_supplier_id_created_at_idx" ON "bid_history"("auction_id", "supplier_id", "created_at");

-- Convert supplier embeddings from JSON text storage to real pgvector storage.
DROP INDEX IF EXISTS "supplier_embeddings_supplier_id_idx";
ALTER TABLE "supplier_embeddings" DROP CONSTRAINT IF EXISTS "supplier_embeddings_supplier_id_key";
ALTER TABLE "supplier_embeddings" ALTER COLUMN "embedding" TYPE vector(768) USING "embedding"::vector;
ALTER TABLE "supplier_embeddings" ADD CONSTRAINT "supplier_embeddings_supplier_id_auction_id_key" UNIQUE ("supplier_id", "auction_id");
CREATE INDEX IF NOT EXISTS "supplier_embeddings_supplier_id_idx" ON "supplier_embeddings" ("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_embeddings_auction_id_idx" ON "supplier_embeddings" ("auction_id");
CREATE INDEX IF NOT EXISTS "supplier_embeddings_embedding_ivfflat_idx" ON "supplier_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);