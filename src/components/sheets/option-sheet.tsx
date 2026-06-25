/**
 * OptionSheet — generic single-select bottom sheet (label + checkmark).
 * Used for the SMS reminder timing; reusable for similar pickers.
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface Option<T> {
  label: string;
  value: T;
}

export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        <ScrollView style={styles.list}>
          {options.map((opt) => (
            <Pressable
              key={String(opt.value)}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
              style={styles.row}>
              <Text style={[styles.label, { color: theme.primaryText }]}>{opt.label}</Text>
              {opt.value === selected ? (
                <Icon name="checkmark" size={16} color={iOSColors.blue} />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32, maxHeight: '70%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600', color: iOSColors.blue },
  divider: { height: StyleSheet.hairlineWidth },
  list: { paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 16 },
  label: { fontSize: 16 },
});
