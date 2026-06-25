/**
 * StaffPickerSheet — choose the staff member for an appointment. Port of
 * StaffPickerSheet (CreateAppointmentView.swift).
 */

import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { STAFF_ORANGE, staffInitials, type StaffMember } from '@/models/staff';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const ORANGE_DARK = '#F27326';

export function StaffPickerSheet({
  visible,
  staff,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  staff: StaffMember[];
  selectedId?: string;
  onSelect: (m: StaffMember) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.primaryText }]}>Select Staff</Text>
            <View style={styles.spacer} />
          </View>

          {staff.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="person.badge.key.fill" size={50} color={theme.tertiaryText} />
              <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No Staff Members</Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Add staff in the Staff section first.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {staff.map((m) => {
                const active = m.id === selectedId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => { onSelect(m); onClose(); }}
                    style={[
                      styles.row,
                      { backgroundColor: active ? withOpacity(STAFF_ORANGE, 0.08) : theme.cardBackground },
                      lightShadow(theme),
                    ]}>
                    <LinearGradient colors={[STAFF_ORANGE, ORANGE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                      <Text style={styles.avatarText}>{staffInitials(m.name)}</Text>
                    </LinearGradient>
                    <View style={styles.rowText}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: theme.primaryText }]}>{m.name}</Text>
                        {m.isOwner ? <Text style={styles.ownerBadge}>OWNER</Text> : null}
                      </View>
                      <Text style={[styles.role, { color: theme.secondaryText }]}>{m.role}</Text>
                    </View>
                    {active ? <Icon name="checkmark.circle.fill" size={22} color={STAFF_ORANGE} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cancel: { fontSize: 16, color: iOSColors.blue },
  title: { fontSize: 18, fontWeight: '700' },
  spacer: { width: 50 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 15, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  rowText: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '600' },
  ownerBadge: { fontSize: 9, fontWeight: '700', color: '#FFFFFF', backgroundColor: STAFF_ORANGE, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  role: { fontSize: 14 },
});
