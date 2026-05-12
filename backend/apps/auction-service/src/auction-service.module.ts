import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuctionsModule } from './auctions/auctions.module';

// TODO: DatabaseModule ekle
// TODO: CommonModule ekle (JwtStrategy, guards için)
// TODO: ScheduleModule.forRoot() ekle

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuctionsModule,
  ],
})
export class AuctionServiceModule {}
