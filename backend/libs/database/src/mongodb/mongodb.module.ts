import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AiReport, AiReportSchema } from './schemas/ai-report.schema';
import { SupplierEmbedding, SupplierEmbeddingSchema } from './schemas/supplier-embedding.schema';

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
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoDbModule {}
