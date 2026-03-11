// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Personnel Dummy Data
// ═══════════════════════════════════════════════════════

export interface DummyDeliveryPerson {
  userId: string;
  displayName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  role: 'delivery';
  companyId: string;
  isAvailable: boolean;
  currentLoad: number;
  maxLoad: number;
  rating: number;
  totalDeliveries: number;
  onTimeRate: number;
  status: 'active' | 'on_leave' | 'inactive';
  vehicleType: 'motorcycle' | 'van' | 'truck';
  vehicleNumber: string;
  zones: string[];
}

export const dummyDeliveryPersonnel: DummyDeliveryPerson[] = [
  {
    userId: 'dp_001',
    displayName: 'Saim',
    username: 'FM2024.saim',
    email: 'saim@finmatrix.pk',
    password: 'deliver123',
    phone: '+92-301-1112233',
    role: 'delivery',
    companyId: 'company_1',
    isAvailable: true,
    currentLoad: 3,
    maxLoad: 15,
    rating: 4.8,
    totalDeliveries: 245,
    onTimeRate: 96,
    status: 'active',
    vehicleType: 'motorcycle',
    vehicleNumber: 'LHR-1234',
    zones: ['Zone A', 'Zone B'],
  },
  {
    userId: 'dp_002',
    displayName: 'Hassan Raza',
    username: 'FM2024.hassan',
    email: 'hassan@finmatrix.pk',
    password: 'deliver123',
    phone: '+92-302-4445566',
    role: 'delivery',
    companyId: 'company_1',
    isAvailable: true,
    currentLoad: 5,
    maxLoad: 15,
    rating: 4.5,
    totalDeliveries: 189,
    onTimeRate: 92,
    status: 'active',
    vehicleType: 'van',
    vehicleNumber: 'LHR-5678',
    zones: ['Zone B', 'Zone C'],
  },
  {
    userId: 'dp_003',
    displayName: 'Usman Tariq',
    username: 'FM2024.usman',
    email: 'usman@finmatrix.pk',
    password: 'deliver123',
    phone: '+92-303-7778899',
    role: 'delivery',
    companyId: 'company_1',
    isAvailable: false,
    currentLoad: 0,
    maxLoad: 15,
    rating: 4.2,
    totalDeliveries: 156,
    onTimeRate: 88,
    status: 'on_leave',
    vehicleType: 'motorcycle',
    vehicleNumber: 'FSD-9012',
    zones: ['Zone A'],
  },
  {
    userId: 'dp_004',
    displayName: 'Ali Abbas',
    username: 'FM2024.ali',
    email: 'ali@finmatrix.pk',
    password: 'deliver123',
    phone: '+92-304-1234567',
    role: 'delivery',
    companyId: 'company_1',
    isAvailable: true,
    currentLoad: 7,
    maxLoad: 15,
    rating: 4.6,
    totalDeliveries: 312,
    onTimeRate: 94,
    status: 'active',
    vehicleType: 'truck',
    vehicleNumber: 'ISB-3456',
    zones: ['Zone C', 'Zone D'],
  },
  {
    userId: 'dp_005',
    displayName: 'Kamran Malik',
    username: 'FM2024.kamran',
    email: 'kamran@finmatrix.pk',
    password: 'deliver123',
    phone: '+92-305-9876543',
    role: 'delivery',
    companyId: 'company_1',
    isAvailable: true,
    currentLoad: 2,
    maxLoad: 15,
    rating: 4.9,
    totalDeliveries: 278,
    onTimeRate: 97,
    status: 'active',
    vehicleType: 'motorcycle',
    vehicleNumber: 'LHR-7890',
    zones: ['Zone A', 'Zone D'],
  },
];

// Admin dummy credential
export const dummyAdminUser = {
  userId: 'admin_001',
  displayName: 'Admin User',
  email: 'admin@finmatrix.pk',
  password: 'admin123',
  phone: '+92-300-1234567',
  role: 'admin' as const,
  companyId: 'company_1',
};

// Valid company invite codes (for delivery signup)
export const validCompanyCodes: Record<string, string> = {
  FM2024: 'company_1',
  DEMO01: 'company_1',
};
