/**
 * PriceTypeSheet — bottom sheet to pick Fixed vs Variable pricing.
 * Port of PriceTypePickerSheet (AddServiceView.swift).
 */

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import type { PriceType } from '@/models/service';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const OPTIONS: { type: PriceType; desc: string }[] = [
  { type: 'Fixed', desc: 'Set a fixed price for the service' },
  { type: 'Variable', desc: 'Set a price range (e.g., $15 - $50)' },
];

export function PriceTypeSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: PriceType;
  onSelect: (t: PriceType) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: theme.secondaryText }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Price Type</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.options}>
          {OPTIONS.map(({ type, desc }) => {
            const active = selected === type;
            return (
              <Pressable
                key={type}
                onPress={() => {
                  onSelect(type);
                  onClose();
                }}
                style={[
                  styles.option,
                  active ? { backgroundColor: withOpacity(iOSColors.blue, 0.1) } : null,
                ]}>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: theme.primaryText }]}>{type}</Text>
                  <Text style={[styles.optionDesc, { color: theme.secondaryText }]}>{desc}</Text>
                </View>
                {active ? (
                  <Icon name="checkmark.circle.fill" size={24} color={iOSColors.blue} />
                ) : (
                  <View style={[styles.radio, { borderColor: withOpacity(iOSColors.gray, 0.3) }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cancel: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600', color: iOSColors.blue },
  divider: { height: StyleSheet.hairlineWidth },
  options: { padding: 16, gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  optionText: { gap: 4, flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '500' },
  optionDesc: { fontSize: 14 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
});
