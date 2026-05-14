import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NotificationServiceModule } from './notification-service.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  const config = app.get(ConfigService);
  const logger = new Logger('NotificationService');

  app.enableCors({ origin: '*' });

  const port = config.get<number>('NOTIFICATION_SERVICE_PORT', 3005);
  await app.listen(port);

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`  🔔  NOTIFICATION SERVICE çalışıyor`);
  logger.log(`  🔌  ws://localhost:${port}/auctions  (WebSocket)`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

bootstrap();
