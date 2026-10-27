/**
 * The AI helper's entry point on the home screen, under the greeting (port of
 * HelperEntryCard.swift): a tap opens the chat; a starter chip opens it and
 * asks that question.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

const CHIPS = ['Import appointments', 'Set up online booking', 'Get paid out'];

export function HelperEntryCard({ onOpen }: { onOpen: (question: string | null) => void }) {
  const theme = useAppTheme();
  return (
    <View style={[theme.card, styles.card]}>
      <Pressable
        onPress={() => onOpen(null)}
        accessibilityHint="Opens the AI helper chat"
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
        <View style={[styles.icon, { backgroundColor: theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 20 }]}>
          <Icon name="sparkles" size={17} color={theme.accent} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: theme.primaryText }]}>AI helper</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Ask how to set up or use anything</Text>
        </View>
        <Icon name="chevron.right" size={13} color={theme.chevronTint} />
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CHIPS.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => onOpen(`How do I ${chip.toLowerCase()}?`)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 999 },
              pressed ? styles.pressed : null,
            ]}>
            <Text style={[styles.chipText, { color: theme.primaryText }]}>{chip}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 14 },
  chips: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.8 },
});
