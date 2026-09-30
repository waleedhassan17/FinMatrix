import { generateRiderUsername } from '../riderUsername';

/**
 * The same rule the server validates with
 * (FinMatrix-Backend/src/modules/delivery-personnel/dto/delivery-personnel.dto.ts).
 *
 * The generator used to interpolate the invite code as-is, and invite codes are
 * uppercase — so every handle looked like `FM2024.ali` and the API rejected it
 * with a 400. Adding a rider from the Android admin app could not succeed at
 * all, and nothing here caught it because nothing tested it.
 */
const RIDER_USERNAME_REGEX = /^[a-z0-9][a-z0-9._-]{2,63}$/;

describe('generateRiderUsername', () => {
  it('lowercases the invite code', () => {
    // The actual bug: uppercase is the form the server hands out.
    expect(generateRiderUsername('FM2024', 'Ali Khan')).toBe('fm2024.ali');
  });

  it('produces a handle the server will accept', () => {
    for (const [code, name] of [
      ['FM2024', 'Ali Khan'],
      ['MPQYJN', 'Saim Raza'],
      ['ab', 'Zoë'],
      ['FM-2024', 'محمد'],
      ['', ''],
    ] as const) {
      expect(generateRiderUsername(code, name)).toMatch(RIDER_USERNAME_REGEX);
    }
  });

  it('strips characters the rule does not allow', () => {
    expect(generateRiderUsername('FM-2024', 'Ali')).toBe('fm2024.ali');
  });

  it('falls back rather than emitting something unusable', () => {
    // An unrepresentable name would otherwise leave a trailing dot.
    expect(generateRiderUsername('FM2024', 'محمد')).toBe('fm2024.user');
    expect(generateRiderUsername('', '')).toMatch(RIDER_USERNAME_REGEX);
  });

  it('takes only the first name', () => {
    expect(generateRiderUsername('FM2024', 'Saim Raza Khan')).toBe('fm2024.saim');
  });
});
