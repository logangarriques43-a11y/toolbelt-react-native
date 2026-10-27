/**
 * StaffAppAccessSheet — the owner's "Invite to App" / "Edit Access &
 * Permissions" sheet for one staff member. Port of the iOS staff invite flow.
 *
 * - Invite: login email (lowercased; must contain @ and .), an auto-generated
 *   10-character temporary password (regenerate, or edit — min 8) and a toggle
 *   per permission. Save → PUT /staff/:id {loginEmail, tempPassword,
 *   permissions}; the backend creates the Firebase login with the staff claims
 *   and emails the invite. The parent then shows the handoff sheet.
 * - Edit: same email + permissions (PUT without a password), plus Reset
 *   Password (new temporary password → handoff) and Revoke Access
 *   (PUT {loginEmail:null, permissions:{}}, which deletes the login).
 * Errors keep the sheet open with the server's message ("Couldn't Save").
 */

import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormSheet } from '@/components/auth/form-sheet';
import { Icon } from '@/components/icon';
import { PermissionToggles } from '@/components/staff/permissions-sheet';
import type { StaffLoginHandoff } from '@/components/staff/login-handoff-sheet';
import { ThemedButton } from '@/components/themed';
import { useStaff } from '@/context/staff-store';
import { ApiError } from '@/lib/api-client';
import { generateTempPassword, type StaffMember } from '@/models/staff';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

function errorMessage(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) return e.message;
  return 'Please try again.';
}

export function StaffAppAccessSheet({
  visible,
  member,
  onClose,
  onHandoff,
}: {
  visible: boolean;
  member: StaffMember;
  onClose: () => void;
  /** A login was created or its password reset — show the credentials. */
  onHandoff: (handoff: StaffLoginHandoff) => void;
}) {
  const theme = useAppTheme();
  const { updateAccess } = useStaff();
  const isEdit = !!member.loginEmail;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<'save' | 'reset' | 'revoke' | null>(null);

  // Re-seed from the member each time the sheet opens (only then — a roster
  // refetch while it's open must not wipe the owner's edits).
  const memberRef = useRef(member);
  memberRef.current = member;
  useEffect(() => {
    if (!visible) return;
    const m = memberRef.current;
    setEmail(m.loginEmail ?? m.email ?? '');
    setPassword(generateTempPassword());
    setPermissions(m.permissions ?? {});
  }, [visible]);

  const loginEmail = email.trim().toLowerCase();
  const emailValid = loginEmail.includes('@') && loginEmail.includes('.');
  const canSave = emailValid && (isEdit || password.length >= 8) && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy('save');
    try {
      if (isEdit) {
        await updateAccess(member.id, { loginEmail, permissions });
        onClose();
      } else {
        await updateAccess(member.id, { loginEmail, tempPassword: password, permissions });
        onClose();
        onHandoff({ name: member.name, email: loginEmail, password });
      }
    } catch (e) {
      Alert.alert("Couldn't Save", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = () =>
    Alert.alert(
      'Reset password?',
      `${member.name} will need a new temporary password to sign in, and must choose their own again afterwards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Password',
          onPress: async () => {
            const fresh = generateTempPassword();
            setBusy('reset');
            try {
              await updateAccess(member.id, { loginEmail: member.loginEmail ?? loginEmail, tempPassword: fresh });
              onClose();
              onHandoff({ name: member.name, email: member.loginEmail ?? loginEmail, password: fresh, reset: true });
            } catch (e) {
              Alert.alert("Couldn't Reset Password", errorMessage(e));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  const revoke = () =>
    Alert.alert(
      'Revoke app access?',
      `${member.name} will be signed out and their login deleted. Their schedule and history stay. You can invite them again later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Access',
          style: 'destructive',
          onPress: async () => {
            setBusy('revoke');
            try {
              await updateAccess(member.id, { loginEmail: null, permissions: {} });
              onClose();
            } catch (e) {
              Alert.alert("Couldn't Revoke Access", errorMessage(e));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  return (
    <FormSheet
      visible={visible}
      title={isEdit ? 'App Access' : 'Invite to App'}
      onClose={onClose}
      actionLabel="Save"
      onAction={save}
      actionDisabled={!canSave}
      actionLoading={busy === 'save'}>
      <Text style={[styles.intro, { color: theme.secondaryText }]}>
        {isEdit
          ? `Change ${member.name}'s login email or what they can see. Changing the email moves their login to the new address.`
          : `Give ${member.name} their own ToolBelt login. They’ll sign in as a staff member and only see what you allow below.`}
      </Text>

      <View style={[theme.card, styles.card]}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>Login email</Text>
        <View style={styles.inputRow}>
          <Icon name="envelope.fill" size={16} color={theme.accent} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={theme.tertiaryText}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.primaryText }]}
          />
        </View>
        {email.length > 0 && !emailValid ? (
          <Text style={styles.error}>Enter a valid email address.</Text>
        ) : null}

        {!isEdit ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <Text style={[styles.label, { color: theme.secondaryText }]}>Temporary password</Text>
            <View style={styles.inputRow}>
              <Icon name="key.fill" size={16} color={theme.accent} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, styles.mono, { color: theme.primaryText }]}
              />
              <Pressable onPress={() => setPassword(generateTempPassword())} hitSlop={8} accessibilityLabel="Generate a new password">
                <Icon name="arrow.clockwise.circle.fill" size={22} color={theme.accent} />
              </Pressable>
            </View>
            {password.length < 8 ? (
              <Text style={styles.error}>At least 8 characters.</Text>
            ) : (
              <Text style={[styles.hint, { color: theme.tertiaryText }]}>
                They’ll replace it with their own password the first time they sign in.
              </Text>
            )}
          </>
        ) : null}
      </View>

      <Text style={theme.display(20)}>Permissions</Text>
      <PermissionToggles states={permissions} onChange={setPermissions} />

      {isEdit ? (
        <View style={styles.actions}>
          <ThemedButton
            title="Reset Password"
            kind="quiet"
            icon="key.fill"
            onPress={resetPassword}
            loading={busy === 'reset'}
            disabled={!!busy}
          />
          <ThemedButton
            title="Revoke Access"
            kind="quiet"
            onPress={revoke}
            loading={busy === 'revoke'}
            disabled={!!busy}
          />
        </View>
      ) : (
        <ThemedButton title="Create Login" kind="inverse" onPress={save} loading={busy === 'save'} disabled={!canSave} />
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 20 },
  card: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { flex: 1, fontSize: 16, paddingVertical: 6 },
  mono: { fontFamily: 'monospace', letterSpacing: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  error: { fontSize: 12, color: iOSColors.red },
  hint: { fontSize: 12 },
  actions: { gap: 12, marginTop: 4 },
});
