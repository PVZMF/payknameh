// Shared by every module (Standards §2: numbers only through the shared Persian-digit
// function). Pure functions, no framework imports.

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const integerFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

/** Formats a number for display with Persian digits and separators: 12500 → ۱۲٬۵۰۰. */
export function formatNumber(value: number | bigint, options?: Intl.NumberFormatOptions): string {
  return options
    ? new Intl.NumberFormat("fa-IR", options).format(value)
    : integerFormat.format(value);
}

/** Replaces Latin digits in text with Persian digits, leaving everything else untouched. */
export function toPersianDigits(text: string): string {
  return text.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS.charAt(Number(digit)));
}

/** Turns Persian and Arabic digits into Latin ones so user input can be parsed. */
export function toLatinDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = PERSIAN_DIGITS.indexOf(digit);
    return String(persian >= 0 ? persian : ARABIC_DIGITS.indexOf(digit));
  });
}

/**
 * Parses an integer typed with Persian, Arabic or Latin digits, ignoring spaces and
 * thousands separators. Returns null when the input is not a whole number.
 */
export function parseInteger(input: string): number | null {
  const normalized = toLatinDigits(input).replace(/[\s,٬،]/g, "");
  if (!/^-?\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}
