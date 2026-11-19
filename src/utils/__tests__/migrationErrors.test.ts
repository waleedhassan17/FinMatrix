import { MIGRATION_ERRORS_EN, MIGRATION_ERRORS_UR, migrationErrorMessage } from '../migrationErrors';

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
  it('shows English while an Urdu entry is still a placeholder', () => {
    expect(MIGRATION_ERRORS_UR.CHECK_FAILED).toMatch(/^TODO_UR/);
    expect(migrationErrorMessage('CHECK_FAILED', null, 'ur')).toBe(MIGRATION_ERRORS_EN.CHECK_FAILED);
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
