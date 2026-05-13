import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/database';
import { EventsService } from './events.service';
import { EventOutboxService } from './event-outbox.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EventsService, EventOutboxService],
  exports: [EventsService, EventOutboxService],
})
export class EventsModule {}
