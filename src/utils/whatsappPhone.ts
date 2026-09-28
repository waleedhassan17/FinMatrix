// ═══════════════════════════════════════════════════════
// FinMatrix — WhatsApp numbers
// ═══════════════════════════════════════════════════════
// One rule for every "open their WhatsApp chat" in the app — invoices,
// estimates, sales orders, the outstanding summary — and the same rule the
// website's share menu uses.

/**
 * A phone number as wa.me wants it: digits only, country code first.
 *
 * Pakistani local forms (0300…, 300…) gain 92. That is how numbers are
 * usually saved here, and without it wa.me opens a chat with a number that
 * does not exist. Anything too short or too long is dropped rather than
 * guessed at.
 */
export const normalizeWhatsappPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith('3')) digits = `92${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
};
