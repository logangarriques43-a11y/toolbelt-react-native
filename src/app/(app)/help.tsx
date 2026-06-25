/**
 * Help & Support — port of HelpView.swift.
 * Search (visual), quick-help topics, contact cards, and an expandable FAQ.
 */

import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const TOPICS: { icon: SFSymbol; title: string; color: string }[] = [
  { icon: 'calendar', title: 'How to set up appointments', color: iOSColors.blue },
  { icon: 'bubble.left.and.text.bubble.right', title: 'Setting up AI SMS texting', color: iOSColors.teal },
  { icon: 'creditcard', title: 'Connecting payments', color: iOSColors.purple },
  { icon: 'person.2', title: 'Managing clients & staff', color: iOSColors.green },
  { icon: 'shippingbox', title: 'Inventory management basics', color: iOSColors.orange },
  { icon: 'globe', title: 'Setting up your booking page', color: iOSColors.indigo },
];

const CONTACTS: { icon: SFSymbol; title: string; subtitle: string; color: string }[] = [
  { icon: 'envelope.fill', title: 'Email Support', subtitle: 'support@toolbelt.app', color: iOSColors.blue },
  { icon: 'message.fill', title: 'Live Chat', subtitle: 'Available Mon-Fri 9am-6pm', color: iOSColors.green },
  { icon: 'phone.fill', title: 'Phone Support', subtitle: 'Available for Pro subscribers', color: iOSColors.orange },
];

const FAQS = [
  'How do I change my business hours?',
  'Can I have multiple staff members?',
  'How does AI SMS scheduling work?',
  'How do I export my client data?',
  'How do I cancel my subscription?',
];

export default function Help() {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Help & Support" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.search, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search for help..." placeholderTextColor={theme.tertiaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
          </View>

          <Text style={[styles.section, { color: theme.primaryText }]}>Quick Help</Text>
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            {TOPICS.map((t, i) => (
              <View key={t.title}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <Pressable style={styles.topicRow}>
                  <View style={[styles.topicIcon, { backgroundColor: theme.iconBackground(t.color) }]}>
                    <Icon name={t.icon} size={16} color={t.color} />
                  </View>
                  <Text style={[styles.topicTitle, { color: theme.primaryText }]}>{t.title}</Text>
                  <Icon name="chevron.right" size={14} color={theme.chevronTint} />
                </Pressable>
              </View>
            ))}
          </View>

          <Text style={[styles.section, { color: theme.primaryText }]}>Contact Us</Text>
          <View style={styles.contacts}>
            {CONTACTS.map((c) => (
              <View key={c.title} style={[styles.contactCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <View style={[styles.contactIcon, { backgroundColor: c.color }]}>
                  <Icon name={c.icon} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.contactText}>
                  <Text style={[styles.contactTitle, { color: theme.primaryText }]}>{c.title}</Text>
                  <Text style={[styles.contactSub, { color: theme.secondaryText }]}>{c.subtitle}</Text>
                </View>
                <Icon name="arrow.up.right" size={14} color={theme.chevronTint} />
              </View>
            ))}
          </View>

          <Text style={[styles.section, { color: theme.primaryText }]}>Frequently Asked Questions</Text>
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            {FAQS.map((q, i) => (
              <View key={q}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <Pressable onPress={() => setExpanded(expanded === i ? null : i)} style={styles.faqRow}>
                  <Text style={[styles.faqQ, { color: theme.primaryText }]}>{q}</Text>
                  <Icon name={expanded === i ? 'chevron.up' : 'chevron.down'} size={14} color={theme.secondaryText} />
                </Pressable>
                {expanded === i ? (
                  <Text style={[styles.faqA, { color: theme.secondaryText }]}>
                    Detailed help for this topic is on the way — reach out to support@toolbelt.app in the meantime.
                  </Text>
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
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  section: { fontSize: 18, fontWeight: '700', paddingHorizontal: 4, paddingTop: 4 },
  card: { borderRadius: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  topicIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  contacts: { gap: 12 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14 },
  contactIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1, gap: 2 },
  contactTitle: { fontSize: 16, fontWeight: '600' },
  contactSub: { fontSize: 13 },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  faqQ: { flex: 1, fontSize: 16, fontWeight: '500' },
  faqA: { fontSize: 14, paddingHorizontal: 16, paddingBottom: 14, lineHeight: 19 },
});
