/**
 * Reminder Timing — port of ReminderTimingView.swift.
 * Pick how far ahead clients get reminders; saved to the business-settings store.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useBusinessSettings } from '@/context/business-settings-store';
import { REMINDER_TIMING_OPTIONS } from '@/models/business-settings';
import { useAppTheme } from '@/theme/theme-context';

export default function ReminderTiming() {
  const theme = useAppTheme();
  const router = useRouter();
  const s = useBusinessSettings();
  const [hours, setHours] = useState(s.reminderHours);

  const save = () => {
    s.set('reminderHours', hours);
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Reminder Timing" />
        <ScrollView contentContainerStyle={styles.body}>
          <ThemedIconTile name="clock.badge" size={72} filled />
          <Text style={[styles.desc, { color: theme.secondaryText }]}>
            Choose how far in advance clients receive appointment reminders.
          </Text>

          <View style={[styles.card, theme.card]}>
            {REMINDER_TIMING_OPTIONS.map((o, i) => (
              <View key={o.hours}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <Pressable onPress={() => setHours(o.hours)} style={styles.option}>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: theme.primaryText }]}>{o.label}</Text>
                    <Text style={[styles.optionSub, { color: theme.secondaryText }]}>{o.subtitle}</Text>
                  </View>
                  <Icon
                    name={hours === o.hours ? 'checkmark.circle.fill' : 'circle'}
                    size={20}
                    color={hours === o.hours ? theme.accent : theme.secondaryText}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          <ThemedButton title="Save" onPress={save} style={styles.save} />
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 20, alignItems: 'center', paddingBottom: 40 },
  desc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  card: { alignSelf: 'stretch', overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  optionSub: { fontSize: 13 },
  save: { alignSelf: 'stretch' },
});
