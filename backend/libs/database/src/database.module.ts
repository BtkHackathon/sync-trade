import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Sadece PostgreSQL (Prisma) bağlantısı sağlar.
 * MongoDB'ye ihtiyaç duyan servisler MongoDbModule'ü ayrıca import etmeli.
 * Örnek: AI Service → import { MongoDbModule } from '@app/database'
 */
@Module({
  imports: [PrismaModule],
  exports: [PrismaModule],
})
export class DatabaseModule {}
