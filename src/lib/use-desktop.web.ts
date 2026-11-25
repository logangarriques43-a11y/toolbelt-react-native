import { useWindowDimensions } from 'react-native';

/**
 * Windows at least this wide get the desktop layout. Narrower browser windows
 * (phones, tablets in portrait, a half-screen window) keep the phone layout.
 * Matches the `min-width: 1024px` rules in `public/index.html`.
 */
export const DESKTOP_MIN_WIDTH = 1024;

/** True when the browser window is wide enough for the desktop layout. */
export function useIsDesktop(): boolean {
  return useWindowDimensions().width >= DESKTOP_MIN_WIDTH;
}
