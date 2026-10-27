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
import { PERMISSIONS, permissionIcon, permissionSubtitle, permissionTitle } from '@/models/permission';
import type { StaffMember } from '@/models/staff';
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
              <Text style={[styles.cancel, { color: theme.accent }]}>Cancel</Text>
            </Pressable>
            <Text style={theme.display(20)}>Permissions</Text>
            <Pressable onPress={save} hitSlop={8}>
              <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.introHead}>
              <Icon name="lock.shield.fill" size={15} color={theme.accent} />
              <Text style={[styles.introTitle, { color: theme.primaryText }]}>What this staff can see and do</Text>
            </View>
            <Text style={[styles.introSub, { color: theme.secondaryText }]}>
              Toggle anything on. Off = hidden from this staff member. You can change these any time.
            </Text>

            <View style={styles.bulkRow}>
              <Pressable onPress={() => setAll(true)} style={[styles.bulkBtn, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 999 }]}>
                <Text style={[styles.bulkOn, { color: theme.onAccent }]}>Enable all</Text>
              </Pressable>
              <Pressable onPress={() => setAll(false)} style={[styles.bulkBtn, { backgroundColor: theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 999 }]}>
                <Text style={[styles.bulkOff, { color: theme.accent }]}>Disable all</Text>
              </Pressable>
            </View>

            <View style={[styles.card, theme.card]}>
              {PERMISSIONS.map((p, i) => (
                <View key={p}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                  <View style={styles.row}>
                    <Icon name={permissionIcon(p)} size={14} color={theme.accent} />
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{permissionTitle(p)}</Text>
                      <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{permissionSubtitle(p)}</Text>
                    </View>
                    <Switch
                      value={states[p] ?? false}
                      onValueChange={(v) => setStates((prev) => ({ ...prev, [p]: v }))}
                      trackColor={{ true: theme.accent, false: theme.inputBackground }}
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
  cancel: { fontSize: 16 },
  done: { fontSize: 16, fontWeight: '600' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  introHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  introTitle: { fontSize: 14, fontWeight: '700' },
  introSub: { fontSize: 12 },
  bulkRow: { flexDirection: 'row', gap: 12 },
  bulkBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  bulkOn: { fontSize: 13, fontWeight: '600' },
  bulkOff: { fontSize: 13, fontWeight: '600' },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 26 },
});
