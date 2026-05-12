import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

// TODO: GeminiService, FraudService, SpecAssistantService, RagService provider ekle
// TODO: MongoDB modülü (Mongoose) ekle (raporlar için)
// TODO: DatabaseModule (PrismaService, supplier verileri için)

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
