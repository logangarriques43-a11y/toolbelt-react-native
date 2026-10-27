/**
 * Device Calendar import sheet — the "Sync with Calendar" source on Import &
 * Sync, the RN counterpart to the EventKit path on iOS.
 *
 * Reads events straight from the phone's calendar store via expo-calendar
 * (Apple Calendar on iOS; Google / Samsung / Exchange calendars synced to the
 * device on Android). Flow: request calendar permission (denied → Open
 * Settings) → pick calendars + a date range (default 30 days back to 90 days
 * ahead) → read events → map them to ParsedAppointment / ParsedClient /
 * ParsedService exactly like the ICS parser does (title → service, first
 * attendee or a "Client:" line in the notes → client, notes → notes, organizer
 * → staff). All-day events are skipped (holidays, birthdays, reminders). The
 * result is handed to Import & Sync's own preview / review / import steps.
 * Nothing is uploaded until the user confirms the import there.
 */

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Calendar from 'expo-calendar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { uuid } from '@/lib/id';
import type { ParsedAppointment, ParsedClient, ParsedService } from '@/models/import-data';
import { useAppTheme } from '@/theme/theme-context';

export interface DeviceCalendarImport {
  appointments: ParsedAppointment[];
  clients: ParsedClient[];
  services: ParsedService[];
  /** Short label for the source, e.g. "Device Calendar (2 calendars)". */
  label: string;
}

const DAY = 86_400_000;
/** Attendee lookups are one native call per event — skip them for huge ranges. */
const ATTENDEE_LOOKUP_LIMIT = 300;
const rangeFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

type PermissionState = 'checking' | 'granted' | 'denied' | 'blocked';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "Client:" / "Customer:" / "Booked by:" / "Name:" line in the notes (ICS parser rule). */
function clientFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const lower = notes.toLowerCase();
  for (const pattern of ['client:', 'customer:', 'booked by:', 'name:']) {
    const idx = lower.indexOf(pattern);
    if (idx >= 0) {
      const name = notes.slice(idx + pattern.length).split(/[\n\r]/)[0].trim();
      if (name) return name;
    }
  }
  return null;
}

/** Map device events to the import wizard's parsed rows (mirrors parseICS). */
export function mapDeviceEvents(
  events: Calendar.Event[],
  attendees: Record<string, Calendar.Attendee[]> = {},
): Omit<DeviceCalendarImport, 'label'> {
  const appointments: ParsedAppointment[] = [];
  const clientNames = new Set<string>();
  const serviceNames = new Set<string>();

  for (const e of events) {
    if (e.allDay) continue;
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    const guest = (attendees[e.id] ?? []).find((a) => !a.isCurrentUser && a.role !== 'organizer' && (a.name || a.email));
    const clientName = (guest ? guest.name || guest.email : null) || clientFromNotes(e.notes) || 'Unknown Client';
    const serviceName = e.title?.trim() || 'Imported Appointment';
    appointments.push({
      id: uuid(),
      clientName,
      serviceName,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      price: 0,
      notes: e.notes?.trim() || undefined,
      staffName: e.organizer?.name || e.organizerEmail || undefined,
      selected: true,
    });
    if (clientName !== 'Unknown Client') clientNames.add(clientName);
    serviceNames.add(serviceName);
  }

  appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return {
    appointments,
    clients: [...clientNames].map((name) => ({ id: uuid(), name, phone: '', selected: true })),
    services: [...serviceNames].map((name) => ({ id: uuid(), name, price: 0, duration: 30, selected: true })),
  };
}

export function DeviceCalendarSheet({
  visible,
  onClose,
  onLoaded,
}: {
  visible: boolean;
  onClose: () => void;
  onLoaded: (result: DeviceCalendarImport) => void;
}) {
  const theme = useAppTheme();
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(() => startOfDay(new Date(Date.now() - 30 * DAY)));
  const [to, setTo] = useState(() => startOfDay(new Date(Date.now() + 90 * DAY)));
  const [loading, setLoading] = useState(false);

  const loadCalendars = async () => {
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const visibleCals = cals.filter((c) => c.isVisible !== false).sort((a, b) => a.title.localeCompare(b.title));
    setCalendars(visibleCals);
    setSelected(new Set(visibleCals.map((c) => c.id)));
  };

  const requestAccess = async () => {
    try {
      const res = await Calendar.requestCalendarPermissionsAsync();
      if (res.granted) {
        setPermission('granted');
        await loadCalendars();
      } else {
        setPermission(res.canAskAgain ? 'denied' : 'blocked');
      }
    } catch (e) {
      setPermission('denied');
      Alert.alert('Calendar Error', e instanceof Error ? e.message : 'Could not read your calendars.');
    }
  };

  useEffect(() => {
    if (visible) {
      setPermission('checking');
      requestAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickDate = (which: 'from' | 'to') => {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: which === 'from' ? from : to,
      mode: 'date',
      onChange: (e, d) => {
        if (e.type !== 'set' || !d) return;
        if (which === 'from') setFrom(startOfDay(d));
        else setTo(startOfDay(d));
      },
    });
  };

  const readEvents = async () => {
    if (selected.size === 0) return Alert.alert('No calendars', 'Choose at least one calendar to import from.');
    const end = new Date(to.getTime() + DAY - 1); // include the whole "to" day
    if (end <= from) return Alert.alert('Check the dates', 'The end date must be after the start date.');
    setLoading(true);
    try {
      const ids = [...selected];
      const events = await Calendar.getEventsAsync(ids, from, end);
      const timed = events.filter((e) => !e.allDay);
      const attendees: Record<string, Calendar.Attendee[]> = {};
      if (timed.length <= ATTENDEE_LOOKUP_LIMIT) {
        await Promise.all(
          timed.map(async (e) => {
            try {
              attendees[e.id] = await Calendar.getAttendeesForEventAsync(
                e.id,
                e.startDate ? { instanceStartDate: e.startDate } : undefined,
              );
            } catch {
              // Attendees are optional — fall back to the notes / Unknown Client.
            }
          }),
        );
      }
      const mapped = mapDeviceEvents(events, attendees);
      if (mapped.appointments.length === 0) {
        Alert.alert(
          'No events found',
          events.length > 0
            ? 'Only all-day events were found in that range. Timed events become appointments.'
            : 'There are no events in the selected calendars for that date range.',
        );
        return;
      }
      onLoaded({
        ...mapped,
        label: `Device Calendar (${ids.length} calendar${ids.length === 1 ? '' : 's'})`,
      });
    } catch (e) {
      Alert.alert('Calendar Error', e instanceof Error ? e.message : 'Could not read events.');
    } finally {
      setLoading(false);
    }
  };

  const capsule = theme.isEditorial ? 2 : 999;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.action, { color: theme.accent }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Device Calendar</Text>
          <Text style={[styles.action, styles.hidden]}>Cancel</Text>
        </View>

        {permission === 'checking' ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : permission !== 'granted' ? (
          <View style={[styles.center, styles.denied]}>
            <ThemedIconTile name="calendar" size={60} />
            <Text style={[theme.display(22), styles.centerText]}>Calendar access needed</Text>
            <Text style={[styles.sub, { color: theme.secondaryText }]}>
              {permission === 'blocked'
                ? 'Calendar access is turned off for ToolBelt. Turn it on in Settings to import your events as appointments.'
                : 'ToolBelt reads events from your phone’s calendars so you can bring them in as appointments. You review everything before it’s imported.'}
            </Text>
            {permission === 'blocked' ? (
              <ThemedButton title="Open Settings" icon="gearshape.fill" onPress={() => Linking.openSettings()} style={styles.stretch} />
            ) : (
              <ThemedButton title="Allow Calendar Access" icon="calendar" onPress={requestAccess} style={styles.stretch} />
            )}
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Date range</Text>
              <View style={[styles.card, theme.card]}>
                <DateRow label="From" date={from} onPress={() => pickDate('from')} onChange={(d) => setFrom(startOfDay(d))} />
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <DateRow label="To" date={to} onPress={() => pickDate('to')} onChange={(d) => setTo(startOfDay(d))} />
              </View>

              <Text style={[styles.label, { color: theme.secondaryText }]}>Calendars</Text>
              {calendars.length === 0 ? (
                <Text style={[styles.sub, { color: theme.secondaryText }]}>No calendars found on this device.</Text>
              ) : (
                <View style={[styles.card, theme.card]}>
                  {calendars.map((c, i) => {
                    const on = selected.has(c.id);
                    return (
                      <View key={c.id}>
                        {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                        <Pressable onPress={() => toggle(c.id)} style={styles.calRow}>
                          {/* User calendar colour — data, not UI chrome. */}
                          <View style={[styles.calDot, { backgroundColor: c.color || theme.accent }]} />
                          <View style={styles.flex}>
                            <Text style={[styles.calTitle, { color: theme.primaryText }]} numberOfLines={1}>{c.title}</Text>
                            {c.source?.name ? (
                              <Text style={[styles.calSub, { color: theme.secondaryText }]} numberOfLines={1}>{c.source.name}</Text>
                            ) : null}
                          </View>
                          <Icon name={on ? 'checkmark.circle.fill' : 'circle'} size={22} color={on ? theme.accent : theme.tertiaryText} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
              <Text style={[styles.note, { color: theme.tertiaryText }]}>All-day events are skipped. You can review and deselect anything before importing.</Text>
            </ScrollView>
            <View style={styles.footer}>
              <Pressable
                onPress={readEvents}
                disabled={loading || selected.size === 0}
                style={[styles.primary, { backgroundColor: theme.accent, borderRadius: capsule, opacity: selected.size === 0 ? 0.5 : 1 }]}>
                {loading ? (
                  <ActivityIndicator color={theme.onAccent} />
                ) : (
                  <Text style={[styles.primaryText, { color: theme.onAccent }]}>Read Events</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function DateRow({ label, date, onPress, onChange }: { label: string; date: Date; onPress: () => void; onChange: (d: Date) => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} disabled={Platform.OS !== 'android'} style={styles.dateRow}>
      <Text style={[styles.dateLabel, { color: theme.primaryText }]}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          accentColor={theme.accent}
          onChange={(_e, d) => d && onChange(d)}
        />
      ) : (
        <View style={styles.dateValueRow}>
          <Text style={[styles.dateValue, { color: theme.primaryText }]}>{rangeFmt.format(date)}</Text>
          <Icon name="chevron.right" size={12} color={theme.chevronTint} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '88%', minHeight: 360, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 6, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.5)', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  action: { fontSize: 16 },
  hidden: { opacity: 0 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  centerText: { textAlign: 'center' },
  denied: { paddingHorizontal: 28, gap: 14 },
  stretch: { alignSelf: 'stretch', marginTop: 4 },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  body: { padding: 16, gap: 10 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  card: { overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, minHeight: 48 },
  dateLabel: { fontSize: 16 },
  dateValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateValue: { fontSize: 16 },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  calDot: { width: 12, height: 12, borderRadius: 6 },
  calTitle: { fontSize: 16 },
  calSub: { fontSize: 12, marginTop: 2 },
  note: { fontSize: 12, marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  primary: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  primaryText: { fontSize: 16, fontWeight: '600' },
});
