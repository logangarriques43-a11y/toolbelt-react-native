/**
 * App theme context — the RN counterpart to `@Observable AppTheme` +
 * `@Environment(AppTheme.self)` in SwiftUI.
 *
 * Provides the resolved palette for the chosen look plus helpers. The choice
 * (System / Light / Dark / Noir / Clay / Editorial / Plum) is persisted to
 * AsyncStorage under the same key iOS uses in UserDefaults (`appThemeMode`).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

import {
  DISPLAY_FONT,
  PALETTES,
  resolveLook,
  type Appearance,
  type Palette,
  type ThemeMode,
} from '@/theme/tokens';

const STORAGE_KEY = 'appThemeMode';

const STORED: Record<string, Appearance> = {
  System: 'system', Light: 'light', Dark: 'dark',
  Noir: 'noir', Clay: 'clay', Editorial: 'editorial', Plum: 'plum',
};

function storedValue(a: Appearance): string {
  return a[0].toUpperCase() + a.slice(1);
}

export interface AppTheme extends Palette {
  /** The stored choice; `system` follows the device between Sage light/dark. */
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  /** System/Light/Dark view of `appearance` for the segmented control. */
  mode: ThemeMode | null;
  setMode: (mode: ThemeMode) => void;
  /** Icon-tile fill. The colour argument is ignored: tiles use the look's accent. */
  iconBackground: (color?: string) => string;
  /** Kept for older call sites; every stop is `background` (no gradients). */
  dashboardGradient: readonly [string, string, string];
  /** Flat card: surface fill, hairline outline, the look's corner radius. */
  card: ViewStyle;
  /** Serif display text for headings 20pt and up. */
  display: (size: number, weight?: TextStyle['fontWeight']) => TextStyle;
}

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<Appearance>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && STORED[v]) setAppearanceState(STORED[v]);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<AppTheme>(() => {
    const palette = PALETTES[resolveLook(appearance, systemScheme === 'dark')];
    const setAppearance = (a: Appearance) => {
      setAppearanceState(a);
      AsyncStorage.setItem(STORAGE_KEY, storedValue(a)).catch(() => {});
    };
    const mode: ThemeMode | null =
      appearance === 'system' || appearance === 'light' || appearance === 'dark' ? appearance : null;

    return {
      ...palette,
      appearance,
      setAppearance,
      mode,
      setMode: setAppearance,
      iconBackground: () => palette.accentSoft,
      dashboardGradient: [palette.background, palette.background, palette.background] as const,
      card: {
        backgroundColor: palette.cardBackground,
        borderRadius: palette.cornerRadius,
        borderWidth: 1,
        borderColor: palette.divider,
      },
      display: (size, weight = '400') => ({
        fontFamily: DISPLAY_FONT,
        fontSize: size,
        fontWeight: weight,
        color: palette.primaryText,
      }),
    };
  }, [appearance, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the resolved ToolBelt theme. Must be used under `<ThemeProvider>`. */
export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return theme;
}
