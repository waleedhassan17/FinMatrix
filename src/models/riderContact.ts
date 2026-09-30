// ═══════════════════════════════════════════════════════
// FinMatrix — Rider contact details, client side
// ═══════════════════════════════════════════════════════
// A rider's email is a contact detail and nothing more. They sign in with the
// username the office issues (see riderUsername.ts) and they have no
// self-service recovery, so an address is genuinely optional — most riders
// have no inbox at all.
//
// The Add Rider form used to insist on one and, when none was given, invent it
// from the company name: `ali.khan@metromatrix.com`, at a domain nobody has
// ever registered. Those addresses reached the server, were stored, and then
// surfaced on the rider's own profile as if they meant something.

/**
 * The value to send for `email`, or `undefined` to leave the field out.
 *
 * `undefined`, never `''`. The server's CreatePersonnelDto marks email
 * `@IsOptional() @IsEmail()`, and class-validator's `@IsOptional()` skips
 * `null` and `undefined` only — an empty string still has to satisfy
 * `@IsEmail()`, so sending one turns "this rider has no email" into a 400.
 */
export const riderContactEmail = (raw: string | null | undefined): string | undefined =>
  (raw ?? '').trim().toLowerCase() || undefined;

/** Is this something we can send at all? An empty box is fine; a broken address is not. */
export const riderEmailError = (raw: string | null | undefined): string | null => {
  const email = (raw ?? '').trim();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Enter a valid email, or leave it empty';
};
