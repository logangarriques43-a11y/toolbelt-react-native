/**
 * Select Service — port of ServiceSelectionView.swift.
 * Sets the appointment form's service and pops back.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAppointmentForm } from '@/context/appointment-form';
import { useServices } from '@/context/services-store';
import { priceDisplay, type Service } from '@/models/service';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function SelectService() {
  const theme = useAppTheme();
  const router = useRouter();
  const { services } = useServices();
  const { setSelectedService } = useAppointmentForm();
  const [search, setSearch] = useState('');

  const filtered = search
    ? services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : services;

  const choose = (service: Service) => {
    setSelectedService(service);
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Select Service" />

        <View style={styles.content}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.fieldBorder }]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search services..."
              placeholderTextColor={theme.tertiaryText}
              style={[styles.searchInput, { color: theme.primaryText }]}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Icon name="xmark.circle.fill" size={16} color={theme.secondaryText} />
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={() => router.push('/services/new')}>
            <LinearGradient
              colors={[iOSColors.blue, iOSColors.purple]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.addBtn}>
              <Icon name="plus.circle.fill" size={20} color="#FFFFFF" />
              <Text style={styles.addText}>Add New Service</Text>
            </LinearGradient>
          </Pressable>

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="scissors.circle" size={60} color={theme.tertiaryText} />
              <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
                {search ? 'No Results Found' : 'No Services Yet'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
                {search ? 'Try a different search term' : 'Add your first service to get started'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {filtered.map((service) => (
                <Pressable
                  key={service.id}
                  onPress={() => choose(service)}
                  style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <View style={[styles.dot, { backgroundColor: service.colorHex, shadowColor: service.colorHex }]} />
                  <View style={styles.cardBody}>
                    <Text style={[styles.name, { color: theme.primaryText }]}>{service.name}</Text>
                    <View style={styles.metaRow}>
                      <Icon name="clock.fill" size={12} color={theme.secondaryText} />
                      <Text style={[styles.meta, { color: theme.secondaryText }]}>{service.duration} min</Text>
                      <Text style={[styles.meta, { color: theme.secondaryText }]}>•</Text>
                      <Text style={[styles.meta, { color: theme.secondaryText }]}>{service.priceType}</Text>
                    </View>
                  </View>
                  <Text style={[styles.price, { color: theme.primaryText }]}>${priceDisplay(service)}</Text>
                  <Icon name="chevron.right" size={14} color={theme.secondaryText} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, gap: 24 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, marginHorizontal: 16, borderRadius: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, marginHorizontal: 16, borderRadius: 12,
  },
  addText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 16, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardBody: { flex: 1, gap: 6 },
  name: { fontSize: 18, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontSize: 14 },
  price: { fontSize: 20, fontWeight: '700' },
});
