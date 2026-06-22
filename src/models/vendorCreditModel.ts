export type VendorCreditStatus = 'open' | 'applied' | 'closed' | 'void';

export interface VendorCreditLine {
  id?: string;
  description: string;
  amount: number;
}

export interface VendorCredit {
  id: string;
  vendorCreditNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  originalBillId: string | null;
  reason: string;
  total: number;
  amountApplied: number;
  balance: number;
  status: VendorCreditStatus;
  lines: VendorCreditLine[];
}
