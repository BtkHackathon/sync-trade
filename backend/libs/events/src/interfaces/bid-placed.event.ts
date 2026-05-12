export interface BidPlacedEvent {
  bidId: string;
  auctionId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  previousLowestAmount: number | null;
  isNewLowest: boolean;
  totalBidCount: number;
  timestamp: string;
}
