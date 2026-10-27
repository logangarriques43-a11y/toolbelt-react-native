/**
 * StaffLoginHandoffSheet — shown right after the owner creates a staff login or
 * resets its password: the login email and temporary password to hand over,
 * with Copy password. The temporary password is only ever shown here; the staff
 * member replaces it at first sign-in (Set New Password).
 */

import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormSheet } from '@/components/auth/form-sheet';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

export interface StaffLoginHandoff {
  name: string;
  email: string;
  password: string;
  /** True for a password reset (vs. a brand-new login). */
  reset?: boolean;
}

export function StaffLoginHandoffSheet({
  handoff,
  onClose,
}: {
  handoff: StaffLoginHandoff | null;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [handoff]);

  const copy = async () => {
    if (!handoff) return;
    await Clipboard.setStringAsync(handoff.password);
    setCopied(true);
  };

  const firstName = handoff?.name.split(' ')[0] || 'They';

  return (
    <FormSheet
      visible={!!handoff}
      title={handoff?.reset ? 'Password Reset' : 'Staff Login Created'}
      closeLabel="Done"
      onClose={onClose}>
      {handoff ? (
        <>
          <View style={styles.head}>
            <ThemedIconTile name="checkmark.shield.fill" size={56} filled />
            <Text style={theme.display(24)}>{handoff.reset ? 'New temporary password' : 'Staff login created'}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>
              Give {handoff.name || 'your team member'} these details. {firstName} signs in from “Staff member”
              on the ToolBelt welcome screen and must set a new password at first sign-in.
            </Text>
          </View>
          <View style={[theme.card, styles.card]}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Login email</Text>
            <Text selectable style={[styles.value, { color: theme.primaryText }]}>{handoff.email}</Text>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <Text style={[styles.label, { color: theme.secondaryText }]}>Temporary password</Text>
            <Text selectable style={[styles.password, { color: theme.primaryText }]}>{handoff.password}</Text>
          </View>
          <ThemedButton title={copied ? 'Copied' : 'Copy Password'} icon="doc.on.doc" onPress={copy} />
          <Text style={[styles.note, { color: theme.tertiaryText }]}>
            For security this password isn’t shown again. If it’s lost, use Reset Password on this staff
            member’s App Access.
          </Text>
        </>
      ) : null}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 12, paddingTop: 8 },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  card: { padding: 16, gap: 6 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 16 },
  password: { fontSize: 22, fontFamily: 'monospace', letterSpacing: 1.5 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  note: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
