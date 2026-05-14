// ═══════════════════════════════════════════════════════
// FinMatrix — Mock Admin Data (Demo Mode)
// Loaded when waleedhassansfd@gmail.com / 123456 is used
// ═══════════════════════════════════════════════════════

import type { User } from '../types';

export const DEMO_ADMIN_EMAIL = 'waleedhassansfd@gmail.com';
export const DEMO_ADMIN_PASSWORD = '123456';

export const DEMO_SUPER_ADMIN_USER: User = {
  uid: 'demo-super-admin-001',
  email: 'waleedhassansfd@gmail.com',
  displayName: 'Waleed Hassan',
  role: 'super_admin',
  companyId: null,
  phoneNumber: '+92-300-1234567',
  photoURL: null,
  username: 'waleedhassansfd',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
};

// ── Platform Statistics ───────────────────────────────
export const MOCK_STATS = {
  companies: {
    total: 12,
    pending: 3,
    active: 6,
    suspended: 1,
    rejected: 1,
    recentWeek: 2,
  },
  subscriptions: {
    totalPlans: 3,
    totalSubscriptions: 8,
    activeSubscriptions: 6,
  },
  recentRegistrations: [
    {
      id: 'c11',
      name: 'Digital Dynamics',
      industry: 'Technology',
      email: 'contact@digitaldynamics.com',
      status: 'pending',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'c8',
      name: 'Frontier Logistics',
      industry: 'Logistics',
      email: 'info@frontierlogistics.com',
      status: 'pending',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'c12',
      name: 'Apex Financial',
      industry: 'Financial Services',
      email: 'admin@apexfinancial.com',
      status: 'active',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: 'c4',
      name: 'Green Energy Ltd',
      industry: 'Energy',
      email: 'info@greenenergy.com',
      status: 'pending',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
    },
    {
      id: 'c7',
      name: 'Blue Wave Media',
      industry: 'Media & Marketing',
      email: 'contact@bluewavemedia.com',
      status: 'active',
      createdAt: new Date(Date.now() - 432000000).toISOString(),
    },
  ],
};

// ── Companies ─────────────────────────────────────────
export const MOCK_COMPANIES: Array<{
  id: string; name: string; industry: string; email: string; phone: string;
  status: string; rejectionReason: string | null; memberCount: number;
  planName: string | null; createdAt: string; reviewedAt: string | null;
}> = [
  {
    id: 'c1',
    name: 'TechNova Solutions',
    industry: 'Technology',
    email: 'admin@technova.com',
    phone: '+1-555-0101',
    status: 'active',
    rejectionReason: null,
    memberCount: 12,
    planName: 'Professional',
    createdAt: '2024-03-15T10:00:00Z',
    reviewedAt: '2024-03-16T09:00:00Z',
  },
  {
    id: 'c2',
    name: 'Global Trade Co.',
    industry: 'Trading',
    email: 'info@globaltrade.com',
    phone: '+1-555-0102',
    status: 'active',
    rejectionReason: null,
    memberCount: 25,
    planName: 'Enterprise',
    createdAt: '2024-02-20T10:00:00Z',
    reviewedAt: '2024-02-21T09:00:00Z',
  },
  {
    id: 'c3',
    name: 'Metro Retail Group',
    industry: 'Retail',
    email: 'ops@metroretail.com',
    phone: '+1-555-0103',
    status: 'active',
    rejectionReason: null,
    memberCount: 8,
    planName: 'Starter',
    createdAt: '2024-04-01T10:00:00Z',
    reviewedAt: '2024-04-02T09:00:00Z',
  },
  {
    id: 'c4',
    name: 'Green Energy Ltd',
    industry: 'Energy',
    email: 'info@greenenergy.com',
    phone: '+1-555-0104',
    status: 'pending',
    rejectionReason: null,
    memberCount: 3,
    planName: null,
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    reviewedAt: null,
  },
  {
    id: 'c5',
    name: 'Pacific Foods Corp',
    industry: 'Food & Beverage',
    email: 'hr@pacificfoods.com',
    phone: '+1-555-0105',
    status: 'active',
    rejectionReason: null,
    memberCount: 15,
    planName: 'Professional',
    createdAt: '2024-01-10T10:00:00Z',
    reviewedAt: '2024-01-11T09:00:00Z',
  },
  {
    id: 'c6',
    name: 'Summit Healthcare',
    industry: 'Healthcare',
    email: 'admin@summitcare.com',
    phone: '+1-555-0106',
    status: 'suspended',
    rejectionReason: null,
    memberCount: 20,
    planName: 'Enterprise',
    createdAt: '2023-11-05T10:00:00Z',
    reviewedAt: '2023-11-06T09:00:00Z',
  },
  {
    id: 'c7',
    name: 'Blue Wave Media',
    industry: 'Media & Marketing',
    email: 'contact@bluewavemedia.com',
    phone: '+1-555-0107',
    status: 'active',
    rejectionReason: null,
    memberCount: 9,
    planName: 'Professional',
    createdAt: '2024-04-18T10:00:00Z',
    reviewedAt: '2024-04-19T09:00:00Z',
  },
  {
    id: 'c8',
    name: 'Frontier Logistics',
    industry: 'Logistics',
    email: 'info@frontierlogistics.com',
    phone: '+1-555-0108',
    status: 'pending',
    rejectionReason: null,
    memberCount: 4,
    planName: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    reviewedAt: null,
  },
  {
    id: 'c9',
    name: 'Everest Consulting',
    industry: 'Consulting',
    email: 'hello@everestconsulting.com',
    phone: '+1-555-0109',
    status: 'active',
    rejectionReason: null,
    memberCount: 6,
    planName: 'Starter',
    createdAt: '2024-02-01T10:00:00Z',
    reviewedAt: '2024-02-02T09:00:00Z',
  },
  {
    id: 'c10',
    name: 'Star Manufacturing',
    industry: 'Manufacturing',
    email: 'info@starmfg.com',
    phone: '+1-555-0110',
    status: 'rejected',
    rejectionReason: 'Incomplete documentation provided.',
    memberCount: 0,
    planName: null,
    createdAt: '2024-03-28T10:00:00Z',
    reviewedAt: '2024-03-30T09:00:00Z',
  },
  {
    id: 'c11',
    name: 'Digital Dynamics',
    industry: 'Technology',
    email: 'contact@digitaldynamics.com',
    phone: '+1-555-0111',
    status: 'pending',
    rejectionReason: null,
    memberCount: 2,
    planName: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    reviewedAt: null,
  },
  {
    id: 'c12',
    name: 'Apex Financial',
    industry: 'Financial Services',
    email: 'admin@apexfinancial.com',
    phone: '+1-555-0112',
    status: 'active',
    rejectionReason: null,
    memberCount: 18,
    planName: 'Enterprise',
    createdAt: '2024-04-20T10:00:00Z',
    reviewedAt: '2024-04-21T09:00:00Z',
  },
];

// ── Subscription Plans ────────────────────────────────
export const MOCK_PLANS = [
  {
    id: 'p1',
    name: 'Starter',
    description: 'Perfect for small businesses getting started with digital accounting.',
    priceMonthly: '29.00',
    priceYearly: '290.00',
    maxUsers: 5,
    maxInvoices: 100,
    features: ['Up to 5 Users', '100 Invoices/month', 'Basic Reports', 'Email Support', 'Mobile App'],
    isActive: true,
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p2',
    name: 'Professional',
    description: 'For growing businesses with advanced accounting and team needs.',
    priceMonthly: '79.00',
    priceYearly: '790.00',
    maxUsers: 20,
    maxInvoices: null,
    features: [
      'Up to 20 Users',
      'Unlimited Invoices',
      'Advanced Reports',
      'Priority Email & Chat',
      'API Access',
      'Custom Branding',
      'Payroll Module',
    ],
    isActive: true,
    sortOrder: 2,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p3',
    name: 'Enterprise',
    description: 'Full-featured platform built for large organizations and enterprises.',
    priceMonthly: '199.00',
    priceYearly: '1990.00',
    maxUsers: 999,
    maxInvoices: null,
    features: [
      'Unlimited Users',
      'Unlimited Everything',
      'White-label Option',
      'Dedicated Account Manager',
      'SLA Guarantee (99.9%)',
      'Custom Integrations',
      'Advanced Audit Logs',
      'Phone Support',
    ],
    isActive: true,
    sortOrder: 3,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// ── Subscriptions ────────────────────────────────────
export const MOCK_SUBSCRIPTIONS = [
  { id: 's1', companyId: 'c1', companyName: 'TechNova Solutions', companyEmail: 'admin@technova.com', planId: 'p2', plan: MOCK_PLANS[1], status: 'active', startDate: '2024-03-16T00:00:00Z', endDate: '2025-03-16T00:00:00Z', notes: null, createdAt: '2024-03-16T00:00:00Z' },
  { id: 's2', companyId: 'c2', companyName: 'Global Trade Co.', companyEmail: 'info@globaltrade.com', planId: 'p3', plan: MOCK_PLANS[2], status: 'active', startDate: '2024-02-21T00:00:00Z', endDate: '2025-02-21T00:00:00Z', notes: null, createdAt: '2024-02-21T00:00:00Z' },
  { id: 's3', companyId: 'c3', companyName: 'Metro Retail Group', companyEmail: 'ops@metroretail.com', planId: 'p1', plan: MOCK_PLANS[0], status: 'active', startDate: '2024-04-02T00:00:00Z', endDate: '2025-04-02T00:00:00Z', notes: null, createdAt: '2024-04-02T00:00:00Z' },
  { id: 's4', companyId: 'c5', companyName: 'Pacific Foods Corp', companyEmail: 'hr@pacificfoods.com', planId: 'p2', plan: MOCK_PLANS[1], status: 'active', startDate: '2024-01-11T00:00:00Z', endDate: '2025-01-11T00:00:00Z', notes: null, createdAt: '2024-01-11T00:00:00Z' },
  { id: 's5', companyId: 'c7', companyName: 'Blue Wave Media', companyEmail: 'contact@bluewavemedia.com', planId: 'p2', plan: MOCK_PLANS[1], status: 'active', startDate: '2024-04-19T00:00:00Z', endDate: '2025-04-19T00:00:00Z', notes: null, createdAt: '2024-04-19T00:00:00Z' },
  { id: 's6', companyId: 'c9', companyName: 'Everest Consulting', companyEmail: 'hello@everestconsulting.com', planId: 'p1', plan: MOCK_PLANS[0], status: 'active', startDate: '2024-02-02T00:00:00Z', endDate: '2025-02-02T00:00:00Z', notes: null, createdAt: '2024-02-02T00:00:00Z' },
  { id: 's7', companyId: 'c6', companyName: 'Summit Healthcare', companyEmail: 'admin@summitcare.com', planId: 'p3', plan: MOCK_PLANS[2], status: 'suspended', startDate: '2023-11-06T00:00:00Z', endDate: null as string | null, notes: 'Suspended pending payment review.' as string | null, createdAt: '2023-11-06T00:00:00Z' },
  { id: 's8', companyId: 'c12', companyName: 'Apex Financial', companyEmail: 'admin@apexfinancial.com', planId: 'p3', plan: MOCK_PLANS[2], status: 'active', startDate: '2024-04-21T00:00:00Z', endDate: '2025-04-21T00:00:00Z', notes: null, createdAt: '2024-04-21T00:00:00Z' },
] as const as any[];

// ── Revenue Analytics ─────────────────────────────────
export const MOCK_REVENUE = {
  mrr: 693,
  arr: 8316,
  growthMoM: 12.8,
  churnRate: 2.1,
  avgRevenuePerAccount: 115.5,
  byPlan: [
    { plan: 'Starter', label: 'STR', companies: 2, monthly: 29, revenue: 58, color: '#0065FF' },
    { plan: 'Professional', label: 'PRO', companies: 3, monthly: 79, revenue: 237, color: '#0052CC' },
    { plan: 'Enterprise', label: 'ENT', companies: 2, monthly: 199, revenue: 398, color: '#6554C0' },
  ],
  monthlyTrend: [
    { month: 'Nov', revenue: 420, companies: 7 },
    { month: 'Dec', revenue: 481, companies: 8 },
    { month: 'Jan', revenue: 502, companies: 9 },
    { month: 'Feb', revenue: 561, companies: 10 },
    { month: 'Mar', revenue: 614, companies: 11 },
    { month: 'Apr', revenue: 693, companies: 12 },
  ],
  topCompanies: [
    { name: 'Global Trade Co.', revenue: 199, plan: 'Enterprise', status: 'active' },
    { name: 'Summit Healthcare', revenue: 199, plan: 'Enterprise', status: 'suspended' },
    { name: 'Apex Financial', revenue: 199, plan: 'Enterprise', status: 'active' },
    { name: 'TechNova Solutions', revenue: 79, plan: 'Professional', status: 'active' },
    { name: 'Pacific Foods Corp', revenue: 79, plan: 'Professional', status: 'active' },
    { name: 'Blue Wave Media', revenue: 79, plan: 'Professional', status: 'active' },
    { name: 'Metro Retail Group', revenue: 29, plan: 'Starter', status: 'active' },
    { name: 'Everest Consulting', revenue: 29, plan: 'Starter', status: 'active' },
  ],
};

// ── Team Members ──────────────────────────────────────
export const MOCK_TEAM = [
  {
    id: 'u1',
    name: 'Waleed Hassan',
    email: 'waleedhassansfd@gmail.com',
    role: 'Super Admin',
    department: 'Platform',
    status: 'active',
    lastActive: new Date().toISOString(),
    avatar: 'WH',
    color: '#0052CC',
  },
  {
    id: 'u2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@finmatrix.io',
    role: 'Platform Manager',
    department: 'Operations',
    status: 'active',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    avatar: 'SJ',
    color: '#00875A',
  },
  {
    id: 'u3',
    name: 'Ahmed Khan',
    email: 'ahmed.khan@finmatrix.io',
    role: 'Support Lead',
    department: 'Customer Success',
    status: 'active',
    lastActive: new Date(Date.now() - 7200000).toISOString(),
    avatar: 'AK',
    color: '#FF991F',
  },
  {
    id: 'u4',
    name: 'Maria Santos',
    email: 'maria.santos@finmatrix.io',
    role: 'Business Analyst',
    department: 'Analytics',
    status: 'active',
    lastActive: new Date(Date.now() - 86400000).toISOString(),
    avatar: 'MS',
    color: '#DE350B',
  },
];

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ── Mock API Responses (simulate network delay) ───────
export const mockGetStats = async () => {
  await delay(600);
  return { data: MOCK_STATS };
};

export const mockGetCompanies = async (page: number, _limit: number, status?: string) => {
  await delay(700);
  const filtered = status ? MOCK_COMPANIES.filter(c => c.status === status) : MOCK_COMPANIES;
  const start = (page - 1) * 20;
  const slice = filtered.slice(start, start + 20);
  return { data: { data: slice, pagination: { total: filtered.length, page, limit: 20 } } };
};

export const mockUpdateCompanyStatus = async (id: string, status: string, rejectionReason?: string) => {
  await delay(500);
  return { data: { id, status, rejectionReason: rejectionReason ?? null } };
};

export const mockGetPlans = async () => {
  await delay(500);
  return { data: MOCK_PLANS };
};

export const mockGetSubscriptions = async () => {
  await delay(600);
  return { data: { data: MOCK_SUBSCRIPTIONS, pagination: { total: MOCK_SUBSCRIPTIONS.length } } };
};

export const mockCreatePlan = async (data: any) => {
  await delay(600);
  return { data: { id: `p-${Date.now()}`, ...data, isActive: true, sortOrder: MOCK_PLANS.length + 1, createdAt: new Date().toISOString() } };
};

export const mockUpdatePlan = async (id: string, data: any) => {
  await delay(500);
  const existing = MOCK_PLANS.find(p => p.id === id) ?? {};
  return { data: { ...existing, ...data, id } };
};

export const mockDeletePlan = async (_id: string) => {
  await delay(400);
  return { data: { success: true } };
};

export const mockAssignSubscription = async (data: any) => {
  await delay(600);
  const company = MOCK_COMPANIES.find(c => c.id === data.companyId);
  const plan = MOCK_PLANS.find(p => p.id === data.planId);
  return {
    data: {
      id: `s-${Date.now()}`,
      companyId: data.companyId,
      companyName: company?.name ?? 'Unknown',
      companyEmail: company?.email ?? null,
      planId: data.planId,
      plan: plan ?? null,
      status: 'active',
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      notes: data.notes ?? null,
      createdAt: new Date().toISOString(),
    },
  };
};
