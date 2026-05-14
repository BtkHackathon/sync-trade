import { Test, TestingModule } from '@nestjs/testing';
import { BidServiceController } from './bid-service.controller';

/** Root controller is reserved; HTTP surface lives under bids/. */
describe('BidServiceController', () => {
  let controller: BidServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BidServiceController],
    }).compile();

    controller = app.get(BidServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
