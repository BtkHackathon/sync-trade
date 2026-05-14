export interface BidWithdrawnEvent {
  bidId: string;
  auctionId: string;
  supplierId: string;
  supplierName: string;
  withdrawnAt: string;
  lowestBidAmount: number | null;
  activeBidCount: number;
}
