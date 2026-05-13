export interface AuctionOpenedEvent {
  auctionId: string;
  buyerId: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  maxBudget: number;
  endsAt: string;
  openedAt: string;
}
