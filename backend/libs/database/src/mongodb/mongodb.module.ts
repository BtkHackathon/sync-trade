import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AiReport, AiReportSchema } from './schemas/ai-report.schema';
import {
  SupplierEmbedding,
  SupplierEmbeddingSchema,
} from './schemas/supplier-embedding.schema';
import {
  DocumentParseLog,
  DocumentParseLogSchema,
} from './schemas/document-parse-log.schema';
import {
  FraudDetectionLog,
  FraudDetectionLogSchema,
} from './schemas/fraud-detection-log.schema';
import { RagQueryLog, RagQueryLogSchema } from './schemas/rag-query-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: AiReport.name, schema: AiReportSchema },
      { name: SupplierEmbedding.name, schema: SupplierEmbeddingSchema },
      { name: DocumentParseLog.name, schema: DocumentParseLogSchema },
      { name: FraudDetectionLog.name, schema: FraudDetectionLogSchema },
      { name: RagQueryLog.name, schema: RagQueryLogSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoDbModule {}
