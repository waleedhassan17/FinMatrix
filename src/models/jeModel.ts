// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entry Validation Model
// ═══════════════════════════════════════════════════════

export interface JEFormLine {
  id: string;
  accountId: string;
  description: string;
  debit: string; // string for text-input binding
  credit: string;
}

export interface JEFormData {
  date: string;
  reference: string;
  memo: string;
  lines: JEFormLine[];
}

export interface JEValidationErrors {
  date?: string;
  reference?: string;
  memo?: string;
  lines?: string;
  balance?: string;
  [key: string]: string | undefined;
}

/**
 * Validate for Save as Draft — minimal checks.
 */
export const validateJournalEntryDraft = (data: JEFormData): JEValidationErrors => {
  const errors: JEValidationErrors = {};

  if (!data.date) errors.date = 'Date is required';
  if (!data.reference.trim()) errors.reference = 'Reference is required';

  return errors;
};

/**
 * Validate for Post — strict checks.
 * - date required
 * - reference required
 * - 2+ lines
 * - each line has accountId
 * - each line has debit > 0 or credit > 0 (not both)
 * - total debits === total credits
 */
export const validateJournalEntryPost = (data: JEFormData): JEValidationErrors => {
  const errors: JEValidationErrors = {};

  if (!data.date) errors.date = 'Date is required';
  if (!data.reference.trim()) errors.reference = 'Reference is required';

  const validLines = data.lines.filter(
    l => l.accountId || parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0,
  );
  if (validLines.length < 2) {
    errors.lines = 'At least 2 lines are required';
  }

  for (let i = 0; i < data.lines.length; i++) {
    const l = data.lines[i];
    const debit = parseFloat(l.debit) || 0;
    const credit = parseFloat(l.credit) || 0;

    if (!l.accountId && (debit > 0 || credit > 0)) {
      errors[`line_${i}_account`] = 'Account is required';
    }
    if (l.accountId && debit === 0 && credit === 0) {
      errors[`line_${i}_amount`] = 'Enter a debit or credit amount';
    }
    if (debit > 0 && credit > 0) {
      errors[`line_${i}_both`] = 'Line cannot have both debit and credit';
    }
  }

  const totalDebit = data.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = data.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    errors.balance = `Unbalanced: debits Rs ${totalDebit.toFixed(2)} ≠ credits Rs ${totalCredit.toFixed(2)}`;
  }

  return errors;
};

/**
 * Generate next reference number from existing entries.
 */
export const generateNextReference = (existingRefs: string[]): string => {
  let max = 0;
  for (const ref of existingRefs) {
    const match = ref.match(/^JE-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `JE-${String(max + 1).padStart(3, '0')}`;
};

/**
 * Create an empty form line with unique id.
 */
let lineCounter = 0;
export const createEmptyLine = (): JEFormLine => ({
  id: `new-line-${++lineCounter}`,
  accountId: '',
  description: '',
  debit: '',
  credit: '',
});
