/**
 * Services list — port of ServicesView.swift.
 * Swipe a card left to delete; tap to edit; FAB to add.
 */

import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Fab } from '@/components/fab';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useServices } from '@/context/services-store';
import { priceDisplay, type Service } from '@/models/service';
import { Radius, cardShadow, iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function ServicesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { services, deleteService } = useServices();

  const help = () =>
    Alert.alert(
      'Services',
      'This is where you create and manage services for your business. Services define what you offer to clients, including pricing, duration, and booking settings. Tap the + button to add a new service.',
    );

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Services"
          right={
            <Pressable onPress={help} hitSlop={8}>
              <Icon name="questionmark.circle" size={20} color={iOSColors.blue} />
            </Pressable>
          }
        />

        {services.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="scissors.circle.fill" size={80} color={theme.tertiaryText} />
            <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No Services Yet</Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
              Add your first service to get started
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {services.map((service) => (
              <SwipeToDelete key={service.id} onDelete={() => deleteService(service.id)}>
                <ServiceCard service={service} onPress={() => router.push(`/services/${service.id}`)} />
              </SwipeToDelete>
            ))}
          </ScrollView>
        )}

        <Fab onPress={() => router.push('/services/new')} />
      </SafeAreaView>
    </DashboardGradient>
  );
}

function ServiceCard({ service, onPress }: { service: Service; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.cardBackground }, cardShadow(theme)]}>
      <View style={[styles.dot, { backgroundColor: service.colorHex, shadowColor: service.colorHex }]} />

      <View style={styles.cardBody}>
        <Text style={[styles.name, { color: theme.primaryText }]}>{service.name}</Text>
        <View style={styles.metaRow}>
          <Icon name="clock.fill" size={12} color={theme.secondaryText} />
          <Text style={[styles.meta, { color: theme.secondaryText }]}>{service.duration} min</Text>
          <Text style={[styles.meta, { color: theme.secondaryText }]}>•</Text>
          <Text style={[styles.meta, { color: theme.secondaryText }]}>{service.priceType}</Text>
          {service.noDoubleBooking ? (
            <>
              <Text style={[styles.meta, { color: theme.secondaryText }]}>•</Text>
              <Icon name="lock.fill" size={10} color={iOSColors.orange} />
              <Text style={[styles.meta, { color: iOSColors.orange, fontWeight: '500' }]}>
                No double booking
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.priceWrap}>
        <Text style={[styles.price, { color: theme.primaryText }]}>${priceDisplay(service)}</Text>
        <Icon name="chevron.right" size={14} color={theme.secondaryText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700' },
  emptySub: { fontSize: 16, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: Radius.card,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardBody: { flex: 1, gap: 6 },
  name: { fontSize: 18, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 14 },
  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 20, fontWeight: '700' },
});
