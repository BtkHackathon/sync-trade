import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@app/common';
import { HealthController } from './health/health.controller';
import { ProxyService } from './proxy.service';
import { GatewayJwtAuthGuard } from './gateway-auth.guard';
import {
  AiProxyController,
  AuctionsProxyController,
  AuthProxyController,
  BidsProxyController,
  CompaniesProxyController,
} from './proxy.controllers';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ timeout: 30_000, maxRedirects: 0 }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    HealthController,
    AuthProxyController,
    CompaniesProxyController,
    AuctionsProxyController,
    BidsProxyController,
    AiProxyController,
  ],
  providers: [
    ProxyService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: GatewayJwtAuthGuard },
  ],
})
export class GatewayModule {}
