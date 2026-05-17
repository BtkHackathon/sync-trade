import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule, JwtStrategy } from '@app/common';
import { AnalysisModule } from './analysis/analysis.module';
import { AuctionListenerService } from './listener/auction-listener.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    CommonModule,
    AnalysisModule,
  ],
  providers: [JwtStrategy, AuctionListenerService],
})
export class AiServiceModule {}
