/**
 * Select Client — port of ClientSelectionView.swift.
 * Sets the appointment form's client and pops back.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton } from '@/components/themed';
import { useAppointmentForm } from '@/context/appointment-form';
import { useClients } from '@/context/clients-store';
import { clientInitials, type Client } from '@/models/client';
import { useAppTheme } from '@/theme/theme-context';

export default function SelectClient() {
  const theme = useAppTheme();
  const router = useRouter();
  const { searchClients } = useClients();
  const { setSelectedClient } = useAppointmentForm();
  const [search, setSearch] = useState('');

  const clients = search ? searchClients(search) : searchClients('');

  const choose = (client: Client) => {
    setSelectedClient(client);
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Select Client" />

        <View style={styles.content}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.fieldBorder }]}>
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

          <ThemedButton
            title="Add New Client"
            icon="plus.circle.fill"
            kind="accent"
            onPress={() => router.push('/clients/new')}
            style={styles.addBtn}
          />

          {clients.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="person.2.slash" size={60} color={theme.tertiaryText} />
              <Text style={theme.display(22)}>
                {search ? 'No Results Found' : 'No Clients Yet'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
                {search ? 'Try a different search term' : 'Add your first client to get started'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {clients.map((client) => (
                <Pressable
                  key={client.id}
                  onPress={() => choose(client)}
                  style={[styles.card, theme.card]}>
                  <View style={[styles.avatar, { backgroundColor: theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 25 }]}>
                    <Text style={[styles.avatarText, { color: theme.accent }]}>{clientInitials(client.name)}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.name, { color: theme.primaryText }]}>{client.name}</Text>
                    <View style={styles.phoneRow}>
                      <Icon name="phone.fill" size={12} color={theme.secondaryText} />
                      <Text style={[styles.phone, { color: theme.secondaryText }]}>{client.phoneNumber}</Text>
                    </View>
                  </View>
                  <Icon name="chevron.right" size={14} color={theme.chevronTint} />
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
    padding: 16, marginHorizontal: 16, borderRadius: 999, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  addBtn: { marginHorizontal: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptySub: { fontSize: 16, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  avatar: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  cardBody: { flex: 1, gap: 6 },
  name: { fontSize: 18, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phone: { fontSize: 14 },
});
