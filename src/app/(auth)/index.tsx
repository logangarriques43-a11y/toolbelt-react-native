/**
 * Landing screen — port of HomeView.swift.
 * Two role cards: create a business account, or sign into an existing one.
 * (Client onboarding is out of scope for this port.)
 */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';
import type { SFSymbol } from 'expo-symbols';

export default function Landing() {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={[styles.h1, { color: theme.primaryText }]}>
              Welcome to Our Platform
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Choose how you&apos;d like to get started
            </Text>
          </View>

          <View style={styles.cards}>
            <HomeCard
              icon="building.2.fill"
              title="Business Owner"
              description="Manage your business, track analytics, and grow your customer base with powerful tools designed for success."
              accentColor={iOSColors.blue}
              onPress={() => router.push('/register')}
            />
            <HomeCard
              icon="person.fill"
              title="Already Have an Account?"
              description="Sign in to access your dashboard and continue where you left off."
              accentColor={iOSColors.gray}
              onPress={() => router.push('/login')}
            />
          </View>

          <Text style={[styles.footer, { color: theme.secondaryText }]}>
            Not sure? You can always switch later in your account settings.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

interface HomeCardProps {
  icon: SFSymbol;
  title: string;
  description: string;
  accentColor: string;
  onPress: () => void;
}

function HomeCard({ icon, title, description, accentColor, onPress }: HomeCardProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.cardBackground, shadowColor: accentColor },
        pressed ? styles.cardPressed : null,
      ]}>
      <View style={styles.cardTop}>
        <View
          style={[styles.iconCircle, { backgroundColor: withOpacity(accentColor, 0.15) }]}>
          <Icon name={icon} size={24} color={accentColor} />
        </View>
        <Icon name="arrow.right" size={20} weight="semibold" color={accentColor} />
      </View>

      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.cardDesc, { color: theme.secondaryText }]}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 40, paddingBottom: 40 },
  titleBlock: { gap: 16, paddingTop: 40, paddingHorizontal: 20, alignItems: 'center' },
  h1: { fontSize: 40, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 20, textAlign: 'center' },
  cards: { gap: 32, paddingHorizontal: 20 },
  card: {
    padding: 24,
    borderRadius: 20,
    gap: 16,
    // SwiftUI: .shadow(color: accent.opacity(0.15), radius: 10, y: 5)
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  cardPressed: { opacity: 0.92 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cardText: { gap: 8 },
  cardTitle: { fontSize: 24, fontWeight: '700' },
  cardDesc: { fontSize: 16, lineHeight: 22 },
  footer: { fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
});
