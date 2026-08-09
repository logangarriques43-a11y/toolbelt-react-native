/**
 * Business Settings — port of BusinessSettingsView.swift (the hub).
 *
 * Theme picker wired to the real app theme; notification toggles + reminder
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
import { useBusinessSettings } from '@/context/business-settings-store';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { reminderTimingLabel } from '@/models/business-settings';
import { iOSColors, lightShadow } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/tokens';
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
                <View style={[styles.iconTile, { backgroundColor: theme.iconBackground(iOSColors.purple) }]}>
                  <Icon name={theme.isDark ? 'moon.fill' : 'sun.max.fill'} size={16} color={iOSColors.purple} />
                </View>
                <Text style={[styles.rowTitle, { color: theme.primaryText }]}>Theme</Text>
              </View>
              <View style={[styles.segmented, { backgroundColor: theme.inputBackground }]}>
                {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => theme.setMode(m)}
                    style={[styles.segment, theme.mode === m ? { backgroundColor: theme.cardBackground } : null]}>
                    <Text style={[styles.segmentText, { color: theme.mode === m ? theme.primaryText : theme.secondaryText }]}>
                      {m[0].toUpperCase() + m.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Divider />
            <Row icon="paintpalette.fill" title="Brand Colors & Logo" color={iOSColors.pink} onPress={() => soon('Branding')} />
            <Divider />
            <Row icon="textformat" title="Receipt & Invoice Branding" color={iOSColors.indigo} onPress={() => soon('Receipt branding')} />
          </Section>

          {/* Business Profile */}
          <Section title="Business Profile">
            <Row icon="building.2.fill" title="Business Name & Info" color={iOSColors.blue} onPress={() => router.push('/settings/business-info')} />
            <Divider />
            <Row icon="clock.fill" title="Business Hours" color={iOSColors.orange} onPress={() => router.push('/working-hours')} />
            <Divider />
            <Row icon="mappin.circle.fill" title="Business Address" color={iOSColors.red} onPress={() => router.push('/settings/business-address')} />
            <Divider />
            <Row icon="globe" title="Online Booking Page" color={iOSColors.indigo} onPress={() => soon('Online Booking')} />
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <ToggleRow icon="bell.fill" title="Push Notifications" color={iOSColors.purple} value={s.pushEnabled} onChange={(v) => s.set('pushEnabled', v)} />
            <Divider />
            <ToggleRow icon="envelope.fill" title="Email Notifications" color={iOSColors.blue} value={s.emailEnabled} onChange={(v) => s.set('emailEnabled', v)} />
            <Divider />
            <ToggleRow icon="message.fill" title="SMS Reminders to Clients" color={iOSColors.green} value={s.smsEnabled} onChange={(v) => s.set('smsEnabled', v)} />
            <Divider />
            <Row icon="clock.badge" title="Reminder Timing" subtitle={reminderTimingLabel(s.reminderHours)} color={iOSColors.orange} onPress={() => router.push('/settings/reminder-timing')} />
          </Section>

          {/* AI SMS */}
          <Section title="AI SMS Assistant">
            <Row icon="bubble.left.and.text.bubble.right.fill" title="SMS Setup" color={iOSColors.teal} onPress={() => soon('AI SMS')} />
            <Divider />
            <Row icon="text.bubble.fill" title="View Conversations" color={iOSColors.blue} onPress={() => soon('Conversations')} />
            <Divider />
            <ToggleRow icon="brain.head.profile.fill" title="AI Auto-Reply" color={iOSColors.purple} value={s.aiAutoReply} onChange={(v) => s.set('aiAutoReply', v)} />
            <Divider />
            <Row icon="person.crop.circle.badge.exclamationmark.fill" title="Escalation Rules" subtitle="Auto-escalate after 3 failed intents" color={iOSColors.orange} onPress={() => router.push('/settings/escalation-rules')} />
          </Section>

          {/* Payments & Billing */}
          <Section title="Payments & Billing">
            <Row icon="creditcard.fill" title="Payment Methods" color={iOSColors.green} onPress={() => soon('Payments')} />
            <Divider />
            <Row icon="banknote.fill" title="Payout Settings" color={iOSColors.mint} onPress={() => router.push('/payout')} />
            <Divider />
            <Row icon="doc.text.fill" title="Invoice Settings" subtitle="Default tax rate, terms, notes" color={iOSColors.blue} onPress={() => router.push('/settings/invoice-settings')} />
            <Divider />
            <Row icon="dollarsign.circle.fill" title="Subscription & Plan" subtitle="$15/month — ToolBelt Pro" color={iOSColors.purple} onPress={() => router.push('/settings/subscription')} />
          </Section>

          {/* Staff */}
          <Section title="Staff & Permissions">
            <Row icon="person.2.fill" title="Manage Staff" color={iOSColors.blue} onPress={() => router.push('/staff')} />
            <Divider />
            <Row icon="lock.shield.fill" title="Staff Permissions" subtitle="Control who can view/edit what" color={iOSColors.orange} onPress={() => router.push('/settings/staff-permissions')} />
          </Section>

          {/* Data & Privacy */}
          <Section title="Data & Privacy">
            <Row icon="square.and.arrow.up.fill" title="Export Data" color={iOSColors.blue} onPress={() => router.push('/settings/export-data')} />
            <Divider />
            <Row icon="square.and.arrow.down.fill" title="Import Data" color={iOSColors.green} onPress={() => router.push('/import-data')} />
            <Divider />
            <Row icon="hand.raised.fill" title="Privacy Policy" color={iOSColors.gray} onPress={() => open('privacy')} />
            <Divider />
            <Row icon="doc.plaintext.fill" title="Terms of Service" color={iOSColors.gray} onPress={() => open('terms')} />
            <Divider />
            <Row icon="clock.arrow.circlepath" title="Data Retention Policy" color={iOSColors.gray} onPress={() => open('data-retention')} />
          </Section>

          {/* Account */}
          <Section title="Account">
            <Row icon="person.circle.fill" title="Edit Profile" color={iOSColors.blue} onPress={() => router.push('/settings/edit-profile')} />
            <Divider />
            <Row icon="key.fill" title="Change Password" color={iOSColors.orange} onPress={() => soon('Change password')} />
            <Divider />
            <Row icon="shield.checkered" title="Two-Factor Authentication" color={iOSColors.green} onPress={() => router.push('/security')} />
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
      <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{title.toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>{children}</View>
    </View>
  );
}

function Row({
  icon, title, subtitle, color, onPress,
}: {
  icon: SFSymbol; title: string; subtitle?: string; color: string; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: theme.iconBackground(color) }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron.right" size={14} color={theme.chevronTint} />
    </Pressable>
  );
}

function ToggleRow({
  icon, title, color, value, onChange,
}: {
  icon: SFSymbol; title: string; color: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: theme.iconBackground(color) }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.rowTitle, styles.flex, { color: theme.primaryText }]}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color, false: theme.divider }} />
    </View>
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
  sectionTitle: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, letterSpacing: 0.5 },
  card: { marginHorizontal: 16, borderRadius: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  iconTile: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
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
  version: { fontSize: 12, textAlign: 'center', paddingTop: 8 },
});
