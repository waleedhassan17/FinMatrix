// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Rates Dummy Data
// ═══════════════════════════════════════════════════════

import type { TaxRate } from '../types';

export const taxRates: TaxRate[] = [
  {
    id: 'tax_001',
    companyId: 'comp_001',
    name: 'GST 17%',
    rate: 17,
    taxType: 'GST',
    description: 'Standard General Sales Tax — applied to most goods and services',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tax_002',
    companyId: 'comp_001',
    name: 'GST 10%',
    rate: 10,
    taxType: 'GST',
    description: 'Reduced GST rate — applied to selected services and software',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tax_003',
    companyId: 'comp_001',
    name: 'GST 5%',
    rate: 5,
    taxType: 'GST',
    description: 'GST on essential goods — food, medicine, and basic commodities',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tax_004',
    companyId: 'comp_001',
    name: 'WHT 10%',
    rate: 10,
    taxType: 'WHT',
    description: 'Withholding Tax on service payments to registered vendors',
    isActive: true,
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'tax_005',
    companyId: 'comp_001',
    name: 'Advance Income Tax 1%',
    rate: 1,
    taxType: 'Income Tax',
    description: 'Advance income tax collected at source on commercial imports',
    isActive: false,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];
