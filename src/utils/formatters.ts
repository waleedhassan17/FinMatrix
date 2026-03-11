import dayjs from 'dayjs';

export const formatCurrency = (amount: number, currency = '$'): string =>
  `${currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (date: string | Date): string => dayjs(date).format('MMM D, YYYY');
export const formatDateTime = (date: string | Date): string => dayjs(date).format('MMM D, YYYY h:mm A');
export const formatPhoneNumber = (phone: string): string => phone;
export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.substring(0, maxLength - 3) + '...';
