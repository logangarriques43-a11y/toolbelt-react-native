/**
 * Business Settings — port of BusinessSettingsView.swift (the hub).
 *
 * Theme picker (System / Light / Dark + the Noir, Clay, Editorial and Plum
 * looks) wired to the real app theme; notification toggles + reminder
 * timing + address are backed by the in-session business-settings store. Child
 * screens that exist navigate; the rest show "coming soon" (later batches/phases).
 */

import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { SFSymbol } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount as deleteAccountApi } from '@/api/account';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedIconTile, ThemedSectionHeader } from '@/components/themed';
import { useBusinessSettings } from '@/context/business-settings-store';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { reminderTimingLabel } from '@/models/business-settings';
import { LOOK_SWATCHES, PALETTES, iOSColors, type LookId, type ThemeMode } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BASE = 'https://toolbelt-backend-dtvy.onrender.com';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function Settings() {
  const theme = useAppTheme();
  const router = useRouter();
  const { signOut } = useSession();
  const s = useBusinessSettings();
  const [deleting, setDeleting] = useState(false);

  const soon = (label: string) => Alert.alert('Coming soon', `${label} arrives in a later phase.`);
  const open = (path: string) => WebBrowser.openBrowserAsync(`${BASE}/${path}`);

  // Store-required in-app account deletion: confirm, call the backend purge
  // route, then sign out on success (which unmounts this screen via the auth
  // state listener). Errors keep the user signed in with an explanation.
  const runDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccountApi();
      signOut();
    } catch (err) {
      setDeleting(false);
      const message =
        err instanceof ApiError ? err.message : 'Please check your connection and try again.';
      Alert.alert("Couldn't delete account", message);
    }
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(
      'Delete Account',
      'This permanently deletes your ToolBelt account and all associated data — clients, appointments, invoices, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: runDeleteAccount },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Settings" />
        <ScrollView contentContainerStyle={styles.body}>
          {/* Appearance */}
          <Section title="Appearance">
            <View style={styles.themeBlock}>
              <View style={styles.themeHead}>
                <ThemedIconTile name={theme.isDark ? 'moon.fill' : 'sun.max.fill'} />
                <Text style={[styles.rowTitle, { color: theme.primaryText }]}>Theme</Text>
              </View>
              <View style={[styles.segmented, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 10 }]}>
                {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => {
                  const selected = theme.mode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => theme.setMode(m)}
                      style={[
                        styles.segment,
                        { borderRadius: theme.isEditorial ? 2 : 8 },
                        selected ? { backgroundColor: theme.accent } : null,
                      ]}>
                      <Text style={[styles.segmentText, { color: selected ? theme.onAccent : theme.secondaryText }]}>
                        {m[0].toUpperCase() + m.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.rowSub, { color: theme.secondaryText }]}>More looks</Text>
              <View style={styles.looks}>
                {LOOK_SWATCHES.filter((l) => !['light', 'dark'].includes(l.appearance)).map((l) => (
                  <LookCard
                    key={l.appearance}
                    look={l.look}
                    title={l.title}
                    subtitle={l.subtitle}
                    selected={theme.appearance === l.appearance}
                    onPress={() => theme.setAppearance(l.appearance)}
                  />
                ))}
              </View>
            </View>
            <Divider />
            <Row icon="paintpalette.fill" title="Brand Colors & Logo" onPress={() => soon('Branding')} />
            <Divider />
            <Row icon="textformat" title="Receipt & Invoice Branding" onPress={() => soon('Receipt branding')} />
          </Section>

          {/* Business Profile */}
          <Section title="Business Profile">
            <Row icon="building.2.fill" title="Business Name & Info" onPress={() => router.push('/settings/business-info')} />
            <Divider />
            <Row icon="clock.fill" title="Business Hours" onPress={() => router.push('/working-hours')} />
            <Divider />
            <Row icon="mappin.circle.fill" title="Business Address" color={iOSColors.red} onPress={() => router.push('/settings/business-address')} />
            <Divider />
            <Row icon="globe" title="Online Booking Page" onPress={() => soon('Online Booking')} />
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <ToggleRow icon="bell.fill" title="Push Notifications" value={s.pushEnabled} onChange={(v) => s.set('pushEnabled', v)} />
            <Divider />
            <ToggleRow icon="envelope.fill" title="Email Notifications" value={s.emailEnabled} onChange={(v) => s.set('emailEnabled', v)} />
            <Divider />
            <ToggleRow icon="message.fill" title="SMS Reminders to Clients" value={s.smsEnabled} onChange={(v) => s.set('smsEnabled', v)} />
            <Divider />
            <Row icon="clock.badge" title="Reminder Timing" subtitle={reminderTimingLabel(s.reminderHours)} onPress={() => router.push('/settings/reminder-timing')} />
          </Section>

          {/* AI SMS */}
          <Section title="AI SMS Assistant">
            <Row icon="bubble.left.and.text.bubble.right.fill" title="SMS Setup" onPress={() => router.push('/sms-setup')} />
            <Divider />
            <Row icon="text.bubble.fill" title="View Conversations" onPress={() => router.push('/sms-conversations')} />
            <Divider />
            <ToggleRow icon="brain.head.profile.fill" title="AI Auto-Reply" value={s.aiAutoReply} onChange={(v) => s.set('aiAutoReply', v)} />
            <Divider />
            <Row icon="person.crop.circle.badge.exclamationmark.fill" title="Escalation Rules" subtitle="Auto-escalate after 3 failed intents" onPress={() => router.push('/settings/escalation-rules')} />
          </Section>

          {/* Payments & Billing */}
          <Section title="Payments & Billing">
            <Row icon="creditcard.fill" title="Payment Methods" onPress={() => soon('Payments')} />
            <Divider />
            <Row icon="banknote.fill" title="Payout Settings" onPress={() => router.push('/payout')} />
            <Divider />
            <Row icon="doc.text.fill" title="Invoice Settings" subtitle="Default tax rate, terms, notes" onPress={() => router.push('/settings/invoice-settings')} />
            <Divider />
            <Row icon="star.circle.fill" title="Plan & Features" subtitle="What's included" onPress={() => router.push('/settings/subscription')} />
          </Section>

          {/* Staff */}
          <Section title="Staff & Permissions">
            <Row icon="person.2.fill" title="Manage Staff" onPress={() => router.push('/staff')} />
            <Divider />
            <Row icon="lock.shield.fill" title="Staff Permissions" subtitle="Control who can view/edit what" onPress={() => router.push('/settings/staff-permissions')} />
          </Section>

          {/* Data & Privacy */}
          <Section title="Data & Privacy">
            <Row icon="square.and.arrow.up.fill" title="Export Data" onPress={() => router.push('/settings/export-data')} />
            <Divider />
            <Row icon="square.and.arrow.down.fill" title="Import Data" onPress={() => router.push('/import-data')} />
            <Divider />
            <Row icon="hand.raised.fill" title="Privacy Policy" onPress={() => open('privacy')} />
            <Divider />
            <Row icon="doc.plaintext.fill" title="Terms of Service" onPress={() => open('terms')} />
            <Divider />
            <Row icon="clock.arrow.circlepath" title="Data Retention Policy" onPress={() => open('data-retention')} />
          </Section>

          {/* Account */}
          <Section title="Account">
            <Row icon="person.circle.fill" title="Edit Profile" onPress={() => router.push('/settings/edit-profile')} />
            <Divider />
            <Row icon="key.fill" title="Change Password" onPress={() => soon('Change password')} />
            <Divider />
            <Row icon="shield.checkered" title="Two-Factor Authentication" onPress={() => router.push('/security')} />
            <Divider />
            <Row icon="rectangle.portrait.and.arrow.right" title="Log Out" color={iOSColors.red} onPress={signOut} />
            <Divider />
            <Row
              icon="trash.fill"
              title={deleting ? 'Deleting Account…' : 'Delete Account'}
              subtitle="Permanently delete your account and data"
              color={iOSColors.red}
              onPress={confirmDeleteAccount}
            />
          </Section>

          <Text style={[styles.version, { color: theme.secondaryText }]}>ToolBelt v{APP_VERSION}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedSectionHeader title={title} />
      </View>
      <View style={[styles.card, theme.card]}>{children}</View>
    </View>
  );
}

function Row({
  icon, title, subtitle, color, onPress,
}: {
  icon: SFSymbol; title: string; subtitle?: string; color?: string; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <ThemedIconTile name={icon} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: color === iOSColors.red ? iOSColors.red : theme.primaryText }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron.right" size={14} color={theme.chevronTint} />
    </Pressable>
  );
}

function ToggleRow({
  icon, title, color, value, onChange,
}: {
  icon: SFSymbol; title: string; color?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <ThemedIconTile name={icon} />
      <Text style={[styles.rowTitle, styles.flex, { color: theme.primaryText }]}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent, false: theme.divider }} />
    </View>
  );
}

/** A "More looks" swatch: the look's own background, surface and accent. */
function LookCard({
  look, title, subtitle, selected, onPress,
}: {
  look: LookId; title: string; subtitle: string; selected: boolean; onPress: () => void;
}) {
  const theme = useAppTheme();
  const p = PALETTES[look];
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected }}
      style={[
        styles.lookCard,
        {
          backgroundColor: p.background,
          borderColor: selected ? theme.accent : theme.divider,
          borderWidth: selected ? 2 : 1,
          borderRadius: theme.isEditorial ? 2 : 14,
        },
      ]}>
      <View style={styles.lookSwatches}>
        <View style={[styles.lookDot, { backgroundColor: p.cardBackground, borderColor: p.divider }]} />
        <View style={[styles.lookDot, { backgroundColor: p.accent, borderColor: p.accent }]} />
      </View>
      <Text style={[styles.lookTitle, { color: p.primaryText }]}>{title}</Text>
      <Text style={[styles.lookSub, { color: p.secondaryText }]} numberOfLines={1}>{subtitle}</Text>
    </Pressable>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  body: { paddingBottom: 40, gap: 24, paddingTop: 8 },
  section: { gap: 8 },
  sectionHead: { paddingHorizontal: 20 },
  card: { marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 13 },
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  themeBlock: { paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  themeHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 10, gap: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '500' },
  looks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lookCard: { width: '48%', flexGrow: 1, padding: 12, gap: 4 },
  lookSwatches: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  lookDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  lookTitle: { fontSize: 15, fontWeight: '600' },
  lookSub: { fontSize: 12 },
  version: { fontSize: 12, textAlign: 'center', paddingTop: 8 },
});
