/**
 * Compact USD money formatter — port of `Double.compactMoney` (CompactMoney.swift).
 *
 * Rules:
 *   - Below $1,000: full currency (e.g. `$123.45`)
 *   - $1,000 – $999,999: `$1.23k`
 *   - $1,000,000 – $999,999,999: `$1.23M`
 *   - $1,000,000,000 and up: `$1.23B`
 *
 * Negatives are prefixed with `-` before the dollar sign (e.g. `-$1.23k`).
 */

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Rounds to 2 decimals and strips trailing zeros: 1.00 → "1", 1.10 → "1.1". */
function trimmedDecimals(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const formatted = rounded.toFixed(2); // "1.00", "1.10", "12.34"
  if (formatted.endsWith('.00')) return formatted.slice(0, -3);
  if (formatted.endsWith('0')) return formatted.slice(0, -1);
  return formatted;
}

export function compactMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  // Under $1k: defer to the locale currency formatter so cents render cleanly.
  if (abs < 1_000) {
    return sign + usd.format(abs);
  }

  let scaled: number;
  let suffix: string;
  if (abs >= 1_000_000_000) {
    scaled = abs / 1_000_000_000;
    suffix = 'B';
  } else if (abs >= 1_000_000) {
    scaled = abs / 1_000_000;
    suffix = 'M';
  } else {
    scaled = abs / 1_000;
    suffix = 'k';
  }

  return `${sign}$${trimmedDecimals(scaled)}${suffix}`;
}
