/**
 * ConsentQRCard — port of ConsentQRCard.swift.
 *
 * The in-person SMS-consent QR: clients scan it to opt into texts, the A2P
 * consent carriers require before the AI assistant can message them. The QR
 * encodes the booking-page consent URL.
 *
 * Placeholder state only (Sync-5b): RN has no booking-page slug yet — Online
 * Booking (which owns `consentURL`) lands in Sync-6 — so `consentURL` is empty
 * and the card shows the Swift "Set up your booking page first" placeholder
 * with the Share / Copy actions disabled. When Online Booking provides the URL,
 * the live QR (via a qrcode renderer) drops into the placeholder tile.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { useAppTheme } from '@/theme/theme-context';

const ACCENT = '#6680F2';

export function ConsentQRCard({ consentURL }: { consentURL: string }) {
  const theme = useAppTheme();
  const hasURL = consentURL.length > 0;
  // No QR image yet (renderer arrives with the booking page) → Share disabled.
  const canShare = false;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }, styles.shadow]}>
      <View style={styles.head}>
        <Icon name="qrcode" size={18} color={ACCENT} />
        <Text style={[styles.title, { color: theme.primaryText }]}>SMS Consent QR</Text>
      </View>

      <Text style={[styles.body, { color: theme.secondaryText }]}>
        Print this and display it where clients can see it. They scan to agree to receive texts — the opt-in carriers
        require before your AI assistant can message them.
      </Text>

      <View style={[styles.tile, { backgroundColor: theme.inputBackground }]}>
        <Text style={[styles.tileText, { color: theme.secondaryText }]}>
          {hasURL ? 'QR preview arrives with Online Booking' : 'Set up your booking page first'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable disabled={!canShare} style={[styles.primaryBtn, { opacity: canShare ? 1 : 0.5 }]}>
          <Icon name="square.and.arrow.up" size={15} color="#FFFFFF" />
          <Text style={styles.primaryText}>Share / Print</Text>
        </Pressable>
        <Pressable
          disabled={!hasURL}
          style={[styles.secondaryBtn, { backgroundColor: theme.cardBackground, borderColor: withOpacity(ACCENT, 0.3), opacity: hasURL ? 1 : 0.5 }]}>
          <Icon name="doc.on.doc" size={15} color={ACCENT} />
          <Text style={styles.secondaryText}>Copy Link</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: 20, borderRadius: 16, gap: 14 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
  tile: { height: 232, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, paddingVertical: 13, borderRadius: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  secondaryText: { color: ACCENT, fontSize: 15, fontWeight: '600' },
});
