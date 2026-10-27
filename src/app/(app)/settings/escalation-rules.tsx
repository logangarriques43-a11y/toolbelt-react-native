/**
 * Escalation Rules — port of EscalationRulesView.swift.
 * When the AI SMS assistant should hand off to a human. Local state for now.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

export default function EscalationRules() {
  const theme = useAppTheme();
  const router = useRouter();
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [threshold, setThreshold] = useState(3);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Escalation Rules" />
        <ScrollView contentContainerStyle={styles.body}>
          <ThemedIconTile name="person.crop.circle.badge.exclamationmark.fill" size={72} filled />
          <Text style={[styles.desc, { color: theme.secondaryText }]}>
            Configure when the AI should hand off a conversation to a human.
          </Text>

          <View style={[styles.card, theme.card]}>
            <ToggleRow icon="arrow.up.forward.circle.fill" title="Auto-Escalate" subtitle="Hand off after failed intents" value={autoEscalate} onChange={setAutoEscalate} />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <ToggleRow icon="bell.badge.fill" title="Notify Owner" subtitle="Alert you when escalation occurs" value={notifyOwner} onChange={setNotifyOwner} />
          </View>

          <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>ESCALATE AFTER</Text>
          <View style={[styles.card, theme.card]}>
            {[1, 2, 3, 4, 5].map((n, i) => (
              <View key={n}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <Pressable
                  onPress={() => autoEscalate && setThreshold(n)}
                  style={[styles.option, !autoEscalate ? styles.disabled : null]}>
                  <Text style={[styles.optionText, { color: theme.primaryText }]}>{n} failed intent{n === 1 ? '' : 's'}</Text>
                  <Icon
                    name={threshold === n ? 'checkmark.circle.fill' : 'circle'}
                    size={20}
                    color={threshold === n ? theme.accent : theme.secondaryText}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          <ThemedButton title="Save Rules" onPress={() => router.back()} style={styles.save} />
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function ToggleRow({
  icon, title, subtitle, value, onChange,
}: {
  icon: SFSymbol; title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <ThemedIconTile name={icon} size={36} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent, false: theme.divider }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 16, alignItems: 'center', paddingBottom: 40 },
  desc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  card: { alignSelf: 'stretch', overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 13 },
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, alignSelf: 'flex-start', paddingHorizontal: 4 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  disabled: { opacity: 0.4 },
  optionText: { fontSize: 16, fontWeight: '500' },
  save: { alignSelf: 'stretch', marginTop: 4 },
});
