/**
 * StaffPermissionsSheet — port of StaffPermissionsToggleList (StaffSheetComponents.swift).
 * Every Permission as a toggle row, plus Enable-all / Disable-all. Saves the
 * per-staff permission map onto the member via updateStaff.
 */

import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { useStaff } from '@/context/staff-store';
import { withOpacity } from '@/lib/color';
import { PERMISSIONS, permissionIcon, permissionSubtitle, permissionTitle } from '@/models/permission';
import { STAFF_ORANGE, type StaffMember } from '@/models/staff';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function StaffPermissionsSheet({
  visible,
  member,
  onClose,
}: {
  visible: boolean;
  member: StaffMember;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const { updateStaff } = useStaff();
  const [states, setStates] = useState<Record<string, boolean>>(member.permissions ?? {});

  // Re-seed from the member each time the sheet opens.
  useEffect(() => {
    if (visible) setStates(member.permissions ?? {});
  }, [visible, member.permissions]);

  const setAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    for (const p of PERMISSIONS) next[p] = value;
    setStates(next);
  };

  const save = async () => {
    try {
      await updateStaff({ ...member, permissions: states });
      onClose();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.primaryText }]}>Permissions</Text>
            <Pressable onPress={save} hitSlop={8}>
              <Text style={[styles.done, { color: STAFF_ORANGE }]}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.introHead}>
              <Icon name="lock.shield.fill" size={15} color={STAFF_ORANGE} />
              <Text style={[styles.introTitle, { color: theme.primaryText }]}>What this staff can see and do</Text>
            </View>
            <Text style={[styles.introSub, { color: theme.secondaryText }]}>
              Toggle anything on. Off = hidden from this staff member. You can change these any time.
            </Text>

            <View style={styles.bulkRow}>
              <Pressable onPress={() => setAll(true)} style={[styles.bulkBtn, { backgroundColor: STAFF_ORANGE }]}>
                <Text style={styles.bulkOn}>Enable all</Text>
              </Pressable>
              <Pressable onPress={() => setAll(false)} style={[styles.bulkBtn, { backgroundColor: withOpacity(STAFF_ORANGE, 0.12) }]}>
                <Text style={[styles.bulkOff, { color: STAFF_ORANGE }]}>Disable all</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
              {PERMISSIONS.map((p, i) => (
                <View key={p}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                  <View style={styles.row}>
                    <Icon name={permissionIcon(p)} size={14} color={STAFF_ORANGE} />
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{permissionTitle(p)}</Text>
                      <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{permissionSubtitle(p)}</Text>
                    </View>
                    <Switch
                      value={states[p] ?? false}
                      onValueChange={(v) => setStates((prev) => ({ ...prev, [p]: v }))}
                      trackColor={{ true: STAFF_ORANGE, false: withOpacity(iOSColors.gray, 0.3) }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
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
  done: { fontSize: 16, fontWeight: '600' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  introHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  introTitle: { fontSize: 14, fontWeight: '700' },
  introSub: { fontSize: 12 },
  bulkRow: { flexDirection: 'row', gap: 12 },
  bulkBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  bulkOn: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  bulkOff: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 26 },
});
