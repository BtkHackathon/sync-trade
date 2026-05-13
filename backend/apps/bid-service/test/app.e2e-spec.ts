import { Test, TestingModule } from '@nestjs/testing';
import { BidsService } from '../src/bids/bids.service';
import { BidServiceModule } from '../src/bid-service.module';

describe('BidServiceModule (e2e)', () => {
  it('derlenir ve BidsService cozulebilir', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [BidServiceModule],
    }).compile();

    try {
      expect(moduleRef.get(BidsService)).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
