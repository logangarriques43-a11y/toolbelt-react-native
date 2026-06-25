/**
 * MoneyText — renders a number using the compact USD formatter.
 * Convenience wrapper so `$1.23k`-style values stay consistent app-wide.
 */

import { Text, type TextProps } from 'react-native';

import { compactMoney } from '@/lib/compact-money';

export interface MoneyTextProps extends TextProps {
  value: number;
  /** When false, renders full currency instead of the compact form. */
  compact?: boolean;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function MoneyText({ value, compact = true, ...rest }: MoneyTextProps) {
  return <Text {...rest}>{compact ? compactMoney(value) : usd.format(value)}</Text>;
}
