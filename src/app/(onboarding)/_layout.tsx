import { Stack } from 'expo-router';

/** Pre-app steps the session gate can require (today: Set New Password for a
 *  staff temporary password or a backup-code recovery). No back gesture. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
