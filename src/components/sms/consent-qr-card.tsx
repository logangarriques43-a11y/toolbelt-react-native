/**
 * ConsentQRCard — port of ConsentQRCard.swift / OnlineBookingView's
 * smsConsentCard.
 *
 * The in-person SMS-consent QR: clients scan it to opt into texts, the A2P
 * consent carriers require before the AI assistant can message them. The QR
 * encodes the booking page's consent URL (https://api.toolbelt.tools/consent/<slug>),
 * drawn by the in-house encoder in components/booking/qr-code.
 *
 * Pass `consentURL` when the caller already has the booking config (Online
 * Booking). Omit it and the card reads GET /booking-page itself. An empty URL
 * (no booking page yet) shows the "Set up your booking page first" placeholder
 * with the actions disabled. Share sends the link through the system share
 * sheet (RN can't share the rendered QR image without an extra native module);
 * Copy puts it on the clipboard.
 */

import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { consentURL as consentURLFor, getBookingPage } from '@/api/booking-page';
import { QRCode } from '@/components/booking/qr-code';
import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

export function ConsentQRCard({ consentURL }: { consentURL?: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['booking-page'],
    queryFn: getBookingPage,
    enabled: consentURL === undefined,
  });
  const url = consentURL ?? consentURLFor(data?.slug ?? '');
  const hasURL = url.length > 0;

  const share = () => {
    Share.share({ message: url, url }).catch(() => {});
  };
  const copy = async () => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Link copied!');
  };

  return (
    <View style={[styles.card, theme.card]}>
      <View style={styles.head}>
        <Icon name="qrcode" size={18} color={theme.accent} />
        <Text style={[styles.title, { color: theme.primaryText }]}>SMS Consent QR</Text>
      </View>

      <Text style={[styles.body, { color: theme.secondaryText }]}>
        Print this and display it where clients can see it. They scan to agree to receive texts — the opt-in carriers
        require before your AI assistant can message them.
      </Text>

      {hasURL ? (
        // Fixed white tile so the code always scans, even in the dark looks.
        <View style={[styles.qrTile, { borderRadius: theme.isEditorial ? 2 : 14, borderColor: theme.divider }]}>
          <QRCode value={url} size={208} />
        </View>
      ) : (
        <Pressable
          onPress={consentURL === undefined ? () => router.push('/online-booking') : undefined}
          style={[styles.tile, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 14 }]}>
          <Text style={[styles.tileText, { color: theme.secondaryText }]}>Set up your booking page first</Text>
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable
          disabled={!hasURL}
          onPress={share}
          style={[styles.primaryBtn, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 999, opacity: hasURL ? 1 : 0.5 }]}>
          <Icon name="square.and.arrow.up" size={15} color={theme.onAccent} />
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>Share Link</Text>
        </Pressable>
        <Pressable
          disabled={!hasURL}
          onPress={copy}
          style={[
            styles.secondaryBtn,
            { backgroundColor: 'transparent', borderColor: theme.divider, borderRadius: theme.isEditorial ? 2 : 999, opacity: hasURL ? 1 : 0.5 },
          ]}>
          <Icon name="doc.on.doc" size={15} color={theme.primaryText} />
          <Text style={[styles.secondaryText, { color: theme.primaryText }]}>Copy Link</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: 20, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
  qrTile: { alignSelf: 'center', backgroundColor: '#FFFFFF', padding: 12, borderWidth: 1 },
  tile: { height: 232, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  primaryText: { fontSize: 15, fontWeight: '600' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '600' },
});
