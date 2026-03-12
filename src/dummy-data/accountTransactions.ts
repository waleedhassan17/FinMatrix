// ═══════════════════════════════════════════════════════
// FinMatrix — Account Transactions Dummy Data
// ═══════════════════════════════════════════════════════

export interface AccountTransaction {
  id: string;
  date: string;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

const txns: Record<string, AccountTransaction[]> = {};

/** Returns 10 dummy transactions for any accountId */
export const getAccountTransactions = (accountId: string): AccountTransaction[] => {
  if (txns[accountId]) return txns[accountId];

  const base = [
    { ref: 'JE-001', memo: 'Opening balance', debit: 5000, credit: 0 },
    { ref: 'INV-042', memo: 'Invoice #042 — Acme Corp', debit: 3200, credit: 0 },
    { ref: 'PMT-018', memo: 'Payment received — GlobalTech', debit: 0, credit: 1200 },
    { ref: 'EXP-009', memo: 'Office supplies purchase', debit: 0, credit: 480 },
    { ref: 'JE-014', memo: 'Month-end adjustment', debit: 750, credit: 0 },
    { ref: 'INV-043', memo: 'Invoice #043 — Delta Services', debit: 1450, credit: 0 },
    { ref: 'PMT-022', memo: 'Vendor payment — StarMart', debit: 0, credit: 620 },
    { ref: 'JE-018', memo: 'Depreciation entry', debit: 0, credit: 350 },
    { ref: 'INV-045', memo: 'Invoice #045 — BrightWave', debit: 2800, credit: 0 },
    { ref: 'PMT-025', memo: 'Customer refund', debit: 0, credit: 400 },
  ];

  let running = 0;
  const result: AccountTransaction[] = base.map((row, idx) => {
    running += row.debit - row.credit;
    return {
      id: `${accountId}-txn-${idx}`,
      date: `Mar ${(12 - idx).toString().padStart(2, '0')}, 2026`,
      reference: row.ref,
      memo: row.memo,
      debit: row.debit,
      credit: row.credit,
      runningBalance: running,
    };
  });

  txns[accountId] = result;
  return result;
};
