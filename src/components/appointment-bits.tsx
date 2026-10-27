/**
 * Shared building blocks for the Create / Edit appointment screens — keeps the
 * two ports visually identical (date button, time cards, service time-breakdown,
 * labeled rows). Extracted from CreateAppointmentView.swift's sub-views.
 */

import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { endTimeString, formatTimeDisplay } from '@/lib/appointment-time';
import type { Service } from '@/models/service';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function Section({ label, children }: { label: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{label}</Text>
      {children}
    </View>
  );
}

export function FieldRow({ onPress, children }: { onPress?: () => void; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, styles.row, theme.card]}>
      {children}
    </Pressable>
  );
}

export function DateButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dateBtn, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : theme.cornerRadius }]}>
      <Icon name="calendar" size={18} color={theme.onAccent} />
      <Text style={[styles.dateText, { color: theme.onAccent }]}>{label}</Text>
      <View style={styles.flexEnd}>
        <Icon name="chevron.down" size={14} color={withOpacity(theme.onAccent, 0.8)} />
      </View>
    </Pressable>
  );
}

export function TimeCard({
  label, hour, minute, isPM, onPress,
}: {
  /** `accent` is ignored — cards use the look's accent. Kept for existing callers. */
  label: string; hour: number; minute: number; isPM: boolean; accent?: string; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.timeCard, theme.card]}>
      <Text style={[styles.timeLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={styles.timeValueRow}>
        <Text style={[theme.display(24, '500')]}>{formatTimeDisplay(hour, minute)}</Text>
        <Text style={[styles.timeAmpm, { color: theme.accent }]}>{isPM ? 'PM' : 'AM'}</Text>
      </View>
      <Icon name="clock.fill" size={16} color={theme.accent} />
    </Pressable>
  );
}

export function DurationRow({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.durationRow}>
      <Icon name="timer" size={14} color={theme.secondaryText} />
      <Text style={[styles.durationText, { color: theme.secondaryText }]}>Duration: {label}</Text>
    </View>
  );
}

export function InputRow({
  icon, placeholder, value, onChangeText,
}: {
  icon: SFSymbol; placeholder: string; value: string; onChangeText: (t: string) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, styles.row, theme.card]}>
      <Icon name={icon} size={18} color={theme.secondaryText} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.tertiaryText}
        style={[styles.input, { color: theme.primaryText }]}
      />
    </View>
  );
}

/** The accent-tinted processing/block time-breakdown card. */
export function ServiceBreakdown({
  service, actualDuration, startHour, startMinute, startIsPM,
}: {
  service: Service; actualDuration: number; startHour: number; startMinute: number; startIsPM: boolean;
}) {
  const theme = useAppTheme();
  if (service.processingTime === 0 && service.blockTime === 0) return null;

  const ends = (mins: number) => endTimeString(startHour, startMinute, startIsPM, mins);
  const total = actualDuration + service.processingTime + service.blockTime;

  return (
    <View style={[styles.breakdown, { borderColor: theme.divider, backgroundColor: theme.accentSoft, borderRadius: theme.cornerRadius }]}>
      <Line color={service.colorHex} label="Appointment" trailing={`${actualDuration} min`} ends={ends(actualDuration)} />
      {service.processingTime > 0 ? (
        <Line color={withOpacity(service.colorHex, 0.6)} label="Processing" tag="(bookable)" tagColor={iOSColors.green} trailing={`+${service.processingTime} min`} ends={ends(actualDuration + service.processingTime)} />
      ) : null}
      {service.blockTime > 0 ? (
        <Line color={theme.tertiaryText} label="Blocked" tag="(unavailable)" tagColor={iOSColors.red} trailing={`+${service.blockTime} min`} ends={ends(actualDuration + service.processingTime + service.blockTime)} />
      ) : null}
      <View style={[styles.breakdownDivider, { backgroundColor: theme.divider }]} />
      <View style={styles.breakdownTotal}>
        <Icon name="clock.fill" size={12} color={theme.accent} />
        <Text style={[styles.totalLabel, { color: theme.primaryText }]}>Total slot reserved</Text>
        <View style={styles.flexEnd}>
          <Text style={[styles.totalValue, { color: theme.accent }]}>{total} min</Text>
        </View>
      </View>
    </View>
  );
}

function Line({
  color, label, tag, tagColor, trailing, ends,
}: {
  color: string; label: string; tag?: string; tagColor?: string; trailing: string; ends: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownDot, { backgroundColor: color }]} />
      <Text style={[styles.breakdownLabel, { color: theme.primaryText }]}>{label}</Text>
      {tag ? <Text style={[styles.breakdownTag, { color: tagColor }]}>{tag}</Text> : null}
      <View style={styles.flexEnd}>
        <Text style={[styles.breakdownTrailing, { color: theme.secondaryText }]}>{trailing}</Text>
        <Text style={[styles.breakdownEnds, { color: theme.primaryText }]}>ends {ends}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '500' },
  card: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flexEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  dateText: { fontSize: 16, fontWeight: '500', flex: 1 },
  timeCard: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16 },
  timeLabel: { fontSize: 12, fontWeight: '500' },
  timeValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timeAmpm: { fontSize: 14, fontWeight: '600' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  durationText: { fontSize: 14, fontWeight: '500' },
  input: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  breakdown: { borderWidth: 1, padding: 16, gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownDot: { width: 12, height: 12, borderRadius: 6 },
  breakdownLabel: { fontSize: 14 },
  breakdownTag: { fontSize: 11 },
  breakdownTrailing: { fontSize: 14, fontWeight: '500' },
  breakdownEnds: { fontSize: 14, fontWeight: '600' },
  breakdownDivider: { height: StyleSheet.hairlineWidth },
  breakdownTotal: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 14, fontWeight: '700' },
});
