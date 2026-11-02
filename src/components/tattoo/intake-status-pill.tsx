/** IntakeStatusPill — a request's status. "Needs review" stands out in orange. */

import { StyleSheet, Text, View } from 'react-native';

import { withOpacity } from '@/lib/color';
import { intakeStatusLabel } from '@/lib/tattoo';
import type { TattooIntakeStatus } from '@/models/tattoo';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function IntakeStatusPill({ status }: { status: TattooIntakeStatus }) {
  const theme = useAppTheme();
  const color =
    status === 'needs_review'
      ? iOSColors.orange
      : status === 'ready' || status === 'booked'
        ? theme.live
        : theme.secondaryText;
  return (
    <View style={[styles.pill, { backgroundColor: withOpacity(color, 0.14), borderRadius: theme.isEditorial ? 2 : 999 }]}>
      <Text style={[styles.text, { color }]}>{intakeStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
