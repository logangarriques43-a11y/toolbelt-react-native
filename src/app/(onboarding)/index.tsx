/**
 * Phase 0 onboarding placeholder.
 *
 * Stands in for the 2FA setup/verify + Stripe Connect payout flow (Phase 7).
 * The button flips every onboarding flag so the gate advances to the app group,
 * proving the protected-route wiring end to end.
 */

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/context/session';
import { Spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function OnboardingPlaceholder() {
  const theme = useAppTheme();
  const session = useSession();

  const finishStub = () => {
    session.completeTwoFactorSetup();
    session.verifyTwoFactor();
    session.skipPayout();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.h1, { color: theme.primaryText }]}>Onboarding</Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>
          2FA + Stripe payout setup live here. Native flows are stubbed for now
          (Phase 7).
        </Text>

        <Text onPress={finishStub} style={[styles.cta, { backgroundColor: '#3478F6' }]}>
          Complete setup (stub) →
        </Text>
        <Text
          onPress={session.signOut}
          style={[styles.link, { color: theme.secondaryText }]}>
          Sign out
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  h1: { fontSize: 34, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  cta: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  link: { textAlign: 'center', fontSize: 14 },
});
