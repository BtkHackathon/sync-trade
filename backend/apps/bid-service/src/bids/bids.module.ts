import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { BidLockService } from './bid-lock.service';

@Module({
  controllers: [BidsController],
  providers: [BidsService, BidLockService],
})
export class BidsModule {}
