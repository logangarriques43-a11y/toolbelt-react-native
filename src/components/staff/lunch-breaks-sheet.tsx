/**
 * StaffLunchBreaksSheet — per-staff weekly lunch-break editor.
 * Port of StaffLunchBreaksView.swift: 7 day rows (Sun→Sat) with an enable toggle
 * + start/end, and "apply same time to every day". Default window 12–1. Saves
 * through the staff store. Weekday is 1=Sun … 7=Sat to match the model.
 */

import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { TimeStepperSheet } from '@/components/sheets/time-stepper-sheet';
import { useStaff } from '@/context/staff-store';
import { to24 } from '@/lib/appointment-time';
import { intervalTimeString } from '@/models/working-hours';
import { STAFF_ORANGE, type StaffLunchBreak, type StaffMember } from '@/models/staff';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { withOpacity } from '@/lib/color';
import { useAppTheme } from '@/theme/theme-context';

const WEEKDAYS: { num: number; label: string }[] = [
  { num: 1, label: 'Sunday' },
  { num: 2, label: 'Monday' },
  { num: 3, label: 'Tuesday' },
  { num: 4, label: 'Wednesday' },
  { num: 5, label: 'Thursday' },
  { num: 6, label: 'Friday' },
  { num: 7, label: 'Saturday' },
];

function to12(hour: number, minute: number) {
  return { hour: hour > 12 ? hour - 12 : hour === 0 ? 12 : hour, minute, isPM: hour >= 12 };
}

interface Draft {
  enabled: boolean;
  startHour: number; // 24h
  startMinute: number;
  endHour: number;
  endMinute: number;
}
type Drafts = Record<number, Draft>;
type Editing = { weekday: number; field: 'start' | 'end' };

function seedDrafts(member: StaffMember): Drafts {
  const drafts: Drafts = {};
  for (const d of WEEKDAYS) {
    drafts[d.num] = { enabled: false, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0 };
  }
  for (const lb of member.lunchBreaks) {
    drafts[lb.weekday] = { enabled: true, startHour: lb.startHour, startMinute: lb.startMinute, endHour: lb.endHour, endMinute: lb.endMinute };
  }
  return drafts;
}

export function StaffLunchBreaksSheet({ visible, member, onClose }: { visible: boolean; member: StaffMember; onClose: () => void }) {
  const theme = useAppTheme();
  const { updateStaff } = useStaff();
  const [drafts, setDrafts] = useState<Drafts>({});
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDrafts(seedDrafts(member));
    setEditing(null);
    setSaved(false);
  }, [visible, member]);

  const setEnabled = (weekday: number, enabled: boolean) =>
    setDrafts((prev) => ({ ...prev, [weekday]: { ...prev[weekday], enabled } }));

  const setTime = (weekday: number, field: 'start' | 'end', h: number, m: number, pm: boolean) =>
    setDrafts((prev) => {
      const d = { ...prev[weekday] };
      const h24 = to24(h, pm);
      if (field === 'start') { d.startHour = h24; d.startMinute = m; }
      else { d.endHour = h24; d.endMinute = m; }
      return { ...prev, [weekday]: d };
    });

  const firstEnabled = WEEKDAYS.map((d) => drafts[d.num]).find((d) => d?.enabled);
  const applyToAll = () => {
    if (!firstEnabled) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const d of WEEKDAYS) {
        next[d.num] = { enabled: true, startHour: firstEnabled.startHour, startMinute: firstEnabled.startMinute, endHour: firstEnabled.endHour, endMinute: firstEnabled.endMinute };
      }
      return next;
    });
  };

  const save = async () => {
    const breaks: StaffLunchBreak[] = [];
    for (const d of WEEKDAYS) {
      const draft = drafts[d.num];
      if (!draft?.enabled) continue;
      if (draft.startHour * 60 + draft.startMinute >= draft.endHour * 60 + draft.endMinute) {
        Alert.alert('Invalid Lunch Time', `${d.label}'s lunch end time must be after its start time.`);
        return;
      }
      breaks.push({ weekday: d.num, startHour: draft.startHour, startMinute: draft.startMinute, endHour: draft.endHour, endMinute: draft.endMinute });
    }
    try {
      await updateStaff({ ...member, lunchBreaks: breaks });
      setSaved(true);
      setTimeout(onClose, 1000);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const editDraft = editing ? drafts[editing.weekday] : undefined;
  const editTime = editing && editDraft ? to12(editing.field === 'start' ? editDraft.startHour : editDraft.endHour, editing.field === 'start' ? editDraft.startMinute : editDraft.endMinute) : { hour: 12, minute: 0, isPM: true };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={[styles.header, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Lunch Breaks</Text>
            <View style={styles.cancelSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.hero}>
              <View style={[styles.heroCircle, { backgroundColor: withOpacity(STAFF_ORANGE, 0.15) }]}>
                <Icon name="fork.knife" size={26} color={STAFF_ORANGE} />
              </View>
              <Text style={[styles.heroName, { color: theme.primaryText }]}>{member.name}</Text>
              <Text style={[styles.heroDesc, { color: theme.secondaryText }]}>Block out a lunch window so customers can't book over it.</Text>
            </View>

            <Pressable onPress={applyToAll} disabled={!firstEnabled} style={[styles.applyBtn, { backgroundColor: withOpacity(STAFF_ORANGE, 0.12), opacity: firstEnabled ? 1 : 0.4 }]}>
              <Icon name="square.on.square" size={14} color={STAFF_ORANGE} />
              <Text style={[styles.applyText, { color: STAFF_ORANGE }]}>Apply same time to every day</Text>
            </Pressable>

            {WEEKDAYS.map((d) => {
              const draft = drafts[d.num];
              return (
                <View key={d.num} style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <View style={styles.dayHead}>
                    <Text style={[styles.dayLabel, { color: theme.primaryText }]}>{d.label}</Text>
                    <Switch value={draft?.enabled ?? false} onValueChange={(v) => setEnabled(d.num, v)} trackColor={{ true: STAFF_ORANGE, false: withOpacity(iOSColors.gray, 0.3) }} />
                  </View>
                  {draft?.enabled ? (
                    <View style={styles.timeRow}>
                      <TimeButton label="Start" value={intervalTimeString(draft.startHour, draft.startMinute)} onPress={() => setEditing({ weekday: d.num, field: 'start' })} />
                      <Text style={{ color: theme.secondaryText }}>→</Text>
                      <TimeButton label="End" value={intervalTimeString(draft.endHour, draft.endMinute)} onPress={() => setEditing({ weekday: d.num, field: 'end' })} />
                    </View>
                  ) : null}
                </View>
              );
            })}

            {saved && (
              <View style={styles.savedRow}>
                <Icon name="checkmark.circle.fill" size={16} color={iOSColors.green} />
                <Text style={[styles.savedText, { color: iOSColors.green }]}>Saved</Text>
              </View>
            )}

            <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: STAFF_ORANGE }]}>
              <Text style={styles.saveText}>Save Lunch Breaks</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </DashboardGradient>

      <TimeStepperSheet
        visible={editing != null}
        hour={editTime.hour}
        minute={editTime.minute}
        isPM={editTime.isPM}
        title={editing?.field === 'start' ? 'Start Time' : 'End Time'}
        accent={STAFF_ORANGE}
        onChange={(h, m, pm) => editing && setTime(editing.weekday, editing.field, h, m, pm)}
        onClose={() => setEditing(null)}
      />
    </Modal>
  );
}

function TimeButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.timeBtn, { backgroundColor: theme.background }]}>
      <Text style={[styles.timeBtnLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.timeBtnValue, { color: theme.primaryText }]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  cancel: { color: iOSColors.blue, fontSize: 16 },
  cancelSpacer: { width: 50 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 10 },
  heroCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: 18, fontWeight: '700' },
  heroDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  card: { borderRadius: 12, padding: 14, gap: 10 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  applyText: { fontSize: 14, fontWeight: '600' },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: 16, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBtn: { flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  timeBtnLabel: { fontSize: 11, fontWeight: '600' },
  timeBtnValue: { fontSize: 15, fontWeight: '500' },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  savedText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
