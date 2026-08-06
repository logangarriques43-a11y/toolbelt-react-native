/**
 * Request a Quote — port of RequestQuoteView.swift.
 * Reached from the Custom Website "Request a Quote" CTA. Name + business are
 * pulled read-only from the account so the owner only types what they want; the
 * form shows exactly what would be sent and where a reply lands.
 *
 * Swift POSTs to /support/quote-request (emails support). The RN app makes no
 * backend calls, so submit simulates the send — the UI (sending → sent success
 * panel) matches the native flow. Backend wiring is Stream B (deferred).
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAvoidingForm } from '@/components/keyboard-avoiding-form';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useSession } from '@/context/session';
import { withOpacity } from '@/lib/color';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const PLACEHOLDER =
  "e.g. A website and a booking app with my services, prices, photos of past work, and a contact form. I'd like it to match my brand colors and feel modern but warm.";

export default function RequestQuote() {
  const theme = useAppTheme();
  const router = useRouter();
  const { account } = useSession();

  const [description, setDescription] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const canSubmit = state !== 'sending' && description.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    setState('sending');
    // Simulate the network round-trip (no backend in the RN build).
    setTimeout(() => setState('sent'), 900);
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingForm>
        <ScreenHeader title="Request a Quote" />

        {state === 'sent' ? (
          <View style={styles.success}>
            <View style={styles.successCircle}>
              <Icon name="checkmark.circle.fill" size={56} color={iOSColors.green} />
            </View>
            <Text style={[styles.successTitle, { color: theme.primaryText }]}>Request sent!</Text>
            <Text style={[styles.successSub, { color: theme.secondaryText }]}>Our team will reach out within 24 hours.</Text>
            <View style={styles.flex} />
            <Pressable style={styles.sendBtn} onPress={() => router.back()}>
              <Text style={styles.sendText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {/* Sending as (read-only) */}
            <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Sending as</Text>
              <InfoRow icon="person.fill" label="Name" value={account?.name ?? '—'} />
              <View style={[styles.divider, { backgroundColor: theme.divider }]} />
              <InfoRow icon="building.2.fill" label="Business" value={account?.businessName || 'Not set'} />
              {account?.email ? (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                  <InfoRow icon="envelope.fill" label="Reply will go to" value={account.email} muted />
                </>
              ) : null}
            </View>

            {/* Description */}
            <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <View style={styles.editorHead}>
                <Icon name="text.alignleft" size={16} color={iOSColors.blue} />
                <Text style={[styles.editorTitle, { color: theme.primaryText }]}>What you&apos;d like your website or app to include</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={PLACEHOLDER}
                placeholderTextColor={withMuted(theme.secondaryText)}
                multiline
                style={[styles.editor, { backgroundColor: theme.inputBackground, color: theme.primaryText }]}
              />
            </View>

            <Pressable style={[styles.sendBtn, { backgroundColor: canSubmit ? iOSColors.blue : withMuted(iOSColors.gray) }]} disabled={!canSubmit} onPress={submit}>
              {state === 'sending' ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="paperplane.fill" size={16} color="#FFFFFF" />}
              <Text style={styles.sendText}>{state === 'sending' ? 'Sending…' : 'Send Request'}</Text>
            </Pressable>
            <Text style={[styles.note, { color: theme.secondaryText }]}>Our team will reach out within 24 hours</Text>
          </ScrollView>
        )}
        </KeyboardAvoidingForm>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function InfoRow({ icon, label, value, muted }: { icon: 'person.fill' | 'building.2.fill' | 'envelope.fill'; label: string; value: string; muted?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={18} color={iOSColors.blue} />
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: muted ? theme.secondaryText : theme.primaryText, fontSize: muted ? 14 : 16 }]}>{value}</Text>
      </View>
    </View>
  );
}

function withMuted(color: string): string {
  return color + 'B3'; // ~70% opacity
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 20, gap: 20, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 14, gap: 14 },
  cardLabel: { fontSize: 14, fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth },
  editorHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editorTitle: { flex: 1, fontSize: 14, fontWeight: '500' },
  editor: { minHeight: 180, borderRadius: 10, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: iOSColors.blue, paddingVertical: 16, borderRadius: 14, alignSelf: 'stretch' },
  sendText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  note: { fontSize: 13, textAlign: 'center' },
  success: { flex: 1, alignItems: 'center', gap: 16, padding: 20 },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: withOpacity(iOSColors.green, 0.12), alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  successTitle: { fontSize: 22, fontWeight: '700' },
  successSub: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
});
