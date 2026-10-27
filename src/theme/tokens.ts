/**
 * ToolBelt design tokens — the Sage house style plus four alternate looks,
 * ported from AppTheme.swift (iOS PR #370). Every screen reads colours from the
 * resolved palette: no per-feature colours, no gradients, no coloured shadows.
 * Semantic colours (red errors, green ticks, user-picked staff/service colours)
 * still come from `iOSColors`.
 */

import { Platform, type ViewStyle } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Every look the user can pick in Settings → Appearance. `light`/`dark` are the
 * Sage house style; the other four are fixed looks that ignore the device
 * appearance. Mirrors AppTheme.swift (iOS key `appThemeMode`).
 */
export type Appearance = 'system' | 'light' | 'dark' | 'noir' | 'clay' | 'editorial' | 'plum';
export type LookId = 'sageLight' | 'sageDark' | 'noir' | 'clay' | 'editorial' | 'plum';

/** How the home dashboard lays out the day for a given look. */
export type HomeLayout = 'hero' | 'timeline' | 'card' | 'editorial' | 'agenda';

/** Resolved semantic palette for one look. */
export interface Palette {
  look: LookId;
  isDark: boolean;
  background: string;
  /** Card / surface fill. */
  cardBackground: string;
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  /** Kept for older call sites; equal to `background` (no gradients). */
  gradientTop: string;
  gradientBottom: string;
  /** Text-field / segmented-control fill (`surfaceMuted`). */
  inputBackground: string;
  /** Hairline separators and card outlines. */
  divider: string;
  chevronTint: string;
  shadowColor: string;
  /** Cards are flat in every look; kept at 0 for older call sites. */
  shadowOpacity: number;
  shadowLightOpacity: number;
  iconBackgroundOpacity: number;
  /** Text-field / control border. */
  fieldBorder: string;
  accent: string;
  /** Text and glyphs drawn on an `accent` fill. Never assume white. */
  onAccent: string;
  /** Icon-tile and selected-chip fill. */
  accentSoft: string;
  /** The one emphasised card on a screen (Up next). */
  hero: string;
  onHero: string;
  /** Highest-emphasis button fill. */
  inverse: string;
  onInverse: string;
  /** "Live" status colour and its pill fill. */
  live: string;
  liveSoft: string;
  /** Card corner radius for this look. */
  cornerRadius: number;
  /** Newsprint look: square corners, uppercase tracked labels, rules. */
  isEditorial: boolean;
  homeLayout: HomeLayout;
}

interface LookSpec {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceMuted: string;
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  hairline: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  hero: string;
  onHero: string;
  inverse: string;
  onInverse: string;
  live: string;
  liveSoft: string;
  cornerRadius: number;
  homeLayout: HomeLayout;
}

const LOOKS: Record<LookId, LookSpec> = {
  sageLight: {
    isDark: false, background: '#ECEDE6', surface: '#F7F8F3', surfaceMuted: '#E4E6DE',
    primaryText: '#1D201C', secondaryText: '#6A6E66', tertiaryText: '#9A9D95', hairline: '#D9DBD2',
    accent: '#3A5240', onAccent: '#F4F5EE', accentSoft: '#DCE4D7', hero: '#3A5240', onHero: '#F4F5EE',
    inverse: '#1D201C', onInverse: '#F4F5EE', live: '#3A5240', liveSoft: '#DCE4D7',
    cornerRadius: 20, homeLayout: 'hero',
  },
  sageDark: {
    isDark: true, background: '#141714', surface: '#1E221E', surfaceMuted: '#262B26',
    primaryText: '#ECEEE7', secondaryText: '#9DA398', tertiaryText: '#6D7369', hairline: '#2E342E',
    accent: '#9CC2A3', onAccent: '#132016', accentSoft: '#25352A', hero: '#2E4534', onHero: '#EEF2EA',
    inverse: '#ECEEE7', onInverse: '#141714', live: '#9CC2A3', liveSoft: '#25352A',
    cornerRadius: 20, homeLayout: 'hero',
  },
  noir: {
    isDark: true, background: '#171512', surface: '#221F1B', surfaceMuted: '#2A2621',
    primaryText: '#F2EEE6', secondaryText: '#9B958B', tertiaryText: '#6B665E', hairline: '#35312B',
    accent: '#D6B46C', onAccent: '#1A1712', accentSoft: '#3A3222', hero: '#221F1B', onHero: '#F2EEE6',
    inverse: '#EFE7DA', onInverse: '#1A1712', live: '#8FC79A', liveSoft: '#24301F',
    cornerRadius: 18, homeLayout: 'timeline',
  },
  clay: {
    isDark: false, background: '#F4ECE4', surface: '#FCF8F3', surfaceMuted: '#EFE4D9',
    primaryText: '#2A1F1A', secondaryText: '#7A6A60', tertiaryText: '#A89A90', hairline: '#E5D8CB',
    accent: '#9F4F2B', onAccent: '#FFF8F2', accentSoft: '#F4DCCF', hero: '#FCF8F3', onHero: '#2A1F1A',
    inverse: '#2A1F1A', onInverse: '#FFF8F2', live: '#4E7A57', liveSoft: '#E2EBDD',
    cornerRadius: 22, homeLayout: 'card',
  },
  editorial: {
    isDark: false, background: '#EAE3D8', surface: '#F2ECE3', surfaceMuted: '#E1D9CC',
    primaryText: '#141210', secondaryText: '#6E675E', tertiaryText: '#9C9488', hairline: '#CFC6B8',
    accent: '#9A4A26', onAccent: '#FBF6EF', accentSoft: '#EBD7CA', hero: '#EAE3D8', onHero: '#141210',
    inverse: '#141210', onInverse: '#FBF6EF', live: '#3D6B4A', liveSoft: '#DCE3D3',
    cornerRadius: 2, homeLayout: 'editorial',
  },
  plum: {
    isDark: false, background: '#F8EFEB', surface: '#FFFFFF', surfaceMuted: '#F1E3E0',
    primaryText: '#2A1A20', secondaryText: '#7B6970', tertiaryText: '#A8979D', hairline: '#EBDCD9',
    accent: '#6B2F4A', onAccent: '#FFF6F8', accentSoft: '#F2DEE5', hero: '#FFFFFF', onHero: '#2A1A20',
    inverse: '#2A1A20', onInverse: '#FFF6F8', live: '#4E7A57', liveSoft: '#E2EBDD',
    cornerRadius: 20, homeLayout: 'agenda',
  },
};

function buildPalette(look: LookId): Palette {
  const l = LOOKS[look];
  return {
    look,
    isDark: l.isDark,
    background: l.background,
    cardBackground: l.surface,
    primaryText: l.primaryText,
    secondaryText: l.secondaryText,
    tertiaryText: l.tertiaryText,
    gradientTop: l.background,
    gradientBottom: l.background,
    inputBackground: l.surfaceMuted,
    divider: l.hairline,
    chevronTint: l.tertiaryText,
    shadowColor: '#000000',
    shadowOpacity: 0,
    shadowLightOpacity: 0,
    iconBackgroundOpacity: l.isDark ? 0.2 : 0.12,
    fieldBorder: l.hairline,
    accent: l.accent,
    onAccent: l.onAccent,
    accentSoft: l.accentSoft,
    hero: l.hero,
    onHero: l.onHero,
    inverse: l.inverse,
    onInverse: l.onInverse,
    live: l.live,
    liveSoft: l.liveSoft,
    cornerRadius: l.cornerRadius,
    isEditorial: look === 'editorial',
    homeLayout: l.homeLayout,
  };
}

export const PALETTES: Record<LookId, Palette> = {
  sageLight: buildPalette('sageLight'),
  sageDark: buildPalette('sageDark'),
  noir: buildPalette('noir'),
  clay: buildPalette('clay'),
  editorial: buildPalette('editorial'),
  plum: buildPalette('plum'),
};

export const LIGHT: Palette = PALETTES.sageLight;
export const DARK: Palette = PALETTES.sageDark;

/** Resolve the stored appearance + device scheme to a concrete look. */
export function resolveLook(appearance: Appearance, systemIsDark: boolean): LookId {
  switch (appearance) {
    case 'system': return systemIsDark ? 'sageDark' : 'sageLight';
    case 'light': return 'sageLight';
    case 'dark': return 'sageDark';
    default: return appearance;
  }
}

/**
 * Settings → Appearance swatches. `system/light/dark` sit in the segmented
 * control; the other four are the "More looks" grid.
 */
export const LOOK_SWATCHES: { appearance: Appearance; look: LookId; title: string; subtitle: string }[] = [
  { appearance: 'light', look: 'sageLight', title: 'Light', subtitle: 'Sage on paper' },
  { appearance: 'dark', look: 'sageDark', title: 'Dark', subtitle: 'Sage after hours' },
  { appearance: 'noir', look: 'noir', title: 'Noir', subtitle: 'Black and gold' },
  { appearance: 'clay', look: 'clay', title: 'Clay', subtitle: 'Terracotta and cream' },
  { appearance: 'editorial', look: 'editorial', title: 'Editorial', subtitle: 'Newsprint and hairlines' },
  { appearance: 'plum', look: 'plum', title: 'Plum', subtitle: 'Blush and plum' },
];

/**
 * Serif display face for headings 20pt and up (iOS used New York). Android
 * ships Noto Serif as the `serif` family; iOS falls back to Georgia.
 */
export const DISPLAY_FONT = Platform.select({ ios: 'Georgia', default: 'serif' });

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
 * Card chrome for the redesign: flat, with a 1px hairline outline. Named for
 * the shadow it replaced so existing call sites pick up the new look.
 */
export function cardShadow(palette: Palette): ViewStyle {
  return { borderWidth: 1, borderColor: palette.divider };
}

/** Same flat outline as `cardShadow` (the lighter elevation it replaced is gone too). */
export function lightShadow(palette: Palette): ViewStyle {
  return { borderWidth: 1, borderColor: palette.divider };
}
