import { Test, TestingModule } from '@nestjs/testing';
import { BidServiceController } from './bid-service.controller';
import { BidServiceService } from './bid-service.service';

describe('BidServiceController', () => {
  let bidServiceController: BidServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BidServiceController],
      providers: [BidServiceService],
    }).compile();

    bidServiceController = app.get<BidServiceController>(BidServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(bidServiceController.getHello()).toBe('Hello World!');
    });
  });
});
