/**
 * Staff list — port of StaffView.swift.
 * Search, swipe-to-delete, tap-to-edit, orange FAB to add.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Fab } from '@/components/fab';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useStaff } from '@/context/staff-store';
import { STAFF_ORANGE, staffInitials, type StaffMember } from '@/models/staff';
import { Radius, cardShadow, iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const ORANGE_DARK = '#F27326';
const ACTIVE_GREEN = '#4CBF80';

export default function StaffScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { searchStaff, deleteStaff } = useStaff();
  const [search, setSearch] = useState('');

  const filtered = searchStaff(search);
  const help = () =>
    Alert.alert(
      'Staff',
      'Manage your team. Staff members can be assigned to appointments so you can track who is handling each booking. The owner is added automatically.',
    );

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Staff"
          right={
            <Pressable onPress={help} hitSlop={8}>
              <Icon name="questionmark.circle" size={20} color={iOSColors.blue} />
            </Pressable>
          }
        />

        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search staff..."
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
            <Icon name="person.badge.key.fill" size={64} color={`${STAFF_ORANGE}4D`} />
            <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
              {search ? 'No Results' : 'No Staff Members'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
              {search ? 'Try a different search term.' : 'Add your team members to manage schedules and services.'}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {filtered.map((m) => (
              <SwipeToDelete key={m.id} onDelete={() => deleteStaff(m.id)}>
                <StaffCard member={m} onPress={() => router.push(`/staff/${m.id}`)} />
              </SwipeToDelete>
            ))}
          </ScrollView>
        )}

        <Fab onPress={() => router.push('/staff/new')} colors={[STAFF_ORANGE, ORANGE_DARK]} shadowColor={STAFF_ORANGE} />
      </SafeAreaView>
    </DashboardGradient>
  );
}

function StaffCard({ member, onPress }: { member: StaffMember; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.cardBackground }, cardShadow(theme)]}>
      <LinearGradient colors={[STAFF_ORANGE, ORANGE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
        <Text style={styles.avatarText}>{staffInitials(member.name)}</Text>
      </LinearGradient>
      <View style={styles.cardBody}>
        <Text style={[styles.name, { color: theme.primaryText }]}>{member.name}</Text>
        <Text style={[styles.role, { color: STAFF_ORANGE }]}>{member.role}</Text>
        <View style={styles.phoneRow}>
          <Icon name="phone.fill" size={11} color={theme.secondaryText} />
          <Text style={[styles.phone, { color: theme.secondaryText }]}>{member.phoneNumber || '—'}</Text>
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: member.isActive ? ACTIVE_GREEN : `${iOSColors.gray}66` }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginHorizontal: 16, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4, textAlignVertical: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptySub: { fontSize: 15, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: Radius.card },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  cardBody: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: '600' },
  role: { fontSize: 14 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phone: { fontSize: 13 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
