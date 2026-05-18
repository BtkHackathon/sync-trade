import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NotificationServiceModule } from './notification-service.module';

function corsOrigins(config: ConfigService): string[] {
  const raw = config.get<string>('CORS_ORIGINS', '');
  const parsed = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return parsed.length > 0
    ? parsed
    : [
        'http://localhost:4000',
        'http://localhost:3000',
        'http://localhost:5173',
      ];
}

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  const config = app.get(ConfigService);
  const logger = new Logger('NotificationService');

  app.enableCors({ origin: corsOrigins(config), credentials: true });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SyncTrade — Notification Service')
    .setDescription('WebSocket hub and notification contract for auctions')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('NOTIFICATION_SERVICE_PORT', 3005);
  await app.listen(port);

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`  🔔  NOTIFICATION SERVICE çalışıyor`);
  logger.log(`  🔌  ws://localhost:${port}/auctions  (WebSocket)`);
  logger.log(`  📖  http://localhost:${port}/api/docs  (Swagger UI)`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

void bootstrap();
