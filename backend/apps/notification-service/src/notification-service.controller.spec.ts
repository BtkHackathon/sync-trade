import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceController } from './notification-service.controller';

describe('NotificationServiceController', () => {
  let controller: NotificationServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationServiceController],
    }).compile();

    controller = app.get(NotificationServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
