import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { buildCorsOptions } from '@app/common';
import { NotificationServiceModule } from './notification-service.module';
import { RedisIoAdapter } from './redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  const config = app.get(ConfigService);
  const logger = new Logger('NotificationService');
  const redisIoAdapter = new RedisIoAdapter(app);

  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
  app.enableCors(buildCorsOptions(config));
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

  logger.log('Notification service calisiyor');
  logger.log(`ws://localhost:${port}/auctions`);
  logger.log(`http://localhost:${port}/api/docs`);
}

void bootstrap();
