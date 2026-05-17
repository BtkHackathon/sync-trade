import { Module } from '@nestjs/common';
import { DatabaseModule, MongoDbModule } from '@app/database';
import { EventsModule } from '@app/events';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { GeminiService } from '../gemini/gemini.service';
import { FraudService } from '../fraud/fraud.service';
import { RagService } from '../rag/rag.service';
import { SpecAssistantService } from '../spec-assistant/spec-assistant.service';

@Module({
  imports: [DatabaseModule, MongoDbModule, EventsModule],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    GeminiService,
    FraudService,
    RagService,
    SpecAssistantService,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
