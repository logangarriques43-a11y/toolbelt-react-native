/**
 * Passkeys — WebAuthn over the backend (webauthnRoutes.js) + react-native-passkey.
 *
 * Registration (signed in): POST /webauthn/register/options {userName} →
 * Passkey.create(options) → POST /webauthn/register/verify {credential, deviceName}.
 * Sign-in (public): POST /webauthn/login/options {email?} → Passkey.get(options)
 * → POST /webauthn/login/verify {credential, challengeKey} → {customToken}, which
 * the caller exchanges with signInWithCustomToken.
 *
 * Every binary field travels as base64url in both directions (the server uses
 * @simplewebauthn; the native module speaks the same JSON). On Android the
 * relying party must list the app's `android:apk-key-hash:` origin and serve
 * /.well-known/assetlinks.json, or Credential Manager refuses the request —
 * `passkeyErrorMessage` says so plainly instead of a raw native error.
 */

import * as Device from 'expo-device';
import { Passkey, type PasskeyCreateRequest, type PasskeyGetRequest } from 'react-native-passkey';

import { ApiError, api } from '@/lib/api-client';

type Descriptor = { id: string; type?: string; transports?: string[] };

interface RegisterOptions extends Omit<PasskeyCreateRequest, 'excludeCredentials'> {
  excludeCredentials?: Descriptor[];
}

interface LoginOptions extends Omit<PasskeyGetRequest, 'allowCredentials'> {
  challengeKey: string;
  allowCredentials?: Descriptor[];
}

/** Normalise a credential descriptor list: add `type`, drop empty transports. */
function descriptors(list?: Descriptor[]) {
  if (!list?.length) return undefined;
  return list.map((c) => ({
    id: c.id,
    type: 'public-key' as const,
    ...(c.transports?.length ? { transports: c.transports as never } : {}),
  }));
}

/** Whether this device can create / use passkeys at all. */
export function passkeysSupported(): boolean {
  try {
    return Passkey.isSupported();
  } catch {
    return false;
  }
}

/** True when the user dismissed the system passkey sheet (not an error to show). */
export function isPasskeyCancel(e: unknown): boolean {
  const code = (e as { error?: string })?.error;
  return code === 'UserCancelled' || code === 'Interrupted';
}

/** A one-line explanation for a failed passkey request (device or server side). */
export function passkeyErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  const err = e as { error?: string; message?: string };
  switch (err?.error) {
    case 'NotSupported':
      return 'This device doesn’t support passkeys.';
    case 'NoCredentials':
      return 'No passkey for ToolBelt was found on this device. Sign in with your password, then add one in Security.';
    case 'CredentialAlreadyExists':
      return 'A passkey for this account is already saved on this device.';
    case 'BadConfiguration':
    case 'RequestFailed':
    case 'InvalidChallenge':
    case 'InvalidUserId':
      return `The device rejected the passkey request${err.message ? ` (${err.message})` : ''}. The server may not be set up for Android passkeys yet.`;
    case 'TimedOut':
      return 'The passkey request timed out. Please try again.';
    default:
      return err?.message
        ? `Passkey request was rejected: ${err.message}`
        : 'Passkey request was rejected by the device or server.';
  }
}

/** Create a passkey for the signed-in account and register it with the server. */
export async function registerPasskey(displayName: string): Promise<void> {
  const options = await api.post<RegisterOptions>('/webauthn/register/options', { userName: displayName });
  const request: PasskeyCreateRequest = {
    ...options,
    excludeCredentials: descriptors(options.excludeCredentials),
  };
  const result = await Passkey.create(request);
  const verified = await api.post<{ verified: boolean }>('/webauthn/register/verify', {
    credential: {
      id: result.id,
      rawId: result.rawId || result.id,
      type: result.type || 'public-key',
      response: {
        attestationObject: result.response.attestationObject,
        clientDataJSON: result.response.clientDataJSON,
      },
    },
    deviceName: Device.deviceName || Device.modelName || 'Android device',
  });
  if (!verified?.verified) throw new ApiError(400, 'Passkey verification failed', 'passkey_unverified');
}

/** Sign in with a passkey; resolves to the Firebase custom token to exchange. */
export async function passkeySignIn(email?: string): Promise<string> {
  const trimmed = email?.trim().toLowerCase();
  const options = await api.post<LoginOptions>('/webauthn/login/options', trimmed ? { email: trimmed } : {});
  const { challengeKey, allowCredentials, ...rest } = options;
  const request: PasskeyGetRequest = { ...rest, allowCredentials: descriptors(allowCredentials) };
  const result = await Passkey.get(request);
  const verified = await api.post<{ verified: boolean; customToken?: string }>('/webauthn/login/verify', {
    credential: {
      id: result.id,
      rawId: result.rawId || result.id,
      type: result.type || 'public-key',
      response: {
        authenticatorData: result.response.authenticatorData,
        clientDataJSON: result.response.clientDataJSON,
        signature: result.response.signature,
        userHandle: result.response.userHandle,
      },
    },
    challengeKey,
  });
  if (!verified?.verified || !verified.customToken) {
    throw new ApiError(400, 'Passkey sign-in failed', 'passkey_unverified');
  }
  return verified.customToken;
}
