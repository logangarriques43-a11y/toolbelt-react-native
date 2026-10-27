/**
 * PriceTypeSheet — bottom sheet to pick Fixed vs Variable pricing.
 * Port of PriceTypePickerSheet (AddServiceView.swift).
 */

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import type { PriceType } from '@/models/service';
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
          <Text style={theme.display(20)}>Price Type</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
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
                  { borderRadius: theme.cornerRadius },
                  active ? { backgroundColor: theme.accentSoft } : null,
                ]}>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: theme.primaryText }]}>{type}</Text>
                  <Text style={[styles.optionDesc, { color: theme.secondaryText }]}>{desc}</Text>
                </View>
                {active ? (
                  <Icon name="checkmark.circle.fill" size={24} color={theme.accent} />
                ) : (
                  <View style={[styles.radio, { borderColor: theme.divider }]} />
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
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cancel: { fontSize: 16, fontWeight: '500' },
  done: { fontSize: 16, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  options: { padding: 16, gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionText: { gap: 4, flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '500' },
  optionDesc: { fontSize: 14 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
});
