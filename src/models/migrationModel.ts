// ═══════════════════════════════════════════════════════
// FinMatrix — Migration Center model (mobile)
// Mobile covers start, upload, status and the final decisions;
// matching and fixing large spreadsheets is done on the web.
// ═══════════════════════════════════════════════════════

export type MigrationStatus = 'draft' | 'uploaded' | 'mapped' | 'validated' | 'ready' | 'committed' | 'closed' | 'rolled_back';

export type MigrationSourceSystem =
  | 'finmatrix_template'
  | 'generic_spreadsheet'
  | 'tally'
  | 'peachtree'
  | 'quickbooks_online'
  | 'quickbooks_desktop'
  | 'xero'
  | 'zoho_books'
  | 'odoo'
  | 'sage_50'
  | 'sage_accounting'
  | 'busy'
  | 'marg';

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
  /** The date every posting carries and the books close through: the day before cutover. */
  openingDate?: string;
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
  files?: Array<{ id: string; originalName: string; sizeBytes: number; kind?: string; detected: Array<{ sheet: string; target: string | null; confidence: number; rows: number }> | null }>;
  /** Large uploads (a Peachtree backup), newest first. */
  uploads?: MigrationUploadView[];
}

/** How far the server is in reading an uploaded backup. */
export interface MigrationUploadProgress {
  stage: 'assembling' | 'unpacking' | 'reading' | 'analysing' | 'done';
  detail?: string;
  done?: number;
  total?: number;
}

export interface MigrationUploadView {
  id: string;
  name: string;
  size: number;
  status: 'receiving' | 'received' | 'reading' | 'read' | 'failed';
  progress: MigrationUploadProgress | null;
  errorCode: string | null;
  error: string | null;
  fileId: string | null;
  updatedAt: string;
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
  /** Each open document's amount due exactly as typed in the file. */
  asTyped?: string[];
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
  { id: 'quickbooks_desktop', label: 'QuickBooks Desktop' },
  { id: 'xero', label: 'Xero' },
  { id: 'zoho_books', label: 'Zoho Books' },
  { id: 'odoo', label: 'Odoo' },
  { id: 'sage_50', label: 'Sage 50 Accounts (UK)' },
  { id: 'sage_accounting', label: 'Sage Accounting' },
  { id: 'busy', label: 'Busy' },
  { id: 'marg', label: 'Marg' },
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
  peachtree_proof: "Compared with Peachtree's reports",
};

/** Peachtree's own reports, recognised beside a backup as its proof. */
export const PEACHTREE_REPORTS = [
  { kind: 'trial_balance', title: 'General Ledger Trial Balance', where: 'Reports & Forms → General Ledger', stockOnly: false },
  { kind: 'aged_receivables', title: 'Aged Receivables', where: 'Reports & Forms → Accounts Receivable', stockOnly: false },
  { kind: 'aged_payables', title: 'Aged Payables', where: 'Reports & Forms → Accounts Payable', stockOnly: false },
  { kind: 'inventory_valuation', title: 'Inventory Valuation Report', where: 'Reports & Forms → Inventory', stockOnly: true },
] as const;

const REPORT_KIND_LABEL: Record<string, string> = {
  chart_of_accounts: 'Chart of accounts',
  customer_list: 'Customer list',
  vendor_list: 'Vendor list',
  item_list: 'Item list',
  trial_balance: 'Trial balance',
  aged_receivables: 'Aged receivables',
  aged_payables: 'Aged payables',
  inventory_valuation: 'Inventory valuation',
  general_ledger: 'General ledger — not needed, skipped',
  journal: 'Journal — not needed, skipped',
  profit_and_loss: 'Profit and loss — not needed, skipped',
  balance_sheet: 'Balance sheet — not needed, skipped',
  contact_list: 'Contact list',
  transactions: 'Invoice or bill list — not needed (the aging report is used), skipped',
};

/** What a detected sheet becomes, in words ("<source>:<report>" is one of a system's own reports). */
export function detectedLabel(target: string | null): string {
  if (!target) return 'not imported';
  const m = /^([a-z_]+):([a-z_]+)$/.exec(target);
  if (m) return `${sourceLabel(m[1])} ${REPORT_KIND_LABEL[m[2]] ?? 'report'}`;
  return ENTITY_LABEL[target] ?? target;
}

/** Files the picker may return, by name; the server still checks the bytes. */
export const isSpreadsheetFile = (name: string) => /\.(xlsx|xls|csv|tsv|txt|iif|xml|zip)$/i.test(name);
/** Above this, any export goes up in pieces and is read in the background (the direct route takes 25 MB). */
export const LARGE_UPLOAD_FROM_BYTES = 20 * 1024 ** 2;
/** A Peachtree backup, or any export larger than the direct route comfortably takes. */
export const isLargeUploadFile = (name: string, size = 0) =>
  /\.ptb$/i.test(name) || (size > LARGE_UPLOAD_FROM_BYTES && /\.(zip|xlsx|csv|tsv|txt|iif|xml)$/i.test(name));
export const MAX_BACKUP_BYTES = 2 * 1024 ** 3;
export const MAX_SPREADSHEET_BYTES = 25 * 1024 ** 2;

export const isUploadActive = (u: Pick<MigrationUploadView, 'status'>) => u.status === 'received' || u.status === 'reading';

const UPLOAD_STAGE_LABEL: Record<MigrationUploadProgress['stage'], string> = {
  assembling: 'Putting the pieces together',
  unpacking: 'Unpacking the backup',
  reading: "Reading Peachtree's books",
  analysing: 'Checking what was read',
  done: 'Done',
};

/** "Reading Peachtree's books — JrnlRow, 48%". */
export function uploadStageText(p: MigrationUploadProgress | null): string {
  if (!p) return 'Waiting to be read';
  const pct = p.total && p.done !== undefined ? ` ${Math.min(100, Math.floor((p.done / p.total) * 100))}%` : '';
  return `${UPLOAD_STAGE_LABEL[p.stage] ?? 'Reading'}${p.detail ? ` — ${p.detail}` : ''}${pct ? ',' + pct : ''}`;
}

/** 253.6 MB */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

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

/**
 * The day the opening balances are posted on: the close of business before the
 * cutover day. The server sends it; an older server did not, so it is derived.
 */
export function openingDateOf(b: Pick<MigrationBatch, 'cutoverDate' | 'openingDate'>): string {
  if (b.openingDate) return b.openingDate;
  const [y, m, d] = b.cutoverDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}
export function canSignOff(b: Pick<MigrationBatch, 'status'>, spotChecks: SpotCheck[], ticked: ReadonlySet<number>, confirmed: boolean): boolean {
  return b.status === 'ready' && confirmed && spotChecks.every((_, i) => ticked.has(i));
}

/** The web wizard for one batch, for "Continue on the web". */
export const webBatchUrl = (webAppUrl: string, id: string) => `${webAppUrl.replace(/\/$/, '')}/settings/migration/${id}`;
