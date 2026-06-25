/**
 * ColorPickerSheet — full-screen preset color grid + selected preview.
 * Port of ServiceColorPickerView (AddServiceView.swift). The live custom-color
 * wheel (SwiftUI ColorPicker) is deferred — RN has no built-in equivalent
 * without an extra native module — so this exposes the preset palette + preview.
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

/** Preset palette used by AddServiceView (`colors`). */
export const SERVICE_COLORS = [
  iOSColors.blue,
  iOSColors.purple,
  iOSColors.orange,
  iOSColors.green,
  iOSColors.pink,
  iOSColors.red,
  iOSColors.teal,
  iOSColors.indigo,
  iOSColors.cyan,
  iOSColors.mint,
];

export function ColorPickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
  colors = SERVICE_COLORS,
}: {
  visible: boolean;
  selected: string;
  onSelect: (hex: string) => void;
  onClose: () => void;
  colors?: string[];
}) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.cancel, { color: theme.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.primaryText }]}>Pick a Color</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.section, { color: theme.primaryText }]}>Preset Colors</Text>
            <View style={styles.grid}>
              {colors.map((c) => {
                const active = c.toLowerCase() === selected.toLowerCase();
                return (
                  <Pressable
                    key={c}
                    onPress={() => onSelect(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c, borderColor: active ? iOSColors.blue : 'transparent' },
                    ]}
                  />
                );
              })}
            </View>

            <Text style={[styles.section, { color: theme.primaryText }]}>Selected</Text>
            <View
              style={[
                styles.previewCard,
                { backgroundColor: theme.cardBackground },
              ]}>
              <View
                style={[
                  styles.preview,
                  { backgroundColor: selected, borderColor: withOpacity(iOSColors.gray, 0.3) },
                ]}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cancel: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600', color: iOSColors.blue },
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { fontSize: 18, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between' },
  swatch: { width: 50, height: 50, borderRadius: 25, borderWidth: 3 },
  previewCard: { padding: 16, borderRadius: 12 },
  preview: { height: 80, borderRadius: 12, borderWidth: 1 },
});
