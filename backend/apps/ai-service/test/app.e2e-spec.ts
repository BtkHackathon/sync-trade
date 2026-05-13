import { Test, TestingModule } from '@nestjs/testing';
import { AiServiceModule } from './../src/ai-service.module';

describe('AiServiceModule (e2e)', () => {
  it('derlenir ve temiz kapanir', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AiServiceModule],
    }).compile();

    try {
      expect(moduleRef).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
