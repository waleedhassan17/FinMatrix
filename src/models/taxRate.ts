// Validation for a typed tax percentage, matching the server's @IsTaxRate:
// a number from 0 to 100 with at most 4 decimals.

/** An error message for a rate the server would refuse, or null. Blank is fine. */
export const taxRateError = (value: string): string | null => {
  const v = value.trim();
  if (v === '') return null;
  if (!/^\d+(\.\d{1,4})?$/.test(v)) return 'Enter a percentage, e.g. 17';
  return parseFloat(v) > 100 ? 'Tax cannot exceed 100%' : null;
};
