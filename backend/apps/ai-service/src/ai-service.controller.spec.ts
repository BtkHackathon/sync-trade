import { Test, TestingModule } from '@nestjs/testing';
import { AiServiceController } from './ai-service.controller';

describe('AiServiceController', () => {
  let controller: AiServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AiServiceController],
    }).compile();

    controller = app.get(AiServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
