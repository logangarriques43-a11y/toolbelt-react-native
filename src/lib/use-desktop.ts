/**
 * True when the browser window is wide enough for the desktop layout
 * (sidebar, two-column home, week calendar). The phone apps never use it, so
 * this native version is always false; `use-desktop.web.ts` measures the window.
 */
export function useIsDesktop(): boolean {
  return false;
}
