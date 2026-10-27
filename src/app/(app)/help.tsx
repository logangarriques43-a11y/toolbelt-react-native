/**
 * Help & Support — port of HelpView.swift.
 * Search (visual), expandable quick-help topics, the support email, and an
 * expandable FAQ. Copy follows the iOS Help screen (PR #371), with Android paths.
 */

import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

const SUPPORT_EMAIL = 'support@tools-belt.com';

// Paths below match the shipped Android UI: the home screen, its avatar menu,
// Settings and the Calendar's ☰ menu are the entry points (same copy as the
// iOS Help screen where the two apps match).
const TOPICS: { icon: SFSymbol; title: string; detail: string }[] = [
  {
    icon: 'calendar',
    title: 'Booking appointments',
    detail:
      'Tap New appointment on the home screen, or open the Calendar and tap + → Appointment. Pick a client, staff member, date and time, and services, then tap Save. To change a booking, open it from the calendar (or tap Details on the home screen) and tap Reschedule. Swipe left on an appointment in the calendar to delete it.',
  },
  {
    icon: 'bubble.left.and.text.bubble.right',
    title: 'Setting up AI texting',
    detail:
      'On the home screen, tap AI texting under Channels (it is also in Settings → AI SMS Assistant → SMS Setup). Tap Get Started, choose an area code and a plan, and confirm with Google Play. The assistant answers client texts, books open times and sends reminders. Read every conversation in Settings → AI SMS Assistant → View Conversations.',
  },
  {
    icon: 'building.columns',
    title: 'Setting up payouts',
    detail:
      'Go to Settings → Payments & Billing → Payout Settings (or Payout setup in the menu under your initials) to connect your bank through Stripe. You need payouts before clients can pay an invoice through its Pay Now button.',
  },
  {
    icon: 'person.2',
    title: 'Managing clients & staff',
    detail:
      'Tap Clients on the home screen (or ☰ → Clients in the Calendar) to add, search and edit clients. Tap Team to add staff members and the services they provide, and tap a staff member to set their working hours.',
  },
  {
    icon: 'doc.text',
    title: 'Sending invoices',
    detail:
      'Tap Create invoice on the home screen (or + → Invoice in the Calendar). Add line items, then tap Send and choose Send via email. Clients can pay online once payouts are set up. Add your business name in Settings → Business Name & Info so clients know who the invoice is from.',
  },
  {
    icon: 'questionmark.circle',
    title: 'Asking the AI helper',
    detail:
      'Tap AI helper near the top of the home screen and ask how to set up or use anything. Answers come with buttons that open the right screen. The helper sees your setup (services, staff, what is connected), not client details.',
  },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'How do I change my business hours?',
    answer:
      'Open Settings → Business Hours (or Working hours from the Calendar). These hours decide which times the AI assistant offers. Each staff member can also have their own hours, set from their staff card.',
  },
  {
    question: 'Can I have multiple staff members?',
    answer: 'Yes. Add them under Team and assign their services and hours.',
  },
  {
    question: 'How does AI SMS scheduling work?',
    answer:
      'Clients text your business number. The assistant answers questions, finds open times from your working hours and books the appointment, which then appears on your calendar. You can read every conversation in Settings → AI SMS Assistant → View Conversations.',
  },
  {
    question: 'How do I export my client data?',
    answer:
      'Go to Settings → Data & Privacy → Export Data. Choose CSV or JSON and what to include, then export. Your data is always yours to keep.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      'ToolBelt is free; only AI texting is a paid plan. Cancel it from your Google Play subscriptions. Turning off AI Texting in the app does not cancel the Play subscription by itself.',
  },
];

export default function Help() {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [openTopic, setOpenTopic] = useState<number | null>(null);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Help & Support" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.search, theme.card, { borderRadius: theme.isEditorial ? 2 : 14 }]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search for help..." placeholderTextColor={theme.tertiaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
          </View>

          <Text style={[styles.section, theme.display(22)]}>Quick Help</Text>
          <View style={[styles.card, theme.card]}>
            {TOPICS.map((t, i) => (
              <View key={t.title}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <Pressable style={styles.topicRow} onPress={() => setOpenTopic(openTopic === i ? null : i)}>
                  <ThemedIconTile name={t.icon} size={36} />
                  <Text style={[styles.topicTitle, { color: theme.primaryText }]}>{t.title}</Text>
                  <Icon name={openTopic === i ? 'chevron.down' : 'chevron.right'} size={14} color={theme.chevronTint} />
                </Pressable>
                {openTopic === i ? (
                  <Text style={[styles.faqA, { color: theme.secondaryText }]}>{t.detail}</Text>
                ) : null}
              </View>
            ))}
          </View>

          <Text style={[styles.section, theme.display(22)]}>Contact Us</Text>
          <View style={styles.contacts}>
            <Pressable
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
              style={[styles.contactCard, theme.card]}>
              <ThemedIconTile name="envelope.fill" size={44} />
              <View style={styles.contactText}>
                <Text style={[styles.contactTitle, { color: theme.primaryText }]}>Email Support</Text>
                <Text style={[styles.contactSub, { color: theme.secondaryText }]}>{SUPPORT_EMAIL}</Text>
              </View>
              <Icon name="arrow.up.right" size={14} color={theme.chevronTint} />
            </Pressable>
          </View>

          <Text style={[styles.section, theme.display(22)]}>Frequently Asked Questions</Text>
          <View style={[styles.card, theme.card]}>
            {FAQS.map(({ question: q, answer }, i) => (
              <View key={q}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <Pressable onPress={() => setExpanded(expanded === i ? null : i)} style={styles.faqRow}>
                  <Text style={[styles.faqQ, { color: theme.primaryText }]}>{q}</Text>
                  <Icon name={expanded === i ? 'chevron.up' : 'chevron.down'} size={14} color={theme.secondaryText} />
                </Pressable>
                {expanded === i ? (
                  <Text style={[styles.faqA, { color: theme.secondaryText }]}>{answer}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  section: { paddingHorizontal: 4, paddingTop: 4 },
  card: { overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  topicTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  contacts: { gap: 12 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  contactText: { flex: 1, gap: 2 },
  contactTitle: { fontSize: 16, fontWeight: '600' },
  contactSub: { fontSize: 13 },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  faqQ: { flex: 1, fontSize: 16, fontWeight: '500' },
  faqA: { fontSize: 14, paddingHorizontal: 16, paddingBottom: 14, lineHeight: 19 },
});
