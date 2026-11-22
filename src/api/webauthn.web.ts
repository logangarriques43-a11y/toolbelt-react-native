/**
 * Passkeys in the browser — not offered yet.
 *
 * The backend's WebAuthn relying-party id is the API's own Render host, and a
 * browser only allows a passkey whose rp id is a suffix of the page's own
 * domain, so app.toolbelt.tools
 * can't use the app's passkeys. Moving the rp id to toolbelt.tools would
 * orphan every passkey already saved in the iOS / Android apps, so the web
 * build reports passkeys as unsupported (the UI hides the option) until that
 * migration is planned. Same exports as `webauthn.ts`.
 */

import { ApiError } from '@/lib/api-client';

const UNSUPPORTED = 'Passkeys work in the ToolBelt phone app. In the browser, sign in with your email and password.';

export function passkeysSupported(): boolean {
  return false;
}

export function isPasskeyCancel(_e: unknown): boolean {
  return false;
}

export function passkeyErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return UNSUPPORTED;
}

export async function registerPasskey(_displayName: string): Promise<void> {
  throw new Error(UNSUPPORTED);
}

export async function passkeySignIn(_email?: string): Promise<string> {
  throw new Error(UNSUPPORTED);
}
