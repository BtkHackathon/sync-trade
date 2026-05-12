import { Injectable } from '@nestjs/common';

// TODO: Redis Pub/Sub'a abone ol: 'auction.closed' kanalı
// TODO: Mesaj geldiğinde → detectFraud(auctionId) tetikle (otomatik analiz)
// TODO: onModuleInit() içinde subscribe başlat

@Injectable()
export class AuctionListenerService {}
