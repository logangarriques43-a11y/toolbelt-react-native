/**
 * SingleDayAppointmentBlock — a positioned appointment in the day grid, with
 * optional processing (hatched/dashed) and block-time (gray) sub-blocks below.
 * Port of SingleDayAppointmentBlock (SingleDayScheduleGrid.swift). The Swift
 * diagonal-stripe fills are approximated with tints + a dashed/solid border.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { PX_PER_MIN } from '@/lib/schedule-layout';
import { appointmentTimeRange, type Appointment } from '@/models/appointment';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function AppointmentBlock({
  appointment: a,
  width,
  onPress,
}: {
  appointment: Appointment;
  width: number;
  onPress: () => void;
}) {
  const theme = useAppTheme();

  const apptH = a.duration * PX_PER_MIN;
  const procH = a.processingTime * PX_PER_MIN;
  const blockH = a.blockTime * PX_PER_MIN;
  const hasTail = a.processingTime > 0 || a.blockTime > 0;

  return (
    <Pressable onPress={onPress} style={{ width }}>
      {/* Main appointment */}
      <View
        style={[
          styles.main,
          {
            height: apptH,
            width,
            backgroundColor: theme.cardBackground,
            borderColor: withOpacity(a.serviceColor, 0.3),
            borderBottomLeftRadius: hasTail ? 0 : 8,
            borderBottomRightRadius: hasTail ? 0 : 8,
            shadowColor: theme.shadowColor,
          },
        ]}>
        <View style={[styles.colorBar, { backgroundColor: a.serviceColor }]} />
        <View style={styles.textBlock}>
          <Text numberOfLines={1} style={[styles.client, { color: theme.primaryText }]}>{a.clientName}</Text>
          {apptH > 50 ? (
            <Text numberOfLines={1} style={[styles.service, { color: theme.secondaryText }]}>{a.serviceName}</Text>
          ) : null}
          {apptH > 80 ? (
            <Text numberOfLines={1} style={[styles.time, { color: theme.secondaryText }]}>{appointmentTimeRange(a)}</Text>
          ) : null}
        </View>
        {apptH > 50 ? (
          <Text style={[styles.price, { color: theme.primaryText }]}>${a.price.toFixed(0)}</Text>
        ) : null}
      </View>

      {/* Processing */}
      {a.processingTime > 0 ? (
        <View
          style={[
            styles.tail,
            {
              height: procH,
              width,
              backgroundColor: withOpacity(a.serviceColor, 0.1),
              borderColor: withOpacity(a.serviceColor, 0.5),
              borderStyle: 'dashed',
              borderBottomLeftRadius: a.blockTime > 0 ? 0 : 8,
              borderBottomRightRadius: a.blockTime > 0 ? 0 : 8,
            },
          ]}>
          {procH >= 24 ? (
            <View style={styles.tailLabel}>
              <Icon name="hourglass" size={11} color={withOpacity(a.serviceColor, 0.7)} />
              <Text style={[styles.tailText, { color: withOpacity(a.serviceColor, 0.7) }]}>Processing</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Block time */}
      {a.blockTime > 0 ? (
        <View
          style={[
            styles.tail,
            {
              height: blockH,
              width,
              backgroundColor: withOpacity(iOSColors.gray, 0.25),
              borderColor: withOpacity(iOSColors.gray, 0.5),
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
            },
          ]}>
          {blockH >= 24 ? (
            <View style={styles.tailLabel}>
              <Icon name="lock.fill" size={11} color={withOpacity(iOSColors.gray, 0.8)} />
              <Text style={[styles.tailText, { color: withOpacity(iOSColors.gray, 0.8) }]}>Blocked</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  textBlock: { flex: 1, gap: 4 },
  client: { fontSize: 16, fontWeight: '600' },
  service: { fontSize: 14 },
  time: { fontSize: 12 },
  price: { fontSize: 14, fontWeight: '500' },
  tail: { borderWidth: 1, borderTopWidth: 0, overflow: 'hidden' },
  tailLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 6 },
  tailText: { fontSize: 11, fontWeight: '500' },
});
