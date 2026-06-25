/**
 * ToolBelt design tokens — ported 1:1 from AppTheme.swift.
 *
 * SwiftUI defined colors as `Color(red:green:blue:)` floats (0–1). Those are
 * converted to hex here (value * 255, rounded). Tokens that SwiftUI built from
 * `Color.gray.opacity(x)` are resolved at use-time via `withOpacity` so they
 * stay faithful to iOS systemGray.
 */

import type { ViewStyle } from 'react-native';

import { SYSTEM_GRAY, withOpacity } from '@/lib/color';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Resolved semantic palette for one appearance (light or dark). */
export interface Palette {
  isDark: boolean;
  background: string;
  cardBackground: string;
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  gradientTop: string;
  gradientBottom: string;
  inputBackground: string;
  divider: string;
  chevronTint: string;
  shadowColor: string;
  shadowOpacity: number;
  shadowLightOpacity: number;
  iconBackgroundOpacity: number;
  /** Text-field / control border — `Color.gray.opacity(0.3)`. Mode-independent. */
  fieldBorder: string;
}

/** Raw, mode-independent palette pieces. */
const SHARED = {
  fieldBorder: withOpacity(SYSTEM_GRAY, 0.3),
} as const;

export const LIGHT: Palette = {
  isDark: false,
  /** Main page backgrounds (behind cards) — rgb(0.96, 0.97, 0.99). */
  background: '#F5F7FC',
  /** Card / surface backgrounds — Color.white. */
  cardBackground: '#FFFFFF',
  /** Primary text — Color.black. */
  primaryText: '#000000',
  /** Secondary text — Color.gray (systemGray). */
  secondaryText: SYSTEM_GRAY,
  /** Tertiary / hint text — gray.opacity(0.7). */
  tertiaryText: withOpacity(SYSTEM_GRAY, 0.7),
  /** Top of the dashboard gradient — rgb(0.93, 0.96, 1.0). */
  gradientTop: '#EDF5FF',
  /** Bottom of the dashboard gradient — rgb(0.98, 0.95, 1.0). */
  gradientBottom: '#FAF2FF',
  /** Input / text-field background — rgb(0.95, 0.95, 0.97). */
  inputBackground: '#F2F2F7',
  /** Divider / separator lines — gray.opacity(0.15). */
  divider: withOpacity(SYSTEM_GRAY, 0.15),
  /** Chevron / nav-row icon tint — gray.opacity(0.5). */
  chevronTint: withOpacity(SYSTEM_GRAY, 0.5),
  /** Shadow color for elevated cards — black.opacity(0.08). */
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  /** Subtle elevation shadow — black.opacity(0.05). */
  shadowLightOpacity: 0.05,
  /** Opacity used by `iconBackground(color)` — 0.12 in light mode. */
  iconBackgroundOpacity: 0.12,
  ...SHARED,
} as const;

export const DARK: Palette = {
  isDark: true,
  /** rgb(0.11, 0.11, 0.12). */
  background: '#1C1C1F',
  /** rgb(0.17, 0.17, 0.18). */
  cardBackground: '#2B2B2E',
  primaryText: '#FFFFFF',
  /** rgb(0.6, 0.6, 0.65). */
  secondaryText: '#9999A6',
  /** rgb(0.45, 0.45, 0.5). */
  tertiaryText: '#737380',
  /** rgb(0.08, 0.10, 0.15). */
  gradientTop: '#141A26',
  /** rgb(0.12, 0.10, 0.15). */
  gradientBottom: '#1F1A26',
  /** rgb(0.22, 0.22, 0.24). */
  inputBackground: '#38383D',
  /** gray.opacity(0.3). */
  divider: withOpacity(SYSTEM_GRAY, 0.3),
  /** gray.opacity(0.6). */
  chevronTint: withOpacity(SYSTEM_GRAY, 0.6),
  shadowColor: '#000000',
  shadowOpacity: 0.3,
  shadowLightOpacity: 0.2,
  iconBackgroundOpacity: 0.2,
  ...SHARED,
} as const;

/**
 * Brand accent — the blue→purple used for auth headers, primary CTAs and links.
 * SwiftUI: Color(red:0.4,green:0.5,blue:0.95) → Color(red:0.6,green:0.4,blue:0.9).
 */
export const Brand = {
  accent: '#6680F2',
  gradient: ['#6680F2', '#9966E6'] as const,
};

/**
 * iOS system colors (light appearance) — SwiftUI's `Color.blue`, `.green`, etc.
 * Referenced by name throughout the Swift source (dashboard tiles, accents), so
 * kept as a named map to port those references 1:1.
 */
export const iOSColors = {
  blue: '#007AFF',
  green: '#34C759',
  indigo: '#5856D6',
  orange: '#FF9500',
  pink: '#FF2D55',
  purple: '#AF52DE',
  red: '#FF3B30',
  teal: '#30B0C7',
  yellow: '#FFCC00',
  gray: '#8E8E93',
  cyan: '#32ADE6',
  mint: '#00C7BE',
  brown: '#A2845E',
} as const;

/** Corner radii used across the app (from the various `.cornerRadius(...)` calls). */
export const Radius = {
  field: 10,
  card: 16,
  featured: 20,
  control: 12,
} as const;

/** Shared spacing scale (matches the existing starter scale). */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Resolves a card shadow style for the given palette — mirrors
 * `.shadow(color: theme.shadowColor, radius: 12, x: 0, y: 4)`.
 */
export function cardShadow(palette: Palette): ViewStyle {
  return {
    shadowColor: palette.shadowColor,
    shadowOpacity: palette.shadowOpacity,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  };
}

/** Lighter elevation — mirrors `.shadow(color: theme.shadowLight, radius: 8, y: 2)`. */
export function lightShadow(palette: Palette): ViewStyle {
  return {
    shadowColor: palette.shadowColor,
    shadowOpacity: palette.shadowLightOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  };
}
