import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { buildCorsOptions } from '@app/common';
import { AuctionServiceModule } from './auction-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AuctionServiceModule);
  const config = app.get(ConfigService);
  const logger = new Logger('AuctionService');

  app.setGlobalPrefix('api');
  app.enableCors(buildCorsOptions(config));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SyncTrade — Auction Service')
    .setDescription('İhale oluşturma, yönetme ve kapanış mekanizması')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('AUCTION_SERVICE_PORT', 3002);
  await app.listen(port);

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`  🏷️   AUCTION SERVICE çalışıyor`);
  logger.log(`  📡  http://localhost:${port}/api`);
  logger.log(`  📖  http://localhost:${port}/api/docs  (Swagger UI)`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

void bootstrap();
