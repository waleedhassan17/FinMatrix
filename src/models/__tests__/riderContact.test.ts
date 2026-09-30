import { riderContactEmail, riderEmailError } from '../riderContact';

describe('riderContactEmail', () => {
  it('leaves the field out when the box is empty', () => {
    // undefined, not '' — the distinction the server's @IsOptional() turns on.
    expect(riderContactEmail('')).toBeUndefined();
    expect(riderContactEmail('   ')).toBeUndefined();
    expect(riderContactEmail(null)).toBeUndefined();
    expect(riderContactEmail(undefined)).toBeUndefined();
  });

  it('never returns an empty string', () => {
    for (const raw of ['', ' ', '\t\n', null, undefined]) {
      expect(riderContactEmail(raw)).not.toBe('');
    }
  });

  it('normalises what was typed', () => {
    expect(riderContactEmail('  Ali.Khan@Example.COM ')).toBe('ali.khan@example.com');
  });
});

describe('riderEmailError', () => {
  it('accepts an empty box — a rider need not have an email', () => {
    expect(riderEmailError('')).toBeNull();
    expect(riderEmailError('  ')).toBeNull();
    expect(riderEmailError(null)).toBeNull();
  });

  it('rejects an address that was typed but is malformed', () => {
    expect(riderEmailError('ali.khan')).not.toBeNull();
    expect(riderEmailError('ali@khan')).not.toBeNull();
    expect(riderEmailError('@example.com')).not.toBeNull();
    expect(riderEmailError('ali khan@example.com')).not.toBeNull();
  });

  it('accepts a real address', () => {
    expect(riderEmailError('ali.khan@example.com')).toBeNull();
    expect(riderEmailError('  ali@example.pk  ')).toBeNull();
  });

  it('agrees with riderContactEmail: anything it passes is safe to send', () => {
    for (const raw of ['', '  ', 'ali@example.com', null, undefined]) {
      if (riderEmailError(raw) === null) {
        const sent = riderContactEmail(raw);
        expect(sent === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sent)).toBe(true);
      }
    }
  });
});
