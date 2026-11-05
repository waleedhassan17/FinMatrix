import { normalizeWhatsappPhone } from './whatsappPhone';

/**
 * How a WhatsApp number will read once saved, for the live preview under the
 * field: "+92 300 1234567". Uses the same rule as every wa.me hand-off
 * (normalizeWhatsappPhone) and the server, so what the preview shows is what
 * gets messaged. Null when it is not a usable number.
 */
export function formatWhatsappPreview(raw: string | null | undefined): string | null {
  const digits = normalizeWhatsappPhone(raw);
  if (!digits) return null;
  if (digits.startsWith('92') && digits.length === 12) {
    return `+92 ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

/** The same number masked like the server shows it: +92300***4567. */
export function maskWhatsapp(raw: string | null | undefined): string | null {
  const digits = normalizeWhatsappPhone(raw) ?? (raw ? String(raw).replace(/\D/g, '') : '');
  if (!digits || digits.length < 9) return null;
  return `+${digits.slice(0, 5)}***${digits.slice(-4)}`;
}
