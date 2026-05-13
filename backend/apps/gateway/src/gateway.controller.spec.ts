import { Test, TestingModule } from '@nestjs/testing';
import { GatewayController } from './gateway.controller';

describe('GatewayController', () => {
  let controller: GatewayController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
    }).compile();

    controller = app.get(GatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
