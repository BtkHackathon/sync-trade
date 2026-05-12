import { Injectable } from '@nestjs/common';

// TODO: create(buyerId, dto)    → yeni ihale kaydı oluştur, status=PENDING
// TODO: findAll(query)          → sayfalı liste, status/sector filtresi
// TODO: findOne(id)             → ihale + teklifler
// TODO: update(id, buyerId, dto)→ sadece sahibi güncelleyebilir
// TODO: cancel(id, buyerId)     → PENDING iken iptal, status=CANCELLED
// TODO: award(id, bidId, buyerId) → kazanan teklifi seç, status=AWARDED; Redis'e event yayınla
// TODO: closeExpired()          → cron job — süresi dolmuş ACTIVE ihaleleri CLOSED'a çeker

@Injectable()
export class AuctionsService {}
