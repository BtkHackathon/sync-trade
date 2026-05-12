import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

// TODO: DatabaseModule import et (PrismaService için)
// TODO: Redis modülü ekle (distributed lock + Pub/Sub için)

@Module({
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
