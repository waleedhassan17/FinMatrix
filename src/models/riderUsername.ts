// ═══════════════════════════════════════════════════════
// FinMatrix — Rider username, client side
// ═══════════════════════════════════════════════════════
// Mirrors the server's src/modules/delivery-personnel/rider-username.ts, and
// the rule it must satisfy is validated there:
//
//     /^[a-z0-9][a-z0-9._-]{2,63}$/
//
// This lived inside AddDeliveryPersonnelScreen and interpolated the invite code
// as-is. Invite codes are uppercase, so every handle it produced looked like
// `FM2024.ali` — rejected with a 400, which meant adding a rider from the
// Android admin app could not succeed at all. Nothing caught it because a
// helper inside a screen file cannot be tested without the whole React Native
// component tree coming with it.

/** Reduce a fragment to the characters the username rule allows. */
const slug = (v: string): string => v.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * `companycode.firstname`, lowercase throughout.
 *
 * Falls back rather than emitting something the server will refuse: a name that
 * slugs away entirely would otherwise leave a trailing dot.
 */
export const generateRiderUsername = (companyCode: string, name: string): string => {
  const code = slug(companyCode) || 'rider';
  const firstName = slug(name.trim().split(/\s+/)[0] ?? '') || 'user';
  return `${code}.${firstName}`;
};
