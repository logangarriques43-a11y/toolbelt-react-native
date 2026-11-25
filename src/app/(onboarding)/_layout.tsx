import { Stack } from 'expo-router';

import { CenteredFrame } from '@/components/desktop-shell';

/** Pre-app steps the session gate can require (today: Set New Password for a
 *  staff temporary password or a backup-code recovery). No back gesture. */
export default function OnboardingLayout() {
  return (
    <CenteredFrame>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
    </CenteredFrame>
  );
}
