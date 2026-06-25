/**
 * CompactAppointmentBlock — the dense appointment block used in the multi-column
 * Week / 3-Day grids. Port of CompactAppointmentBlock (WeeklyScheduleGrid.swift):
 * a filled color block with white text and slim processing/block tails.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { withOpacity } from '@/lib/color';
import { PX_PER_MIN } from '@/lib/schedule-layout';
import type { Appointment } from '@/models/appointment';
import { iOSColors } from '@/theme/tokens';

export function CompactAppointmentBlock({
  appointment: a,
  width,
  onPress,
}: {
  appointment: Appointment;
  width: number;
  onPress: () => void;
}) {
  const apptH = a.duration * PX_PER_MIN;
  const procH = a.processingTime * PX_PER_MIN;
  const blockH = a.blockTime * PX_PER_MIN;
  const hasTail = a.processingTime > 0 || a.blockTime > 0;

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
        <Text numberOfLines={1} style={styles.client}>{a.clientName}</Text>
        {apptH > 30 ? (
          <Text numberOfLines={1} style={styles.service}>{a.serviceName}</Text>
        ) : null}
      </View>

      {a.processingTime > 0 ? (
        <View
          style={[
            styles.tail,
            {
              height: procH,
              width,
              backgroundColor: withOpacity(a.serviceColor, 0.15),
              borderColor: withOpacity(a.serviceColor, 0.5),
              borderStyle: 'dashed',
              borderBottomLeftRadius: a.blockTime > 0 ? 0 : 4,
              borderBottomRightRadius: a.blockTime > 0 ? 0 : 4,
            },
          ]}
        />
      ) : null}

      {a.blockTime > 0 ? (
        <View
          style={[
            styles.tail,
            {
              height: blockH,
              width,
              backgroundColor: withOpacity(iOSColors.gray, 0.3),
              borderColor: withOpacity(iOSColors.gray, 0.5),
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
  client: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  service: { fontSize: 9, color: 'rgba(255,255,255,0.9)' },
  tail: { borderWidth: 1, overflow: 'hidden' },
});
