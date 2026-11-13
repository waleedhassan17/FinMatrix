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
  MIGRATION_FILE_TOO_LARGE: 'That file is too large. Split it into smaller files and upload them one after another.',
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
