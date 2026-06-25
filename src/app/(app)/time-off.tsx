/**
 * Time Off — port of TimeOffView.swift. A create form (title, date, start/end,
 * color, notes, location) plus a list of existing time-off events. Reached from
 * the schedule FAB.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BLUE, DateButton, DurationRow, FieldRow, InputRow, PURPLE, Section, TimeCard,
} from '@/components/appointment-bits';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ColorPickerSheet } from '@/components/sheets/color-picker-sheet';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { TimeStepperSheet } from '@/components/sheets/time-stepper-sheet';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useSession } from '@/context/session';
import { useTimeOff } from '@/context/time-off-store';
import {
  combineDateTime, durationMinutes, formatDurationLabel, formattedDateFull,
} from '@/lib/appointment-time';
import { appointmentTimeRange } from '@/models/appointment';
import { Brand, iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Sheet = 'date' | 'start' | 'end' | 'color' | null;

export default function TimeOff() {
  const theme = useAppTheme();
  const router = useRouter();
  const { account } = useSession();
  const { events, addEvent, deleteEvent } = useTimeOff();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [sH, setSH] = useState(9); const [sM, setSM] = useState(45); const [sPM, setSPM] = useState(false);
  const [eH, setEH] = useState(10); const [eM, setEM] = useState(15); const [ePM, setEPM] = useState(false);
  const [color, setColor] = useState<string>(iOSColors.blue);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);

  const duration = durationMinutes(sH, sM, sPM, eH, eM, ePM);

  const save = () => {
    if (!title.trim()) return Alert.alert('Error', 'Please enter a title');
    const start = combineDateTime(date, sH, sM, sPM);
    const end = combineDateTime(date, eH, eM, ePM);
    addEvent({
      title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      staffName: account?.name ?? 'Owner',
      colorHex: color,
      notes: notes || undefined,
      location: location || undefined,
      isAllDay: false,
    });
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.closeBtn, { backgroundColor: theme.cardBackground }]}>
            <Icon name="xmark" size={16} color={theme.secondaryText} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Time Off</Text>
          <Pressable onPress={save}>
            <LinearGradient colors={Brand.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.savePill}>
              <Text style={styles.saveText}>Save</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Section label="Title">
            <InputRow icon="pencil" placeholder="e.g. Lunch break, Vacation" value={title} onChangeText={setTitle} />
          </Section>

          <Section label="Date and time">
            <DateButton label={formattedDateFull(date)} onPress={() => setSheet('date')} />
            <View style={styles.timeRow}>
              <TimeCard label="Start" hour={sH} minute={sM} isPM={sPM} accent={BLUE} onPress={() => setSheet('start')} />
              <Icon name="arrow.right" size={16} color={theme.secondaryText} />
              <TimeCard label="End" hour={eH} minute={eM} isPM={ePM} accent={PURPLE} onPress={() => setSheet('end')} />
            </View>
            <DurationRow label={formatDurationLabel(duration)} />
          </Section>

          <Section label="Color">
            <FieldRow onPress={() => setSheet('color')}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={[styles.colorLabel, { color: theme.primaryText }]}>Selected color</Text>
              <View style={styles.flexEnd}><Icon name="chevron.right" size={14} color={theme.secondaryText} /></View>
            </FieldRow>
          </Section>

          <Section label="Notes">
            <InputRow icon="doc.text.fill" placeholder="Add notes..." value={notes} onChangeText={setNotes} />
          </Section>
          <Section label="Location">
            <InputRow icon="mappin.circle.fill" placeholder="Enter address..." value={location} onChangeText={setLocation} />
          </Section>

          {events.length > 0 ? (
            <Section label="Scheduled Time Off">
              {events.map((ev) => (
                <SwipeToDelete key={ev.id} onDelete={() => deleteEvent(ev.id)}>
                  <View style={[styles.eventCard, { backgroundColor: theme.cardBackground }]}>
                    <View style={[styles.eventBar, { backgroundColor: ev.colorHex }]} />
                    <View style={styles.eventBody}>
                      <Text style={[styles.eventTitle, { color: theme.primaryText }]}>{ev.title}</Text>
                      <Text style={[styles.eventTime, { color: theme.secondaryText }]}>
                        {formattedDateFull(ev.startTime)} · {appointmentTimeRange(ev)}
                      </Text>
                    </View>
                  </View>
                </SwipeToDelete>
              ))}
            </Section>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <DatePickerSheet visible={sheet === 'date'} date={date} onChange={setDate} onClose={() => setSheet(null)} />
      <TimeStepperSheet visible={sheet === 'start'} title="Start Time" accent={BLUE} hour={sH} minute={sM} isPM={sPM} onChange={(h, m, pm) => { setSH(h); setSM(m); setSPM(pm); }} onClose={() => setSheet(null)} />
      <TimeStepperSheet visible={sheet === 'end'} title="End Time" accent={PURPLE} hour={eH} minute={eM} isPM={ePM} onChange={(h, m, pm) => { setEH(h); setEM(m); setEPM(pm); }} onClose={() => setSheet(null)} />
      <ColorPickerSheet visible={sheet === 'color'} selected={color} onSelect={setColor} onClose={() => setSheet(null)} />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  savePill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  body: { paddingTop: 24, paddingBottom: 60, gap: 24 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorLabel: { flex: 1, fontSize: 16 },
  flexEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventCard: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden' },
  eventBar: { width: 5 },
  eventBody: { flex: 1, padding: 14, gap: 4 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  eventTime: { fontSize: 13 },
});
