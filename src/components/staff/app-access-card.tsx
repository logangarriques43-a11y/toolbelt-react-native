/**
 * StaffAppAccessCard — the "App Access" card docked under the staff detail
 * form (owner only). Shows whether this member has a ToolBelt login and opens
 * the invite / edit sheet; after a login is created or reset it shows the
 * handoff sheet with the temporary password.
 *
 * States (as iOS): no login → "Invite to App"; login waiting on first sign-in
 * (mustChangePassword) → "Waiting for first sign-in"; active → "Edit Access &
 * Permissions".
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StaffAppAccessSheet } from '@/components/staff/app-access-sheet';
import { StaffLoginHandoffSheet, type StaffLoginHandoff } from '@/components/staff/login-handoff-sheet';
import { LivePill, ThemedButton, ThemedIconTile } from '@/components/themed';
import { PERMISSIONS } from '@/models/permission';
import type { StaffMember } from '@/models/staff';
import { useAppTheme } from '@/theme/theme-context';

export function StaffAppAccessCard({ member }: { member: StaffMember }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [showSheet, setShowSheet] = useState(false);
  const [handoff, setHandoff] = useState<StaffLoginHandoff | null>(null);

  const hasLogin = !!member.loginEmail;
  const waiting = hasLogin && member.mustChangePassword === true;
  const granted = PERMISSIONS.filter((p) => member.permissions?.[p] === true).length;

  const subtitle = !hasLogin
    ? 'No login yet. Invite them to see their schedule and the tools you allow.'
    : waiting
      ? `Waiting for first sign-in · ${member.loginEmail}`
      : `${member.loginEmail} · ${granted} of ${PERMISSIONS.length} permissions`;

  return (
    <View
      style={[
        styles.dock,
        { backgroundColor: theme.background, borderTopColor: theme.divider, paddingBottom: Math.max(insets.bottom, 12) },
      ]}>
      <View style={styles.row}>
        <ThemedIconTile name="iphone" size={40} />
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.primaryText }]}>App Access</Text>
            {hasLogin ? <LivePill live={!waiting} liveLabel="Active" offLabel="Invited" /> : null}
          </View>
          <Text style={[styles.sub, { color: theme.secondaryText }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
      <ThemedButton
        title={hasLogin ? 'Edit Access & Permissions' : 'Invite to App'}
        kind={hasLogin ? 'quiet' : 'accent'}
        onPress={() => setShowSheet(true)}
      />

      <StaffAppAccessSheet
        visible={showSheet}
        member={member}
        onClose={() => setShowSheet(false)}
        onHandoff={setHandoff}
      />
      <StaffLoginHandoffSheet handoff={handoff} onClose={() => setHandoff(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: 16, paddingTop: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
});
