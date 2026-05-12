import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// TODO: JWT guard ekle (@UseGuards(JwtAuthGuard))
// TODO: POST   /auctions          → ihale oluştur (sadece BUYER)
// TODO: GET    /auctions          → ihaleleri listele (filtreleme: status, sector, page, limit)
// TODO: GET    /auctions/:id      → ihale detayı (teklifler dahil)
// TODO: PATCH  /auctions/:id      → ihale güncelle (sadece sahibi BUYER)
// TODO: DELETE /auctions/:id      → ihale iptal et (sadece sahibi BUYER, PENDING iken)
// TODO: POST   /auctions/:id/award/:bidId → teklif kabul et (ihaleyi kapat)

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionsController {}
