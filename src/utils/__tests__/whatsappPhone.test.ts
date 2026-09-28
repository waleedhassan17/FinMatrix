jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(), printAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));

import { normalizeWhatsappPhone } from '../whatsappPhone';
import { sanitizePhoneForWhatsApp } from '../invoiceShare';

// Every "open their WhatsApp chat" in the app goes through one rule.
describe('WhatsApp numbers', () => {
  it.each([
    ['0300 1234567', '923001234567'],
    ['0300-1234567', '923001234567'],
    ['3001234567', '923001234567'],
    ['+92 300 1234567', '923001234567'],
    ['0092 300 1234567', '923001234567'],
    ['+44 20 7946 0958', '442079460958'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeWhatsappPhone(input)).toBe(expected);
  });

  it('drops what cannot be a number rather than opening a chat with it', () => {
    expect(normalizeWhatsappPhone('12345')).toBeNull();
    expect(normalizeWhatsappPhone('')).toBeNull();
    expect(normalizeWhatsappPhone(undefined)).toBeNull();
  });

  it('is the rule the invoice, estimate and sales order shares use', () => {
    // It used to leave "0300…" as wa.me/0300…, a number that does not exist.
    expect(sanitizePhoneForWhatsApp('0300 1234567')).toBe('923001234567');
    expect(sanitizePhoneForWhatsApp('+92-300-5552200')).toBe('923005552200');
  });
});
