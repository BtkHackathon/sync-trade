import { Test, TestingModule } from '@nestjs/testing';
import { AuthServiceModule } from './../src/auth-service.module';

describe('AuthServiceModule (e2e)', () => {
  it('derlenir ve temiz kapanir', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthServiceModule],
    }).compile();

    try {
      expect(moduleRef).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
