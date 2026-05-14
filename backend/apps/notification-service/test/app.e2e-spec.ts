import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceModule } from './../src/notification-service.module';

describe('NotificationServiceModule (e2e)', () => {
  it('derlenir ve temiz kapanir', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [NotificationServiceModule],
    }).compile();

    try {
      expect(moduleRef).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
