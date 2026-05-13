import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule, JwtStrategy } from '@app/common';
import { PrismaModule } from '@app/database';
import { EventsModule } from '@app/events';
import { BidsModule } from './bids/bids.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    EventsModule,
    ScheduleModule.forRoot(),
    BidsModule,
  ],
  providers: [JwtStrategy],
})
export class BidServiceModule {}
