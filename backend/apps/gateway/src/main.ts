import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Gateway');

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SyncTrade API Gateway')
    .setDescription(
      '## B2B AI-Destekli Tersine Açık Artırma Platformu\n\n' +
        '**Auth:** `POST /api/auth/register` veya `POST /api/auth/login` ile JWT al, ' +
        'sağ üstteki `Authorize` butonuna yapıştır.\n\n' +
        '**WebSocket (Canlı İhale):** `ws://localhost:3005/auctions`\n\n' +
        '**Servisler:** Auth:3001 | Auction:3002 | Bid:3003 | AI:3004 | WS:3005',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('GATEWAY_PORT', 3000);
  await app.listen(port);

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`  🌐  GATEWAY çalışıyor`);
  logger.log(`  📡  http://localhost:${port}/api`);
  logger.log(`  📖  http://localhost:${port}/api/docs  (Swagger UI)`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

bootstrap();
