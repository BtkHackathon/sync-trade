import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BidsModule } from './bids/bids.module';

// TODO: DatabaseModule ekle
// TODO: CommonModule ekle (JwtStrategy, guards için)
// TODO: Redis bağlantısı ekle

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BidsModule,
  ],
})
export class BidServiceModule {}
