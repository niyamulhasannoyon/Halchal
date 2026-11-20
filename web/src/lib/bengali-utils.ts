/**
 * Halchal Design System — Bengali Localization & Formatting Utilities
 *
 * Implements strict Bengali-first numeral mapping, relative time calculation,
 * and crowd-sourced reporter verification phrasing.
 */

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

const BENGALI_TO_ASCII_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/**
 * Converts Bengali digits (০-৯) to Western Arabic digits (0-9).
 */
export function toAsciiDigits(input: string | null | undefined): string {
  if (!input) return '';
  return String(input).replace(/[০-৯]/g, (d) => BENGALI_TO_ASCII_MAP[d] ?? d);
}

/**
 * Normalizes and validates Bangladeshi mobile numbers (+8801[3-9]XXXXXXXX).
 * Accepts numbers with or without +880/880/0 prefix and with Bengali or English numerals.
 */
export function normalizeBangladeshiPhone(input: string | null | undefined): {
  normalized: string;
  isValid: boolean;
  formattedLocal: string;
} {
  if (!input) {
    return { normalized: '', isValid: false, formattedLocal: '' };
  }

  // Convert any Bengali numerals to ASCII and strip non-digit characters
  const rawAscii = toAsciiDigits(input).replace(/\D/g, '');

  let digits = rawAscii;
  if (digits.startsWith('880')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Bangladeshi mobile numbers must have exactly 10 digits starting with 1[3-9]
  const isValid = /^1[3-9]\d{8}$/.test(digits);
  const normalized = isValid ? `+880${digits}` : '';
  const formattedLocal = isValid ? `0${digits}` : '';

  return {
    normalized,
    isValid,
    formattedLocal,
  };
}

/**
 * Converts Western Arabic digits (0-9) to Bengali digits (০-৯).
 * Employs Intl.NumberFormat('bn-BD') as the primary engine with a manual-map fallback.
 */
export function toBengaliDigits(input: number | string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }

  // If numeric and within safe range, attempt Intl.NumberFormat
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return '';
    try {
      // useGrouping: false keeps the raw digits clean without thousand separators unless specified
      const formatter = new Intl.NumberFormat('bn-BD', { useGrouping: false });
      return formatter.format(input);
    } catch {
      // Fallback to manual map if Intl fails
      return String(input).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);
    }
  }

  // If input is a string, replace every ASCII digit with its Bengali counterpart
  return String(input).replace(/\d/g, (digit) => {
    const num = Number(digit);
    return BENGALI_DIGITS[num] ?? digit;
  });
}

/**
 * Formats a currency amount in Bengali style with commas (e.g. 1420 -> "১,৪২০").
 */
export function formatBengaliCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '';
  try {
    return new Intl.NumberFormat('bn-BD', { useGrouping: true }).format(amount);
  } catch {
    return toBengaliDigits(amount);
  }
}

/**
 * Formats a given timestamp into an accessible relative Bengali string.
 * Examples: "এইমাত্র", "৮ মিনিট আগে", "২ ঘণ্টা আগে", "৩ দিন আগে"
 */
export function formatRelativeTimeBn(
  dateInput: Date | string | number | null | undefined,
  currentDate: Date = new Date()
): string {
  if (!dateInput) return 'অজানা সময়';

  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (Number.isNaN(date.getTime())) {
    return 'অজানা সময়';
  }

  const diffMs = currentDate.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Future timestamp defense
  if (diffSec < 0) {
    return 'এইমাত্র';
  }

  // Less than 45 seconds
  if (diffSec < 45) {
    return 'এইমাত্র';
  }

  // Minutes (45s to 59m 29s)
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `${toBengaliDigits(diffMin)} মিনিট আগে`;
  }

  // Hours (60m to 23h 59m)
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) {
    return `${toBengaliDigits(diffHours)} ঘণ্টা আগে`;
  }

  // Days (24h to 29d)
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) {
    return `${toBengaliDigits(diffDays)} দিন আগে`;
  }

  // Months
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) {
    return `${toBengaliDigits(diffMonths)} মাস আগে`;
  }

  // Years
  const diffYears = Math.round(diffDays / 365);
  return `${toBengaliDigits(diffYears)} বছর আগে`;
}

/**
 * Formats reporter count based on consensus confirmation rules.
 *
 * ADR-0004 Rule:
 * - Confirmed: "৭ জন কনফার্ম করেছেন"
 * - Unverified (threshold not reached): "২ জন বলছেন, এখনো নিশ্চিত নয়"
 */
export function formatReporterCountBn(
  count: number,
  isVerified: boolean = true
): string {
  const safeCount = Math.max(0, Math.floor(count));
  const bnCount = toBengaliDigits(safeCount);

  if (safeCount === 0) {
    return isVerified
      ? 'এখনো কোনো নিশ্চিত রিপোর্ট নেই'
      : 'এখনো কেউ জানাননি';
  }

  if (isVerified) {
    return `${bnCount} জন কনফার্ম করেছেন`;
  }

  return `${bnCount} জন বলছেন, এখনো নিশ্চিত নয়`;
}
