/**
 * Message Settings — port of MessageSettingsView.swift.
 *
 * The Swift screen is a stub (local toggles, TODO detail editors), so only the
 * parts the backend really does are interactive here:
 * - Reminder: the automatic appointment reminder, showing the Reminder Timing
 *   from business settings and opening Settings → Reminder Timing.
 * - AI auto-reply: the AI texting kill switch, GET/PATCH /ai-responder. When
 *   off, inbound texts are still logged but get no automated reply. It only
 *   takes effect once the business has an AI texting number (the PATCH
 *   reports `updated: 0` otherwise, which we explain). The local Settings
 *   copy (`aiAutoReply`) is kept in step.
 * - Sending: texts go out from the ToolBelt AI texting number (or a prompt to
 *   get one), not the phone's carrier.
 * Follow-ups, rebooking reminders, custom message types and template editing
 * don't exist on the backend, so they're stated plainly instead of offered.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ThemedIconTile } from '@/components/themed';
import { useBusinessSettings } from '@/context/business-settings-store';
import { useSMS } from '@/context/sms-store';
import { api, ApiError } from '@/lib/api-client';
import { withOpacity } from '@/lib/color';
import { reminderTimingLabel } from '@/models/business-settings';
import { useAppTheme } from '@/theme/theme-context';

const AI_RESPONDER_KEY = ['ai-responder'] as const;

export default function MessagesSettings() {
  const theme = useAppTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const settings = useBusinessSettings();
  const { phoneNumber } = useSMS();
  const hasNumber = phoneNumber?.isActive === true;

  const responder = useQuery({
    queryKey: AI_RESPONDER_KEY,
    queryFn: () => api.get<{ enabled: boolean }>('/ai-responder'),
  });
  const [saving, setSaving] = useState(false);

  const setAutoReply = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await api.patch<{ enabled: boolean; updated: number }>('/ai-responder', { enabled });
      qc.setQueryData(AI_RESPONDER_KEY, { enabled: res.enabled });
      settings.set('aiAutoReply', res.enabled);
      if (res.updated === 0) {
        Alert.alert(
          'Saved',
          "You don't have an AI texting number yet, so there's nothing to switch right now. Set one up under AI Texting.",
        );
      }
    } catch (e) {
      Alert.alert("Couldn't Update", e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <Icon name="chevron.left" size={20} color={theme.accent} weight="semibold" />
          </Pressable>
          <Text style={theme.display(20)}>Message Settings</Text>
          <Pressable onPress={() => router.push('/help')} hitSlop={8} style={styles.headerBtn}>
            <Icon name="questionmark.circle.fill" size={24} color={theme.accent} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Messages */}
          <Text style={theme.display(20)}>Messages</Text>
          <View style={[styles.card, theme.card]}>
            <Pressable style={styles.settingRow} onPress={() => router.push('/settings/reminder-timing')}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: theme.primaryText }]}>Reminder</Text>
                <Text style={[styles.rowSub, { color: theme.secondaryText }]}>
                  {reminderTimingLabel(settings.reminderHours)} appointment
                </Text>
                <Text style={[styles.badge, { color: theme.live }]}>Added automatically to each appointment</Text>
              </View>
              <Icon name="chevron.right" size={14} color={theme.secondaryText} />
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.settingRow}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: theme.primaryText }]}>AI auto-reply</Text>
                <Text style={[styles.rowSub, { color: theme.secondaryText }]}>
                  {responder.data?.enabled === false
                    ? 'Off — incoming texts are logged for you to answer'
                    : 'Your AI assistant answers and books incoming texts'}
                </Text>
              </View>
              {responder.isLoading || saving ? (
                <ActivityIndicator color={theme.accent} />
              ) : responder.error ? (
                <Pressable onPress={() => responder.refetch()} hitSlop={8}>
                  <Text style={[styles.retry, { color: theme.accent }]}>Retry</Text>
                </Pressable>
              ) : (
                <Switch
                  value={responder.data?.enabled !== false}
                  onValueChange={setAutoReply}
                  trackColor={{ true: theme.accent, false: theme.inputBackground }}
                />
              )}
            </View>
          </View>

          {/* Sending */}
          <Text style={theme.display(20)}>Sending method</Text>
          <Pressable style={[styles.rowCard, theme.card]} onPress={() => router.push('/sms-setup')}>
            <ThemedIconTile name="bubble.left.and.text.bubble.right.fill" size={40} />
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: theme.primaryText }]}>
                {hasNumber ? 'Automated' : 'No texting number yet'}
              </Text>
              <Text style={[styles.rowSub, { color: theme.secondaryText }]}>
                {hasNumber
                  ? `Sent from your ToolBelt number ${phoneNumber?.phoneNumber ?? ''}`.trim()
                  : 'Set up AI Texting to send reminders from a business number'}
              </Text>
            </View>
            <Icon name="chevron.right" size={14} color={theme.secondaryText} />
          </Pressable>

          {/* Honest scope note */}
          <View style={[styles.noteCard, theme.card]}>
            <Icon name="info.circle" size={18} color={theme.secondaryText} />
            <Text style={[styles.noteText, { color: theme.secondaryText }]}>
              Follow-ups, rebooking reminders, extra message types and editable templates aren&apos;t available yet.
              Reminders use ToolBelt&apos;s standard wording.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 14, marginTop: 4 },
  badge: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  retry: { fontSize: 15, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
