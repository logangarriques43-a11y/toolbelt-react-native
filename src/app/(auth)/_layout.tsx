import { Stack } from 'expo-router';

/** Auth flow stack (Home → Login → Register → ForgotPassword). Phase 1. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
