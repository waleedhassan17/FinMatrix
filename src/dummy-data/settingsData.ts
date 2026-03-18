import type { CompanyMember } from '../screens/Auth/companySlice';

/* ─── App Preferences (defaults) ─── */
export interface AppPreferences {
  dateFormat: string;
  numberFormat: string;
  currency: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  defaultPaymentTerms: string;
  notifyInvoice: boolean;
  notifyPayment: boolean;
  notifyBill: boolean;
  notifyInventory: boolean;
  notifyDelivery: boolean;
  demoMode: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  dateFormat: 'DD/MM/YYYY',
  numberFormat: '1,234.56',
  currency: 'PKR',
  invoicePrefix: 'INV-',
  invoiceStartNumber: 1001,
  defaultPaymentTerms: 'Net 30',
  notifyInvoice: true,
  notifyPayment: true,
  notifyBill: true,
  notifyInventory: false,
  notifyDelivery: true,
  demoMode: true,
};

export const DATE_FORMAT_OPTIONS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
export const NUMBER_FORMAT_OPTIONS = ['1,234.56', '1.234,56', '1 234.56'];
export const CURRENCY_OPTIONS = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
export const PAYMENT_TERMS_OPTIONS = [
  'Due on Receipt',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
];

/* ─── Dummy users for User Management ─── */
export const DUMMY_USERS: CompanyMember[] = [
  {
    userId: 'u-001',
    role: 'admin',
    displayName: 'Ahmed Khan',
    email: 'ahmed@finmatrix.pk',
    phone: '+92-333-1234567',
    joinedAt: '2024-01-10T09:00:00Z',
  },
  {
    userId: 'u-002',
    role: 'admin',
    displayName: 'Sara Malik',
    email: 'sara@finmatrix.pk',
    phone: '+92-321-9876543',
    joinedAt: '2024-02-15T10:30:00Z',
  },
  {
    userId: 'u-003',
    role: 'delivery',
    displayName: 'Bilal Hussain',
    email: 'bilal@finmatrix.pk',
    phone: '+92-300-5551234',
    joinedAt: '2024-03-20T14:00:00Z',
  },
  {
    userId: 'u-004',
    role: 'delivery',
    displayName: 'Usman Raza',
    email: 'usman@finmatrix.pk',
    phone: '+92-345-6789012',
    joinedAt: '2024-04-05T08:45:00Z',
  },
  {
    userId: 'u-005',
    role: 'admin',
    displayName: 'Fatima Noor',
    email: 'fatima@finmatrix.pk',
    phone: '+92-312-3456789',
    joinedAt: '2024-05-01T11:15:00Z',
  },
];
