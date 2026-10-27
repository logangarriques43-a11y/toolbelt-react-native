import { Stack } from 'expo-router';

/** Auth flow stack (Home → Login / Staff Sign In → Register → ForgotPassword). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
