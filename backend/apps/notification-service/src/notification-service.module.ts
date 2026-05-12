import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// TODO: AuctionGateway provider ekle
// TODO: Redis bağlantısı ekle (@socket.io/redis-adapter için)
// TODO: CommonModule ekle (JWT doğrulama için)

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class NotificationServiceModule {}
