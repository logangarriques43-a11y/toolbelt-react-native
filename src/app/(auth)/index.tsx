/**
 * Landing screen — port of the redesigned HomeView.swift.
 * Filled app icon, serif headline, a card with the Business owner path, then
 * an inverse Sign in button. (iOS also offers a Staff member row; the RN app
 * has no staff sign-in yet, so it is left out here.)
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { DISPLAY_FONT } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function Landing() {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleBlock}>
            <ThemedIconTile name="wrench.and.screwdriver.fill" size={52} filled />
            <Text
              style={[
                styles.eyebrow,
                { color: theme.secondaryText, letterSpacing: theme.isEditorial ? 1.6 : 0.4 },
              ]}>
              {theme.isEditorial ? 'WELCOME' : 'Welcome'}
            </Text>
            <Text style={[styles.h1, { color: theme.primaryText }]}>Run your business from one place.</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Choose how you&apos;d like to get started.
            </Text>
          </View>

          <View style={theme.card}>
            <HomeRow
              icon="building.2.fill"
              title="Business owner"
              description="Set up your business, take bookings and get paid."
              onPress={() => router.push('/register')}
            />
          </View>

          <View style={styles.signIn}>
            <ThemedButton title="Sign in" kind="inverse" onPress={() => router.push('/login')} />
            <Text style={[styles.footer, { color: theme.secondaryText }]}>
              Already have an account? Sign in to pick up where you left off.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HomeRow({
  icon,
  title,
  description,
  onPress,
}: {
  icon: SFSymbol;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
      <ThemedIconTile name={icon} size={44} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.rowDesc, { color: theme.secondaryText }]}>{description}</Text>
      </View>
      <Icon name="chevron.right" size={14} color={theme.chevronTint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: 32, paddingHorizontal: 24, paddingBottom: 40 },
  titleBlock: { gap: 14, paddingTop: 48 },
  eyebrow: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  h1: { fontFamily: DISPLAY_FONT, fontSize: 38, lineHeight: 44 },
  subtitle: { fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 16 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: DISPLAY_FONT, fontSize: 20 },
  rowDesc: { fontSize: 14 },
  signIn: { gap: 14 },
  footer: { fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
