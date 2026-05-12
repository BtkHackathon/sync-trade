import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// TODO: HttpModule / @nestjs/axios ile servis URL'lerini ayarla
// TODO: JwtAuthGuard global guard olarak ekle (APP_GUARD)
// TODO: ProxyService provider ekle
// TODO: Her servis için ayrı controller ekle:
//   → AuthProxyController   (AUTH_SERVICE_URL)
//   → AuctionProxyController (AUCTION_SERVICE_URL)
//   → BidProxyController    (BID_SERVICE_URL)
//   → AiProxyController     (AI_SERVICE_URL)

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class GatewayModule {}
