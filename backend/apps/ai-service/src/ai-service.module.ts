import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisModule } from './analysis/analysis.module';

// TODO: DatabaseModule ekle
// TODO: CommonModule ekle (JwtStrategy, guards için)
// TODO: MongooseModule.forRootAsync() ekle (MONGODB_URI env)
// TODO: AuctionListenerService provider ekle (Redis listener)
// TODO: MulterModule ekle (dosya yükleme için)

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AnalysisModule,
  ],
})
export class AiServiceModule {}
