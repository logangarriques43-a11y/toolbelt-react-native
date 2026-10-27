/**
 * BackupCodesList — shows a freshly generated set of recovery codes once, with
 * Copy all. Codes are never stored on the device; after this screen only the
 * server's remaining-count is shown (GET /auth/recovery/backup-code-status).
 */

import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedButton } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

export function BackupCodesList({ codes }: { codes: string[] }) {
  const theme = useAppTheme();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.wrap}>
      <View style={[theme.card, styles.card]}>
        {codes.map((c, i) => (
          <Text key={c} selectable style={[styles.code, { color: theme.primaryText }]}>
            <Text style={{ color: theme.tertiaryText }}>{String(i + 1).padStart(2, ' ')}. </Text>
            {c}
          </Text>
        ))}
      </View>
      <ThemedButton title={copied ? 'Copied' : 'Copy All Codes'} icon="doc.on.doc" kind="quiet" onPress={copy} />
      <Text style={[styles.note, { color: theme.secondaryText }]}>
        Save these somewhere safe, like a password manager. Each code signs you in once if you lose your
        authenticator. You won’t be able to see them again — generating new codes replaces this set.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: { paddingVertical: 14, paddingHorizontal: 18, gap: 8 },
  code: { fontSize: 16, fontFamily: 'monospace', letterSpacing: 0.5 },
  note: { fontSize: 13, lineHeight: 18 },
});
