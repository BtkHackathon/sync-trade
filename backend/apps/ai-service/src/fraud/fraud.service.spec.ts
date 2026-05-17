import { FraudService } from './fraud.service';

describe('FraudService', () => {
  const service = new FraudService();

  it('flags tightly timed parallel bids as high suspicion', () => {
    const result = service.assessBids([
      {
        supplierId: 'supplier-a',
        supplierName: 'Supplier A',
        amount: 100_000,
        createdAt: new Date('2026-05-15T10:00:00Z'),
        reliabilityScore: 8,
      },
      {
        supplierId: 'supplier-b',
        supplierName: 'Supplier B',
        amount: 101_000,
        createdAt: new Date('2026-05-15T10:02:00Z'),
        reliabilityScore: 8,
      },
    ]);

    expect(result.suspicionLevel).toBe('HIGH');
    expect(result.suspiciousSuppliers).toEqual(['supplier-a', 'supplier-b']);
  });

  it('returns a low signal when bid spread and timing look normal', () => {
    const result = service.assessBids([
      {
        supplierId: 'supplier-a',
        supplierName: 'Supplier A',
        amount: 100_000,
        createdAt: new Date('2026-05-15T10:00:00Z'),
        reliabilityScore: 8,
      },
      {
        supplierId: 'supplier-b',
        supplierName: 'Supplier B',
        amount: 125_000,
        createdAt: new Date('2026-05-15T11:30:00Z'),
        reliabilityScore: 7,
      },
    ]);

    expect(result.suspicionLevel).toBe('LOW');
    expect(result.suspiciousSuppliers).toEqual([]);
  });
});
