-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('BUYER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'AWARDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AwardStatus" AS ENUM ('PENDING_DELIVERY', 'DELIVERED', 'DISPUTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "sector" TEXT,
    "tax_id" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'TR',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_profiles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "certifications" TEXT[],
    "specializations" TEXT[],
    "description" TEXT,
    "reliability_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_bids" INTEGER NOT NULL DEFAULT 0,
    "completed_auctions" INTEGER NOT NULL DEFAULT 0,
    "cancelled_auctions" INTEGER NOT NULL DEFAULT 0,
    "avg_delivery_days" INTEGER,
    "on_time_delivery_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "max_budget" DECIMAL(15,2) NOT NULL,
    "delivery_address" TEXT,
    "delivery_deadline" TIMESTAMP(3) NOT NULL,
    "requirements" TEXT[],
    "status" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "ends_at" TIMESTAMP(3) NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "spec_document_url" TEXT,
    "ai_report_id" TEXT,
    "lowest_bid_amount" DECIMAL(15,2),
    "bid_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'ACTIVE',
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awarded_bids" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "bid_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "AwardStatus" NOT NULL DEFAULT 'PENDING_DELIVERY',
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "awarded_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "auction_id" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_profiles_company_id_key" ON "supplier_profiles"("company_id");

-- CreateIndex
CREATE INDEX "auctions_status_ends_at_idx" ON "auctions"("status", "ends_at");

-- CreateIndex
CREATE INDEX "auctions_buyer_id_idx" ON "auctions"("buyer_id");

-- CreateIndex
CREATE INDEX "bids_auction_id_amount_idx" ON "bids"("auction_id", "amount");

-- CreateIndex
CREATE UNIQUE INDEX "bids_auction_id_supplier_id_key" ON "bids"("auction_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "awarded_bids_auction_id_key" ON "awarded_bids"("auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "awarded_bids_bid_id_key" ON "awarded_bids"("bid_id");

-- AddForeignKey
ALTER TABLE "supplier_profiles" ADD CONSTRAINT "supplier_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awarded_bids" ADD CONSTRAINT "awarded_bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awarded_bids" ADD CONSTRAINT "awarded_bids_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
