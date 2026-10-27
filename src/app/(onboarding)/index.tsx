/**
 * Phase 0 onboarding placeholder.
 *
 * Stands in for the 2FA setup/verify + Stripe Connect payout flow (Phase 7).
 * The button flips every onboarding flag so the gate advances to the app group,
 * proving the protected-route wiring end to end.
 */

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/themed';
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
        <Text style={theme.display(34, '500')}>Onboarding</Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>
          2FA + Stripe payout setup live here. Native flows are stubbed for now
          (Phase 7).
        </Text>

        <ThemedButton title="Complete setup (stub) →" onPress={finishStub} />
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
  body: { fontSize: 16, lineHeight: 22 },
  link: { textAlign: 'center', fontSize: 14 },
});
