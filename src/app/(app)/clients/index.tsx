/**
 * Clients list — port of ClientsView.swift.
 * Search, swipe-to-delete, tap-to-edit, FAB to add.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Fab } from '@/components/fab';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useClients } from '@/context/clients-store';
import { clientInitials, type Client } from '@/models/client';
import { Radius, cardShadow, iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function ClientsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { searchClients, deleteClient } = useClients();
  const [search, setSearch] = useState('');

  const filtered = searchClients(search);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Clients"
          right={<Icon name="questionmark.circle" size={20} color={theme.secondaryText} />}
        />

        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search clients..."
            placeholderTextColor={theme.tertiaryText}
            style={[styles.searchInput, { color: theme.primaryText }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="xmark.circle.fill" size={16} color={theme.secondaryText} />
            </Pressable>
          ) : null}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="person.3.fill" size={80} color={theme.tertiaryText} />
            <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
              {search ? 'No Results Found' : 'No Clients Yet'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
              {search ? 'Try a different search term' : 'Add your first client to get started'}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {filtered.map((client) => (
              <SwipeToDelete key={client.id} onDelete={() => deleteClient(client.id)}>
                <ClientCard client={client} onPress={() => router.push(`/clients/${client.id}`)} />
              </SwipeToDelete>
            ))}
          </ScrollView>
        )}

        <Fab onPress={() => router.push('/clients/new')} />
      </SafeAreaView>
    </DashboardGradient>
  );
}

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.cardBackground }, cardShadow(theme)]}>
      <LinearGradient
        colors={[iOSColors.blue, iOSColors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}>
        <Text style={styles.avatarText}>{clientInitials(client.name)}</Text>
      </LinearGradient>

      <View style={styles.cardBody}>
        <Text style={[styles.name, { color: theme.primaryText }]}>{client.name}</Text>
        <View style={styles.phoneRow}>
          <Icon name="phone.fill" size={12} color={theme.secondaryText} />
          <Text style={[styles.phone, { color: theme.secondaryText }]}>{client.phoneNumber}</Text>
        </View>
      </View>

      <Icon name="chevron.right" size={14} color={theme.secondaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700' },
  emptySub: { fontSize: 16, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: Radius.card,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  cardBody: { flex: 1, gap: 6 },
  name: { fontSize: 18, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phone: { fontSize: 14 },
});
