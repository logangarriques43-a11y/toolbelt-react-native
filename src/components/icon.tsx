/**
 * Icon — thin wrapper over expo-symbols `SymbolView` so SF Symbol names from
 * the SwiftUI source (`Image(systemName: "…")`) port across 1:1.
 *
 * On iOS this renders the real SF Symbol (pixel-faithful). On Android/web a
 * bare symbol name renders nothing, so callers targeting those platforms should
 * pass `fallback`. ToolBelt is iOS-first, so most usages just pass the name.
 */

import { SymbolView, type SymbolViewProps, type SymbolWeight } from 'expo-symbols';
import type { ReactNode } from 'react';

export interface IconProps {
  /** SF Symbol name, e.g. "calendar" or "creditcard.fill". */
  name: SymbolViewProps['name'];
  size?: number;
  color?: string;
  weight?: SymbolWeight;
  /** Shown on platforms that can't render the symbol (Android/web). */
  fallback?: ReactNode;
}

export function Icon({ name, size = 24, color, weight, fallback }: IconProps) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      fallback={fallback}
    />
  );
}
