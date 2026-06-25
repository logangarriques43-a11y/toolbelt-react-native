/**
 * Special Features — port of SpecialFeaturesView.swift.
 * A showcase of feature cards that deep-link into the app. Targets not yet built
 * (AI SMS, Online Booking, Payments, Inventory) are "coming soon" stubs.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function SpecialFeatures() {
  const router = useRouter();
  const soon = (what: string) => Alert.alert('Coming soon', `${what} arrives in a later phase.`);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Our Special Features" />
        <ScrollView contentContainerStyle={styles.body}>
          <Card icon="bubble.left.and.text.bubble.right.fill" title="AI SMS Scheduling" color={iOSColors.teal} tag="Popular"
            description="Let AI handle appointment bookings, reminders, and customer conversations via text message — 24/7."
            onPress={() => soon('AI SMS Scheduling')} />
          <Card icon="calendar.badge.clock" title="Smart Calendar" color={iOSColors.blue}
            description="Manage your appointments with automatic conflict detection, staff scheduling, and client reminders."
            onPress={() => router.push('/appointments')} />
          <Card icon="globe" title="Online Booking Page" color={iOSColors.indigo}
            description="Give your customers a professional booking page where they can self-schedule appointments anytime."
            onPress={() => soon('Online Booking')} />
          <Card icon="creditcard.fill" title="Integrated Payments" color={iOSColors.purple}
            description="Accept payments, send invoices, and track your finances — all connected to your appointments."
            onPress={() => soon('Payments')} />
          <Card icon="shippingbox.fill" title="Inventory Tracking" color={iOSColors.orange}
            description="Track products, monitor stock levels, scan labels, and get automatic reorder alerts."
            onPress={() => soon('Inventory')} />
          <Card icon="paintbrush.fill" title="Custom Website Design" color={iOSColors.pink} tag="Coming Soon"
            description="Get a professionally designed website for your business, built and managed by our team."
            onPress={() => router.push('/custom-website')} />
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Card({
  icon, title, description, color, tag, onPress,
}: {
  icon: SFSymbol; title: string; description: string; color: string; tag?: string; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.cardHead}>
        <View style={[styles.iconTile, { backgroundColor: theme.iconBackground(color) }]}>
          <Icon name={icon} size={22} color={color} />
        </View>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          {tag ? (
            <Text style={[styles.tag, { backgroundColor: tag === 'Popular' ? iOSColors.green : iOSColors.orange }]}>{tag}</Text>
          ) : null}
        </View>
        <Icon name="chevron.right" size={14} color={theme.chevronTint} />
      </View>
      <Text numberOfLines={3} style={[styles.desc, { color: theme.secondaryText }]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 18, fontWeight: '600' },
  tag: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  desc: { fontSize: 14, lineHeight: 19 },
});
