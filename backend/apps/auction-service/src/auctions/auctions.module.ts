import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';

// TODO: DatabaseModule import et (PrismaService için)
// TODO: @nestjs/schedule ScheduleModule.forRoot() ekle (cron job için)
// TODO: Redis modülü ekle (event yayını için)

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
