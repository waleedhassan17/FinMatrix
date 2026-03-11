// ═══════════════════════════════════════════════════════
// FinMatrix — Complete TypeScript Type Definitions
// ═══════════════════════════════════════════════════════

// ─── Enums & Unions ───────────────────────────────────
export type UserRole = 'admin' | 'delivery';
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountSubType =
  | 'current_asset'
  | 'fixed_asset'
  | 'current_liability'
  | 'long_term_liability'
  | 'owner_equity'
  | 'retained_earnings'
  | 'operating_revenue'
  | 'other_revenue'
  | 'operating_expense'
  | 'cost_of_goods';
export type JournalEntryStatus = 'draft' | 'posted' | 'voided';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type BillStatus = 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';
export type SalesOrderStatus = 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';
export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned';
export type InventoryAdjustmentType = 'increase' | 'decrease' | 'transfer' | 'count';
export type NotificationType =
  | 'delivery_assigned'
  | 'delivery_completed'
  | 'inventory_low'
  | 'invoice_overdue'
  | 'bill_due'
  | 'journal_posted'
  | 'system';
export type PayrollStatus = 'draft' | 'processed' | 'paid';
export type BankTransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest';

// ─── User ─────────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  username?: string;
  displayName: string;
  role: UserRole;
  companyId: string | null;
  phoneNumber: string;
  photoURL: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Company ──────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  fiscalYearStart: string;
  currency: string;
  logoURL: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Chart of Accounts ───────────────────────────────
export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  subType: AccountSubType;
  description: string;
  parentId: string | null;
  isActive: boolean;
  isSystemAccount: boolean;
  balance: number;
  normalBalance: 'debit' | 'credit';
  createdAt: string;
  updatedAt: string;
}

// ─── Journal Entries ──────────────────────────────────
export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  entryNumber: string;
  date: string;
  description: string;
  reference: string;
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  approvedBy: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Customer ─────────────────────────────────────────
export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  taxId: string;
  contactPerson: string;
  notes: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Vendor ───────────────────────────────────────────
export interface Vendor {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  taxId: string;
  contactPerson: string;
  notes: string;
  balance: number;
  paymentTerms: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Invoice ──────────────────────────────────────────
export interface InvoiceLine {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Bill ─────────────────────────────────────────────
export interface BillLine {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface Bill {
  id: string;
  companyId: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  status: BillStatus;
  lines: BillLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Purchase Order ───────────────────────────────────
export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  expectedDate: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Sales Order ──────────────────────────────────────
export interface SalesOrderLine {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  fulfilledQuantity: number;
}

export interface SalesOrder {
  id: string;
  companyId: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  expectedDate: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Inventory ────────────────────────────────────────
export interface InventoryItem {
  id: string;
  companyId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  quantityOnHand: number;
  reorderLevel: number;
  reorderQuantity: number;
  warehouseId: string;
  warehouseName: string;
  barcode: string;
  isActive: boolean;
  lastCountDate: string | null;
  imageURL: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAdjustment {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  type: InventoryAdjustmentType;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason: string;
  reference: string;
  performedBy: string;
  performedAt: string;
}

export interface ShadowInventory {
  id: string;
  deliveryPersonId: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  lastSyncedAt: string;
}

export interface InventoryUpdateRequest {
  id: string;
  companyId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  itemId: string;
  itemName: string;
  currentQuantity: number;
  requestedQuantity: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

// ─── Delivery ─────────────────────────────────────────
export interface DeliveryItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface Delivery {
  id: string;
  companyId: string;
  deliveryNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  status: DeliveryStatus;
  items: DeliveryItem[];
  totalAmount: number;
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  signatureURL: string | null;
  photoURL: string | null;
  notes: string;
  failureReason: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPerson {
  id: string;
  userId: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  isAvailable: boolean;
  isActive: boolean;
  currentDeliveries: number;
  totalDeliveries: number;
  rating: number;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Employee & Payroll ───────────────────────────────
export interface Employee {
  id: string;
  companyId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  salary: number;
  payFrequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  taxWithholding: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  companyId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Banking ──────────────────────────────────────────
export interface BankAccount {
  id: string;
  companyId: string;
  accountId: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  balance: number;
  lastReconciledDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  companyId: string;
  date: string;
  description: string;
  type: BankTransactionType;
  amount: number;
  balance: number;
  reference: string;
  isReconciled: boolean;
  matchedTransactionId: string | null;
  createdAt: string;
}

// ─── Tax ──────────────────────────────────────────────
export interface TaxRate {
  id: string;
  companyId: string;
  name: string;
  rate: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────
export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Audit ────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  ipAddress: string;
  timestamp: string;
}

// ─── Navigation Params ────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  RoleSelection: undefined;
  SignIn: { role: UserRole };
  SignUp: { role: UserRole };
  ForgotPassword: undefined;
  EmailVerification: { email: string };
  CompanySetup: undefined;
  CreateCompany: undefined;
  JoinCompany: undefined;
  DeliveryOnboarding: undefined;
  AdminTabs: undefined;
  DeliveryTabs: undefined;
  DeliveryPersonnelList: undefined;
  AddDeliveryPersonnel: undefined;
  DeliveryPersonnelDetail: { userId: string };
};
