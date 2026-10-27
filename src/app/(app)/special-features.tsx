/**
 * Special Features — port of SpecialFeaturesView.swift.
 * A showcase of feature cards that deep-link into the app: AI SMS → SMS setup,
 * Smart Calendar, Online Booking, Payments, Inventory and Custom Website.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

export default function SpecialFeatures() {
  const router = useRouter();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Our Special Features" />
        <ScrollView contentContainerStyle={styles.body}>
          <Card icon="bubble.left.and.text.bubble.right.fill" title="AI SMS Scheduling" tag="Popular"
            description="Let AI handle appointment bookings, reminders, and customer conversations via text message — 24/7."
            onPress={() => router.push('/sms-setup')} />
          <Card icon="calendar.badge.clock" title="Smart Calendar"
            description="Manage your appointments with automatic conflict detection, staff scheduling, and client reminders."
            onPress={() => router.push('/appointments')} />
          <Card icon="globe" title="Online Booking Page"
            description="Give your customers a professional booking page where they can self-schedule appointments anytime."
            onPress={() => router.push('/online-booking')} />
          <Card icon="creditcard.fill" title="Integrated Payments"
            description="Accept payments, send invoices, and track your finances — all connected to your appointments."
            onPress={() => router.push('/payments')} />
          <Card icon="shippingbox.fill" title="Inventory Tracking"
            description="Track products, monitor stock levels, scan labels, and get automatic reorder alerts."
            onPress={() => router.push('/inventory')} />
          <Card icon="paintbrush.fill" title="Custom Website Design"
            description="Get a professionally designed website for your business, built and managed by our team."
            onPress={() => router.push('/custom-website')} />
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Card({
  icon, title, description, tag, onPress,
}: {
  icon: SFSymbol; title: string; description: string; tag?: string; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, theme.card]}>
      <View style={styles.cardHead}>
        <ThemedIconTile name={icon} size={44} />
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          {tag ? (
            <Text style={[styles.tag, tag === 'Popular' ? { backgroundColor: theme.accent, color: theme.onAccent } : { backgroundColor: theme.accentSoft, color: theme.accent }, { borderRadius: theme.isEditorial ? 2 : 999 }]}>{tag}</Text>
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
  card: { padding: 16, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 18, fontWeight: '600' },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  desc: { fontSize: 14, lineHeight: 19 },
});
