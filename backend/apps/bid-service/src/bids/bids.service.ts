import { Injectable } from '@nestjs/common';

// TODO: placeBid(supplierId, dto)
//   → Redis distributed lock al (auction:lock:{auctionId})
//   → İhale ACTIVE mi? Kontrol et
//   → Aynı supplier'ın aktif teklifi var mı? Güncelle ya da yeni oluştur
//   → DB'ye kaydet, lock'u bırak
//   → Redis Pub/Sub'a 'bid.placed' eventi yayınla (Socket.io için)
// TODO: findByAuction(auctionId, requesterId) → sadece ihale sahibi görebilir
// TODO: findMy(supplierId)                    → kendi tekliflerini getir
// TODO: withdraw(bidId, supplierId)            → teklif geri çek

@Injectable()
export class BidsService {}
