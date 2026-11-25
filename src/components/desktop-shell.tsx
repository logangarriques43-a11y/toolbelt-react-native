/**
 * Frame around the signed-in screens. The phone apps draw screens full-window,
 * so this native version adds nothing; the browser build uses
 * `desktop-shell.web.tsx` (sidebar on wide windows).
 */

import type { ReactNode } from 'react';

export function DesktopShell({ children }: { children: ReactNode }) {
  return children;
}

/** Frame around the sign-in and pre-app screens. Nothing on phones. */
export function CenteredFrame({ children }: { children: ReactNode }) {
  return children;
}
