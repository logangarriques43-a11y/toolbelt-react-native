/**
 * Color helpers for the ToolBelt design system.
 *
 * SwiftUI expresses many tints as a base color with an opacity modifier
 * (e.g. `Color.gray.opacity(0.3)` or `color.opacity(0.12)`). React Native
 * has no equivalent modifier, so we bake the alpha into an `rgba()` string.
 */

/** iOS `Color.gray` resolves to systemGray. Kept here so opacity variants match. */
export const SYSTEM_GRAY = '#8E8E93';

/**
 * Returns `hex` with the given alpha (0–1) applied, as an `rgba()` string.
 * Accepts `#RGB`, `#RRGGBB`, or already-`rgb()/rgba()` inputs.
 */
export function withOpacity(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));

  if (color.startsWith('rgb')) {
    // Replace/append alpha on an existing rgb()/rgba() value.
    const nums = color.match(/[\d.]+/g)?.slice(0, 3) ?? ['0', '0', '0'];
    return `rgba(${nums.join(', ')}, ${a})`;
  }

  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
