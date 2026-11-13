// ═══════════════════════════════════════════════════════
// FinMatrix — Migration Center model (mobile)
// Mobile covers start, upload, status and the final decisions;
// matching and fixing large spreadsheets is done on the web.
// ═══════════════════════════════════════════════════════

export type MigrationStatus = 'draft' | 'uploaded' | 'mapped' | 'validated' | 'ready' | 'committed' | 'closed' | 'rolled_back';

export type MigrationSourceSystem = 'finmatrix_template' | 'generic_spreadsheet' | 'tally' | 'peachtree' | 'quickbooks_online' | 'xero' | 'odoo';

export interface MigrationCheck {
  code: string;
  label: string;
  expected: string;
  actual: string;
  difference: string;
  passed: boolean;
  details: Array<Record<string, unknown>>;
}

export interface RowCount {
  source: number;
  imported: number;
  merged: number;
  rejected: number;
  pending: number;
}

export interface MigrationBatch {
  id: string;
  sourceSystem: MigrationSourceSystem;
  cutoverDate: string;
  status: MigrationStatus;
  step: number;
  readiness: number;
  counts: { rows: Record<string, RowCount>; issues: { blocking: number; warning: number; resolved: number }; mappings: { total: number; confident: number } } | null;
  checks: MigrationCheck[] | null;
  issues: { blocking: number; warning: number };
  lastError: string | null;
  signedOffAt: string | null;
  signedOffBy: { id: string; name: string } | null;
  committedAt: string | null;
  closedAt: string | null;
  rolledBackAt: string | null;
  certificateAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  files?: Array<{ id: string; originalName: string; sizeBytes: number; detected: Array<{ sheet: string; target: string | null; confidence: number; rows: number }> | null }>;
}

export interface MigrationIssue {
  id: string;
  code: string;
  severity: 'blocking' | 'warning';
  sheet: string | null;
  rowNumber: number | null;
  message: string;
}

export interface SpotCheck {
  kind: 'customer' | 'vendor';
  name: string;
  documents: number;
  sourceBalance: string;
  finmatrixBalance: string;
  matches: boolean;
}

export interface IssueGroup {
  code: string;
  severity: string;
  count: number;
}

export interface CertificatePreview {
  allPassed: boolean;
  checks: MigrationCheck[];
  spotChecks: SpotCheck[];
  rejectedTotal: number;
  rowCounts: Array<{ entity: string } & RowCount>;
}

export const SOURCE_OPTIONS: Array<{ id: MigrationSourceSystem; label: string }> = [
  { id: 'finmatrix_template', label: 'FinMatrix starter workbook' },
  { id: 'tally', label: 'TallyPrime (XML)' },
  { id: 'generic_spreadsheet', label: 'Any spreadsheet (Excel / CSV)' },
  { id: 'peachtree', label: 'Peachtree / Sage 50' },
  { id: 'quickbooks_online', label: 'QuickBooks Online' },
  { id: 'xero', label: 'Xero' },
  { id: 'odoo', label: 'Odoo' },
];

export const sourceLabel = (id: string) => SOURCE_OPTIONS.find((s) => s.id === id)?.label ?? id;

export const MIGRATION_STATUS_LABEL: Record<MigrationStatus, string> = {
  draft: 'Not started',
  uploaded: 'Files uploaded',
  mapped: 'Matching',
  validated: 'Checks failing',
  ready: 'Ready to import',
  committed: 'Imported',
  closed: 'Closed',
  rolled_back: 'Undone',
};

export const ENTITY_LABEL: Record<string, string> = {
  accounts: 'Accounts',
  customers: 'Customers',
  vendors: 'Vendors',
  items: 'Items',
  trial_balance: 'Trial balance',
  open_invoices: 'Open invoices',
  open_bills: 'Open bills',
  stock: 'Stock',
};

export const WIZARD_STEP_LABEL: Record<number, string> = { 1: 'Start', 2: 'Upload', 3: 'Match', 4: 'Fix', 5: 'Check', 6: 'Review', 7: 'Import' };

/** Files can be added or replaced until the batch is imported. */
export const canUpload = (s: MigrationStatus) => s === 'draft' || s === 'uploaded' || s === 'mapped' || s === 'validated';
/** The checks can be run once every sheet is matched. */
export const canRunChecks = (b: Pick<MigrationBatch, 'status' | 'issues'>) => (b.status === 'mapped' || b.status === 'validated' || b.status === 'ready') && b.issues.blocking === 0;

/**
 * Matching columns and fixing rows is spreadsheet work, done on the web. While
 * any of it is pending (an unconfirmed match, a blocking issue, a failed check
 * that needs a data fix) mobile shows where things stand and links there.
 */
export function needsWeb(b: Pick<MigrationBatch, 'status' | 'issues' | 'counts'>): boolean {
  if (b.status !== 'uploaded' && b.status !== 'mapped' && b.status !== 'validated') return false;
  if (b.status === 'uploaded' || b.status === 'validated' || b.issues.blocking > 0) return true;
  const m = b.counts?.mappings;
  return !!m && m.confident < m.total;
}
export const canImport = (b: Pick<MigrationBatch, 'status' | 'readiness' | 'signedOffAt'>) => b.status === 'ready' && b.readiness === 100 && !!b.signedOffAt;
export function canSignOff(b: Pick<MigrationBatch, 'status'>, spotChecks: SpotCheck[], ticked: ReadonlySet<number>, confirmed: boolean): boolean {
  return b.status === 'ready' && confirmed && spotChecks.every((_, i) => ticked.has(i));
}

/** The web wizard for one batch, for "Continue on the web". */
export const webBatchUrl = (webAppUrl: string, id: string) => `${webAppUrl.replace(/\/$/, '')}/settings/migration/${id}`;
