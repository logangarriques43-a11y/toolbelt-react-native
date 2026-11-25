import { Stack } from 'expo-router';

import { CenteredFrame } from '@/components/desktop-shell';

/** Auth flow stack (Home → Login / Staff Sign In → Register → ForgotPassword). */
export default function AuthLayout() {
  return (
    <CenteredFrame>
      <Stack screenOptions={{ headerShown: false }} />
    </CenteredFrame>
  );
}
