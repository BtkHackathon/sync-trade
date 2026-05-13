import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule, JwtStrategy } from '@app/common';
import { PrismaModule } from '@app/database';
import { EventsModule } from '@app/events';
import { AuctionsModule } from './auctions/auctions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    EventsModule,
    ScheduleModule.forRoot(),
    AuctionsModule,
  ],
  providers: [JwtStrategy],
})
export class AuctionServiceModule {}
