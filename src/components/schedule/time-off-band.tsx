/**
 * TimeOffBand — a blocked-time band drawn on the schedule grid. Port of the
 * band rendered by SingleDayTimeOffOverlay / MultiDayTimeOffOverlay
 * (SingleDayScheduleGrid.swift): a dashed gray rounded rect labeled with the
 * closure/staff-off reason. Tapping it opens the cancel dialog — owners
 * (manageTimeOff) delete directly; staff send a cancellation request.
 */

import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { timeOffBandLabel, timeOffCancelMessage, type TimeOffEvent } from '@/models/time-off';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function TimeOffBand({
  event,
  top,
  left,
  width,
  height,
  compact = false,
  canManage,
  onDelete,
  onRequestCancel,
}: {
  event: TimeOffEvent;
  top: number;
  left: number;
  width: number;
  height: number;
  /** Icon-only (multi-day columns are narrow); single-day shows the label. */
  compact?: boolean;
  canManage: boolean;
  onDelete: () => void;
  onRequestCancel: () => void;
}) {
  const theme = useAppTheme();

  const confirm = () => {
    const title = canManage ? 'Cancel this time off?' : 'Request to cancel this time off?';
    const message = timeOffCancelMessage(event, canManage);
    if (canManage) {
      Alert.alert(title, message, [
        { text: 'Cancel Time Off', style: 'destructive', onPress: onDelete },
        { text: 'Keep', style: 'cancel' },
      ]);
    } else if (!event.cancellationRequested) {
      Alert.alert(title, message, [
        { text: 'Request Cancellation', onPress: onRequestCancel },
        { text: 'Never mind', style: 'cancel' },
      ]);
    } else {
      Alert.alert(title, message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const icon = event.isBusinessWide ? 'building.2.fill' : 'moon.zzz.fill';

  return (
    <Pressable
      onPress={confirm}
      style={[
        styles.band,
        { top, left, width, height, borderColor: withOpacity(iOSColors.gray, 0.45), backgroundColor: withOpacity(iOSColors.gray, 0.18) },
      ]}>
      {compact ? (
        height > 24 ? <Icon name={icon} size={10} color={theme.secondaryText} /> : null
      ) : (
        <View style={styles.row}>
          <Icon name={icon} size={11} color={theme.secondaryText} />
          <Text numberOfLines={1} style={[styles.label, { color: theme.secondaryText }]}>{timeOffBandLabel(event)}</Text>
          {canManage ? <Icon name="xmark.circle.fill" size={12} color={withOpacity(iOSColors.gray, 0.6)} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    zIndex: 10,
    alignItems: 'center',
    paddingTop: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'stretch' },
  label: { flex: 1, fontSize: 12, fontWeight: '600' },
});
