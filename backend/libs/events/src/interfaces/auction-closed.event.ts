export interface AuctionClosedEvent {
  auctionId: string;
  buyerId: string;
  title: string;
  totalBids: number;
  lowestBidAmount: number | null;
  closedAt: string;
}
