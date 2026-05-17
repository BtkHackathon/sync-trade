import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '@app/database';
import { AuctionGateway } from './gateways/auction.gateway';
import { RedisEventsBridge } from './redis-events.bridge';
import { NotificationServiceController } from './notification-service.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [NotificationServiceController],
  providers: [AuctionGateway, RedisEventsBridge],
})
export class NotificationServiceModule {}
