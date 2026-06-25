/**
 * App theme context — the RN counterpart to `@Observable AppTheme` +
 * `@Environment(AppTheme.self)` in SwiftUI.
 *
 * Provides the resolved semantic palette plus helpers (`iconBackground`,
 * `dashboardGradient`) and a `mode` the user can override (system/light/dark).
 *
 * NOTE: persistence of `mode` (SwiftUI used UserDefaults) is deferred until a
 * storage dependency is added; it currently follows the device on cold start.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { withOpacity } from '@/lib/color';
import { DARK, LIGHT, type Palette, type ThemeMode } from '@/theme/tokens';

export interface AppTheme extends Palette {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Low-opacity fill for colored icon circles — `color.opacity(isDark ? 0.2 : 0.12)`. */
  iconBackground: (color: string) => string;
  /**
   * The standard 3-stop dashboard gradient: [top, mid, bottom].
   * In SwiftUI the middle stop is `isDark ? background : white`.
   */
  dashboardGradient: readonly [string, string, string];
}

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const value = useMemo<AppTheme>(() => {
    const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
    const palette = isDark ? DARK : LIGHT;

    return {
      ...palette,
      mode,
      setMode,
      iconBackground: (color: string) =>
        withOpacity(color, palette.iconBackgroundOpacity),
      dashboardGradient: [
        palette.gradientTop,
        isDark ? palette.background : '#FFFFFF',
        palette.gradientBottom,
      ] as const,
    };
  }, [mode, systemScheme]);

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
