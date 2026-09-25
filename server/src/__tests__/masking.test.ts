import { maskEmail, maskPhone, toPartDetailView } from '../security/masking';
import { Logger, redact } from '../observability/logger';
import type { PartAggregate } from '../domain/types';

const part: PartAggregate = {
  partNumber: 'BRG-22045',
  partName: 'Deep groove ball bearing 45 mm',
  description: 'Sealed deep groove ball bearing.',
  category: 'Bearings',
  unitOfMeasure: 'EA',
  inventoryLevel: 184,
  reorderPoint: 60,
  warehouseLocation: 'WH1-A-12-3',
  lifecycleStatus: 'active',
  unitCostUsd: 18.42,
  internalNotes: 'Negotiated tier-2 pricing.',
  supplierId: 'SUP-1001',
  updatedAt: '2026-08-14T09:12:00.000Z',
  supplier: {
    id: 'SUP-1001',
    name: 'Acme Precision Components',
    contactEmail: 'orders@acme-precision.example.com',
    contactPhone: '+1-216-555-0142',
    country: 'United States',
    qualityRating: 4.6
  },
  purchaseOrders: [
    {
      poNumber: 'PO-2026-004182',
      partNumber: 'BRG-22045',
      quantity: 120,
      unitPriceUsd: 18.1,
      status: 'confirmed',
      orderDate: '2026-09-01',
      expectedDeliveryDate: '2026-10-06'
    }
  ]
};

describe('sensitive data protection', () => {
  it('masks emails while keeping the domain recognisable', () => {
    expect(maskEmail('orders@acme-precision.example.com')).toBe('o*****@acme-precision.example.com');
    expect(maskEmail('not-an-email')).toBe('MASKED');
  });

  it('masks phone numbers except the final digits', () => {
    expect(maskPhone('+1-216-555-0142')).toBe('***-***-42');
    expect(maskPhone('12')).toBe('MASKED');
  });

  it('removes cost and internal notes from the detail view', () => {
    const view = toPartDetailView(part);

    expect(JSON.stringify(view)).not.toContain('18.42');
    expect(JSON.stringify(view)).not.toContain('Negotiated tier-2 pricing.');
    expect(view.sensitiveFields).toEqual({ unitCostUsd: 'MASKED', internalNotes: 'MASKED' });
  });

  it('redacts sensitive keys before anything reaches the log sink', () => {
    expect(redact({ partNumber: 'BRG-22045', unitCostUsd: 18.42, supplier: { contactEmail: 'a@b.com' } })).toEqual({
      partNumber: 'BRG-22045',
      unitCostUsd: '[redacted]',
      supplier: { contactEmail: '[redacted]' }
    });
  });

  it('writes structured log entries through the configured sink', () => {
    const entries: Array<Record<string, unknown>> = [];
    const logger = new Logger({ write: (_level, entry) => entries.push(entry) });

    logger.info('part.search', { query: 'bearing', internalNotes: 'secret' });

    expect(entries[0]).toMatchObject({ level: 'info', message: 'part.search', query: 'bearing' });
    expect(entries[0].internalNotes).toBe('[redacted]');
  });
});
