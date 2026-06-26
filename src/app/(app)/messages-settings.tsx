/**
 * Message Settings — port of MessageSettingsView.swift.
 * Automated-message rows (instant confirmation / reminder / follow-up / rebooking),
 * sending method + device, and templates, plus an "Add Message Type" sheet. The
 * Swift screen is largely navigational (detail editors are TODO there); rows here
 * open a "coming soon" note. Twilio/A2P delivery config is deferred.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = '#6680F2';
const GREEN = '#4CBF80';

const MESSAGE_TYPES: { title: string; subtitle: string; icon: SFSymbol }[] = [
  { title: 'Birthday greeting', subtitle: "Send wishes on client's birthday", icon: 'gift.fill' },
  { title: 'Thank you', subtitle: 'After first appointment', icon: 'heart.fill' },
  { title: 'Special offer', subtitle: 'Promotional messages', icon: 'tag.fill' },
  { title: 'Custom reminder', subtitle: 'Set your own timing', icon: 'clock.fill' },
];

export default function MessagesSettings() {
  const theme = useAppTheme();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const soon = (what: string) => Alert.alert(what, 'Editing this is coming soon.');

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <Icon name="chevron.left" size={20} color={iOSColors.blue} weight="semibold" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Message Settings</Text>
          <Pressable onPress={() => soon('Help')} hitSlop={8} style={styles.headerBtn}>
            <Icon name="questionmark.circle.fill" size={24} color={BLUE} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Messages */}
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Messages</Text>
            <Pressable onPress={() => setShowAdd(true)}>
              <Text style={[styles.addLink, { color: BLUE }]}>+ Add new message</Text>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <SettingRow title="Instant confirmation" subtitle="Instantly, at appointment creation" onPress={() => soon('Instant confirmation')} />
            <Divider />
            <SettingRow title="Reminder" subtitle="1 hour before appointment" badge="Added automatically to each appointment" onPress={() => soon('Reminder')} />
            <Divider />
            <SettingRow title="Follow-up" subtitle="1 day after appointment" onPress={() => soon('Follow-up')} />
            <Divider />
            <SettingRow title="Rebooking reminder" subtitle="30 days after appointment" onPress={() => soon('Rebooking reminder')} />
          </View>

          {/* Sending method */}
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Sending method</Text>
          <Pressable style={[styles.rowCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={() => soon('Sending method')}>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: theme.primaryText }]}>Semi-automated</Text>
              <Text style={[styles.rowSub, { color: theme.secondaryText }]}>via your mobile device and carrier</Text>
            </View>
            <Icon name="chevron.right" size={14} color={theme.secondaryText} />
          </Pressable>

          {/* Sending device */}
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Sending device</Text>
          <Pressable style={[styles.rowCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={() => soon('Sending device')}>
            <Text style={[styles.rowTitle, styles.flex, { color: theme.primaryText }]}>iPhone (iOS)</Text>
            <Icon name="chevron.right" size={14} color={theme.secondaryText} />
          </Pressable>

          {/* Templates */}
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Message templates</Text>
          <Pressable style={[styles.rowCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={() => soon('Message templates')}>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: theme.primaryText }]}>Customize templates</Text>
              <Text style={[styles.rowSub, { color: theme.secondaryText }]}>Edit the content of your automated messages</Text>
            </View>
            <Icon name="chevron.right" size={14} color={theme.secondaryText} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <DashboardGradient>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
              <Pressable onPress={() => setShowAdd(false)} hitSlop={8}>
                <Text style={[styles.cancel, { color: iOSColors.blue }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Add Message Type</Text>
              <Text style={[styles.cancel, styles.hidden]}>Cancel</Text>
            </View>
            <ScrollView contentContainerStyle={styles.addBody}>
              {MESSAGE_TYPES.map((t) => (
                <Pressable key={t.title} onPress={() => { setShowAdd(false); Alert.alert(t.title, 'Adding this message type is coming soon.'); }} style={[styles.typeRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <View style={[styles.typeIcon, { backgroundColor: withOpacity(BLUE, 0.15) }]}>
                    <Icon name={t.icon} size={20} color={BLUE} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{t.title}</Text>
                    <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{t.subtitle}</Text>
                  </View>
                  <Icon name="plus.circle.fill" size={24} color={BLUE} />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </DashboardGradient>
      </Modal>
    </DashboardGradient>
  );
}

function SettingRow({ title, subtitle, badge, onPress }: { title: string; subtitle: string; badge?: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{subtitle}</Text>
        {badge && <Text style={[styles.badge, { color: GREEN }]}>{badge}</Text>}
      </View>
      <Icon name="chevron.right" size={14} color={theme.secondaryText} />
    </Pressable>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hidden: { opacity: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  cancel: { fontSize: 16 },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  addLink: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 12, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 14, marginTop: 4 },
  badge: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  addBody: { padding: 20, gap: 12 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  typeIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
});
