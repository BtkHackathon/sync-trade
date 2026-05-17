import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisController } from '../src/analysis/analysis.controller';
import { AnalysisService } from '../src/analysis/analysis.service';

describe('AiService HTTP contract', () => {
  it('wires the analysis controller without external databases', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [
        {
          provide: AnalysisService,
          useValue: {
            analyzeClosedAuction: jest.fn(),
            detectFraud: jest.fn(),
            analyzeSupplier: jest.fn(),
            analyzeSpec: jest.fn(),
            getReport: jest.fn(),
          },
        },
      ],
    }).compile();

    try {
      expect(moduleRef.get(AnalysisController)).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
