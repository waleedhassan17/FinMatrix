import { MIGRATION_ERRORS_EN, migrationErrorMessage } from '../migrationErrors';

describe('migrationErrorMessage', () => {
  it('turns a server code into plain words', () => {
    expect(migrationErrorMessage('MIGRATION_REQUIRES_EMPTY_BOOKS')).toMatch(/already has transactions/);
    expect(migrationErrorMessage('EXPORT_RATE_LIMITED', 'Too many')).toMatch(/3 backups an hour/);
    expect(migrationErrorMessage('ROLLBACK_BLOCKED')).toMatch(/can no longer be undone/);
  });
  it("falls back to the server's own sentence, then a generic one", () => {
    expect(migrationErrorMessage('SOMETHING_NEW', 'Exact server text')).toBe('Exact server text');
    expect(migrationErrorMessage(undefined, '  ')).toMatch(/Something went wrong/);
  });
  it('every code has a plain-English sentence', () => {
    for (const code of Object.keys(MIGRATION_ERRORS_EN)) {
      expect(migrationErrorMessage(code)).toBe(MIGRATION_ERRORS_EN[code]);
    }
  });
  it('a trial that ended explains itself instead of a raw code', () => {
    expect(migrationErrorMessage('TRIAL_ENDED', 'raw')).toMatch(/trial has ended/i);
    expect(migrationErrorMessage('ACCOUNT_NOT_FOUND', 'raw')).toMatch(/chart of accounts/i);
  });
  it('covers every code the Migration Center and backup return', () => {
    for (const code of [
      'MIGRATION_REQUIRES_EMPTY_BOOKS',
      'MIGRATION_INVALID_TRANSITION',
      'MIGRATION_FILE_TOO_LARGE',
      'MIGRATION_FILE_UNREADABLE',
      'MIGRATION_UNKNOWN_SHEET',
      'MIGRATION_REQUIRED_COLUMN_MISSING',
      'AMBIGUOUS_DATE_FORMAT',
      'DUPLICATE_RECORD',
      'CHECK_FAILED',
      'NOT_SIGNED_OFF',
      'ROLLBACK_BLOCKED',
      'MIGRATED_DOCUMENT_IMMUTABLE',
      'EXPORT_NOT_READY',
      'EXPORT_EXPIRED',
      'EXPORT_RATE_LIMITED',
    ]) {
      expect(MIGRATION_ERRORS_EN[code]).toBeTruthy();
    }
  });
});
