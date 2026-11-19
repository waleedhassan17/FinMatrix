// ═══════════════════════════════════════════════════════
// FinMatrix — Migration Center and backup error messages
// One map from server code to plain words. The app has no i18n
// system yet: the Urdu map holds TODO_UR placeholders, and
// migrationErrorMessage falls back to English, then to the
// server's own sentence.
// ═══════════════════════════════════════════════════════

export const MIGRATION_ERRORS_EN: Record<string, string> = {
  MIGRATION_REQUIRES_EMPTY_BOOKS: 'This company already has transactions in its books. The Migration Center brings opening balances into a company that has not posted anything yet.',
  MIGRATION_INVALID_TRANSITION: 'That step is not available at this stage of the migration.',
  MIGRATION_FILE_TOO_LARGE: 'That file is too large. Spreadsheets can be up to 25 MB each (split a larger one into several files); a Peachtree backup (.ptb) up to 2 GB.',
  MIGRATION_FILE_UNREADABLE: 'We could not open that file. Save it as .xlsx or .csv (or export Tally as XML) and retry.',
  MIGRATION_UNKNOWN_SHEET: 'We could not tell what one of the sheets holds. Choose its type on the web.',
  MIGRATION_REQUIRED_COLUMN_MISSING: 'A sheet is missing a column we need. Pick it on the web.',
  MIGRATION_FEATURE_DISABLED: 'Your plan does not include inventory, so stock cannot be imported.',
  AMBIGUOUS_DATE_FORMAT: 'The dates in a file could be day/month or month/day. Tell us which on the web.',
  INVALID_AMOUNT: 'One of the amounts is not a number we can read.',
  INVALID_DATE: 'One of the dates is not a date we can read.',
  INVALID_VALUE: 'One of the values is not one we recognise.',
  MISSING_REQUIRED_VALUE: 'A required value is empty.',
  MAPPING_UNCONFIRMED: 'A match needs your confirmation.',
  AMOUNT_READBACK_MISMATCH: 'An amount can be read two ways. Type it plainly on the web (for example 120000) so there is only one.',
  DATE_READBACK_MISMATCH: 'A date can be read two ways. Type it as year-month-day on the web (for example 2026-06-30).',
  DUPLICATE_RECORD: 'A record appears twice. Merge the rows or skip one.',
  UNKNOWN_ACCOUNT: 'An account in your trial balance is not in your chart of accounts.',
  UNKNOWN_CUSTOMER: 'An invoice names a customer we cannot find.',
  UNKNOWN_VENDOR: 'A bill names a vendor we cannot find.',
  UNKNOWN_ITEM: 'A stock line names an item we cannot find.',
  AI_QUESTION: 'The mapping assistant has a question for you.',
  CHECK_FAILED: 'A reconciliation check failed, so nothing was imported.',
  NOT_SIGNED_OFF: 'Review the certificate, tick every spot check, then sign off before importing.',
  ROLLBACK_BLOCKED: 'This migration can no longer be undone, because newer records depend on it.',
  MIGRATED_DOCUMENT_IMMUTABLE: 'This document came from your migration. Undo the migration, or settle it with a payment or credit.',
  EXPORT_NOT_READY: 'This backup is still being built. Try again in a moment.',
  EXPORT_EXPIRED: 'This backup has expired. Create a new one.',
  EXPORT_LINK_INVALID: 'This download link is not valid. Create a new backup.',
  EXPORT_RATE_LIMITED: 'You can create up to 3 backups an hour. Download the latest one, or try again later.',
  MIGRATION_UPLOAD_INCOMPLETE: 'Part of the backup has not arrived yet. Choose the same file again: only the missing pieces are sent.',
  MIGRATION_UPLOAD_PART_CORRUPT: 'A piece of the backup was damaged on the way. Choose the same file again: only the damaged pieces are sent again.',
  MIGRATION_USE_LARGE_UPLOAD: 'A Peachtree backup (.ptb) is sent in pieces. Add it on its own.',
  MIGRATION_SERVER_DISK_FULL: 'The server has too little room to read this backup right now. It tries again by itself; if it still fails, contact support.',
  MIGRATION_PTB_UNREADABLE: 'This is not a readable Peachtree backup. In Peachtree use File → Back Up, and upload that file exactly as it was saved.',
  MIGRATION_PTB_UNSUPPORTED: 'This backup is from a Peachtree / Sage 50 version FinMatrix cannot read yet. Contact support and tell us the Peachtree version.',
  MIGRATION_PTB_TABLE_MISSING: 'This backup is missing part of the company. In Peachtree use File → Back Up for the whole company, and upload that file.',
  PEACHTREE_CROSSCHECK_FAILED: "Peachtree's own figures in this backup disagree with each other. Run Peachtree's data verification, make a new backup and upload it.",
  PEACHTREE_POSTED_AFTER_CUTOVER: 'Peachtree has entries on or after your cutover date. Choose a cutover date after the last Peachtree entry.',
  PEACHTREE_CONTROL_DIFFERENCE: 'A Peachtree control account does not agree with its customers, vendors or items. Accept it on the web, or correct it in Peachtree.',
  PEACHTREE_NET_CREDIT: 'Some customers or vendors have credits left over. Accept them on the web to bring them in as advances.',
  PEACHTREE_FISCAL_YEAR: "Peachtree's fiscal year starts in a different month from this company's. Make them the same before importing.",
  PEACHTREE_REPORTS_MISSING: "Add Peachtree's General Ledger Trial Balance, Aged Receivables and Aged Payables (and Inventory Valuation if you keep stock), exported to Excel as of the day before your cutover.",
  PEACHTREE_REPORT_MISMATCH: 'A Peachtree report does not agree with the backup. Export the reports again from the same company, as of the day before your cutover.',
  SOURCE_REPORTS_MISSING: 'A report is still needed: your trial balance has a balance it explains (receivables, payables or stock). Export it as of the day before your cutover and upload it.',
  SOURCE_REPORT_DUPLICATE: 'The same report was uploaded twice. Remove one of them.',
  SOURCE_REPORT_DATE: 'A report is not as of the day before your cutover. Change the cutover date if every report is right, or export the report again for the right date.',
  SOURCE_TOTALS_MISMATCH: "A report's own printed total does not match its lines. Export it again from your old system, unchanged, and upload it.",
  SOURCE_NET_CREDIT: 'Some customers or vendors have more credit than open invoices or bills. Accept to bring the rest in as advances, or apply the credits in your old system first.',
};

/** TODO_UR: every entry awaits translation; until then English is shown. */
export const MIGRATION_ERRORS_UR: Record<string, string> = Object.fromEntries(
  Object.keys(MIGRATION_ERRORS_EN).map((c) => [c, `TODO_UR ${c}`]),
);

export function migrationErrorMessage(code?: string | null, serverMessage?: string | null, lang: 'en' | 'ur' = 'en'): string {
  if (code && MIGRATION_ERRORS_EN[code]) {
    const ur = MIGRATION_ERRORS_UR[code];
    return lang === 'ur' && ur && !ur.startsWith('TODO_UR') ? ur : MIGRATION_ERRORS_EN[code];
  }
  return serverMessage?.trim() || 'Something went wrong. Please try again.';
}
