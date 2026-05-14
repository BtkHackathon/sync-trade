import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsService } from '../src/auctions/auctions.service';
import { AuctionServiceModule } from '../src/auction-service.module';

/**
 * app.init() Prisma baglantisini acar (PostgreSQL gerekir).
 * CI / hizli smoke icin sadece modul derlemesi.
 */
describe('AuctionServiceModule (e2e)', () => {
  it('derlenir ve AuctionsService cozulebilir', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuctionServiceModule],
    }).compile();

    try {
      expect(moduleRef.get(AuctionsService)).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
