/**
 * GradientButton — the primary CTA on the auth screens. Since the redesign it
 * is a flat accent capsule (square + uppercase in Editorial) with `onAccent`
 * text; the name is kept so existing call sites pick up the new look.
 */

import type { SFSymbol } from 'expo-symbols';

import { ThemedButton } from '@/components/themed';

export interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Leading icon; none by default. */
  icon?: SFSymbol;
}

export function GradientButton({ title, onPress, loading = false, disabled = false, icon }: GradientButtonProps) {
  return <ThemedButton title={title} onPress={onPress} loading={loading} disabled={disabled} icon={icon} kind="accent" />;
}
