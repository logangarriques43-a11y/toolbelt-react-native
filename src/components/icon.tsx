/**
 * Icon — cross-platform icon renderer.
 *
 * Call sites use SF Symbol names (the app was ported from SwiftUI). SF Symbols
 * are Apple-only and render nothing on Android, so each name is resolved through
 * ICON_MAP to an @expo/vector-icons glyph that renders on iOS AND Android. The
 * public API (`name` / `size` / `color` / `weight` / `fallback`) is unchanged,
 * so no call site needs to change.
 *
 * `weight` is accepted for API compatibility but has no effect — vector-icon
 * fonts don't expose SF Symbol weights. An unmapped name renders `fallback` (or
 * a help glyph) and warns in dev, so a missing entry never silently disappears.
 */

import { FontAwesome, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import type { ComponentType, ReactNode } from 'react';

import { ICON_MAP, type IconFamily } from '@/components/icon-map';

/** An SF Symbol name (any of the mapped ones; other strings still accepted). */
export type SFSymbol = keyof typeof ICON_MAP | (string & {});

export interface IconProps {
  /** SF Symbol name, e.g. "calendar" or "creditcard.fill". */
  name: SFSymbol;
  size?: number;
  color?: string;
  /** Accepted for API compatibility; vector-icon fonts have no weight. */
  weight?: string;
  /** Rendered when `name` has no mapping (should not happen for used names). */
  fallback?: ReactNode;
}

type IconComponent = ComponentType<{ name: string; size?: number; color?: string }>;

const FAMILIES: Record<IconFamily, IconComponent> = {
  mci: MaterialCommunityIcons as IconComponent,
  ion: Ionicons as IconComponent,
  mat: MaterialIcons as IconComponent,
  fa: FontAwesome as IconComponent,
};

export function Icon({ name, size = 24, color, fallback }: IconProps) {
  const entry = ICON_MAP[name];
  if (!entry) {
    if (__DEV__) console.warn(`[Icon] no mapping for SF Symbol "${name}" — add it to icon-map.ts`);
    if (fallback !== undefined) return <>{fallback}</>;
    return <MaterialCommunityIcons name="help-circle-outline" size={size} color={color} />;
  }
  const [family, glyph] = entry;
  const Family = FAMILIES[family];
  return <Family name={glyph} size={size} color={color} />;
}
