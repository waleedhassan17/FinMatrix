import dayjs from 'dayjs';

export const formatCurrency = (amount: number, currency = 'Rs '): string => {
  const sign = amount < 0 ? '-' : '';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${currency}${formatted}`;
};

export const formatDate = (date: string | Date): string =>
  dayjs(date).format('MMM D, YYYY');

export const formatDateTime = (date: string | Date): string =>
  dayjs(date).format('MMM D, YYYY h:mm A');

export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.substring(0, maxLength - 3) + '...';

/**
 * A large amount in the words people here count in — "60 lakh", "1 crore 25
 * lakh", "2 lakh 50 thousand" — shown beside an amount box so a missing or
 * extra zero is caught before it is saved. Null below a thousand. Mirrors the
 * web's lakhCroreWords.
 */
export const lakhCroreWords = (amount: number | string | null | undefined): string | null => {
  const value = Math.abs(typeof amount === 'number' ? amount : parseFloat(String(amount ?? '')));
  if (!Number.isFinite(value) || value < 1000) return null;
  const paisa = Math.round(value * 100);
  const whole = Math.floor(paisa / 100);
  const crore = Math.floor(whole / 10_000_000);
  const lakh = Math.floor((whole % 10_000_000) / 100_000);
  const thousand = Math.floor((whole % 100_000) / 1000);
  const rest = (paisa % 100_000) / 100;
  return [
    crore ? `${crore} crore` : '',
    lakh ? `${lakh} lakh` : '',
    thousand ? `${thousand} thousand` : '',
    rest ? String(Math.round(rest * 100) / 100) : '',
  ]
    .filter(Boolean)
    .join(' ');
};
