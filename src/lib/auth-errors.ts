/**
 * Maps Firebase Auth errors to friendly messages for the login/register screens.
 */

export function firebaseAuthErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
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
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    case 'auth/api-key-not-valid':
      return 'Firebase is not configured — set EXPO_PUBLIC_FIREBASE_API_KEY in .env.';
    default:
      return (e as { message?: string })?.message || 'Something went wrong. Please try again.';
  }
}
