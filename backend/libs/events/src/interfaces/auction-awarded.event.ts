export interface AuctionAwardedEvent {
  auctionId: string;
  buyerId: string;
  bidId: string;
  supplierId: string;
  winningAmount: number;
  awardedAt: string;
}
