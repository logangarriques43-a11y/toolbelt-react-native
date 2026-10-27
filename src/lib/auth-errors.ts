/**
 * Maps Firebase Auth errors to friendly messages for the sign-in, registration,
 * password and two-step (MFA) screens. Unknown codes fall back to the SDK's own
 * message so nothing is ever swallowed.
 */

/** The Firebase error code, or '' when the value isn't a Firebase error. */
export function firebaseErrorCode(e: unknown): string {
  return (e as { code?: string })?.code ?? '';
}

export function firebaseAuthErrorMessage(e: unknown): string {
  const code = firebaseErrorCode(e);
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'For your security, please confirm your password and try again.';
    case 'auth/invalid-verification-code':
    case 'auth/invalid-totp-code':
      return 'That code is incorrect. Check your authenticator app and try again.';
    case 'auth/code-expired':
    case 'auth/totp-challenge-timeout':
      return 'That code has expired. Enter the newest code from your authenticator app.';
    case 'auth/missing-code':
      return 'Enter the 6-digit code from your authenticator app.';
    case 'auth/unverified-email':
      return 'Verify your email address before turning on two-step sign-in. Check your inbox for the link.';
    case 'auth/unsupported-first-factor':
      return 'Two-step sign-in can only be changed after signing in with your email and password. Sign out, sign back in with your password, then try again.';
    case 'auth/second-factor-already-in-use':
      return 'This authenticator is already set up on your account.';
    case 'auth/maximum-second-factor-count-exceeded':
      return 'You already have the maximum number of two-step methods. Remove one first.';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'This sign-in method isn’t enabled for ToolBelt yet. Please contact support.';
    case 'auth/invalid-custom-token':
    case 'auth/custom-token-mismatch':
      return 'The server issued a sign-in token this app couldn’t use. Please try again or contact support.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    case 'auth/api-key-not-valid':
      return 'Firebase is not configured — set EXPO_PUBLIC_FIREBASE_API_KEY in .env.';
    default:
      return (e as { message?: string })?.message || 'Something went wrong. Please try again.';
  }
}
