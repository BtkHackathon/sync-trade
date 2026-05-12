import { Test, TestingModule } from '@nestjs/testing';
import { AuctionServiceController } from './auction-service.controller';
import { AuctionServiceService } from './auction-service.service';

describe('AuctionServiceController', () => {
  let auctionServiceController: AuctionServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuctionServiceController],
      providers: [AuctionServiceService],
    }).compile();

    auctionServiceController = app.get<AuctionServiceController>(AuctionServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(auctionServiceController.getHello()).toBe('Hello World!');
    });
  });
});
