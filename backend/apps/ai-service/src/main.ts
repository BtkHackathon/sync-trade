import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AiServiceModule } from './ai-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AiServiceModule);
  const config = app.get(ConfigService);
  const logger = new Logger('AiService');

  app.setGlobalPrefix('api');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SyncTrade — AI Service')
    .setDescription('Gemini AI analiz, şartname asistanı ve fraud detection')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('AI_SERVICE_PORT', 3004);
  await app.listen(port);

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`  🤖  AI SERVICE çalışıyor`);
  logger.log(`  📡  http://localhost:${port}/api`);
  logger.log(`  📖  http://localhost:${port}/api/docs  (Swagger UI)`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

bootstrap();
