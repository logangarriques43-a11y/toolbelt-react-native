/**
 * CompactAppointmentBlock — the dense appointment block used in the multi-column
 * Week / 3-Day grids. Port of CompactAppointmentBlock (WeeklyScheduleGrid.swift):
 * a filled color block with white text and slim processing/block tails.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { withOpacity } from '@/lib/color';
import { blockMetrics } from '@/lib/schedule-layout';
import type { Appointment } from '@/models/appointment';
import { useAppTheme } from '@/theme/theme-context';

export function CompactAppointmentBlock({
  appointment: a,
  width,
  onPress,
  staffTint = null,
}: {
  appointment: Appointment;
  width: number;
  onPress: () => void;
  /** Assigned staff member's color; when set, shows a slim left accent strip. */
  staffTint?: string | null;
}) {
  const theme = useAppTheme();
  // Clamped to end-of-day (mirrors Swift SingleDayBlockMetrics) so an overnight
  // or bad-data 1440+min appointment can't overrun the grid bottom.
  const { core: apptH, processing: procH, blocked: blockH } = blockMetrics(a);
  const hasTail = procH > 0 || blockH > 0;

  return (
    <Pressable onPress={onPress} style={{ width }}>
      <View
        style={[
          styles.main,
          {
            height: apptH,
            width,
            backgroundColor: a.serviceColor,
            borderBottomLeftRadius: hasTail ? 0 : 4,
            borderBottomRightRadius: hasTail ? 0 : 4,
          },
        ]}>
        {staffTint ? <View pointerEvents="none" style={[styles.staffStrip, { backgroundColor: staffTint }]} /> : null}
        <Text numberOfLines={1} style={styles.client}>{a.clientName}</Text>
        {apptH > 30 ? (
          <Text numberOfLines={1} style={styles.service}>{a.serviceName}</Text>
        ) : null}
      </View>

      {procH > 0 ? (
        <View
          style={[
            styles.tail,
            {
              height: procH,
              width,
              backgroundColor: withOpacity(a.serviceColor, 0.15),
              borderColor: withOpacity(a.serviceColor, 0.5),
              borderStyle: 'dashed',
              borderBottomLeftRadius: blockH > 0 ? 0 : 4,
              borderBottomRightRadius: blockH > 0 ? 0 : 4,
            },
          ]}
        />
      ) : null}

      {blockH > 0 ? (
        <View
          style={[
            styles.tail,
            {
              height: blockH,
              width,
              backgroundColor: theme.inputBackground,
              borderColor: theme.divider,
              borderBottomLeftRadius: 4,
              borderBottomRightRadius: 4,
            },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  main: { paddingHorizontal: 4, paddingVertical: 3, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden' },
  staffStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  client: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  service: { fontSize: 9, color: 'rgba(255,255,255,0.9)' },
  tail: { borderWidth: 1, overflow: 'hidden' },
});
