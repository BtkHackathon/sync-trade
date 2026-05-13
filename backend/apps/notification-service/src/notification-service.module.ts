import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuctionGateway } from './gateways/auction.gateway';
import { RedisEventsBridge } from './redis-events.bridge';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AuctionGateway, RedisEventsBridge],
})
export class NotificationServiceModule {}
