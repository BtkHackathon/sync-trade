import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// TODO: JWT guard ekle (@UseGuards(JwtAuthGuard))
// TODO: POST /bids              → teklif ver (sadece SUPPLIER, sadece ACTIVE ihale)
// TODO: GET  /bids/auction/:id  → bir ihalenin teklifleri (sadece BUYER ihale sahibi görebilir)
// TODO: GET  /bids/my           → kendi tekliflerimi listele (SUPPLIER)
// TODO: DELETE /bids/:id        → teklif geri çek (sadece kendi teklifi, ihale ACTIVE iken)

@ApiTags('Bids')
@Controller('bids')
export class BidsController {}
