/**
 * Security — two-step sign-in, passkeys and backup codes. Port of the iOS
 * TwoFactorMethodSelectionView + security settings.
 *
 * - Status: whether a second factor is enrolled (Firebase MFA), and whether this
 *   session actually passed it (the `firebase.sign_in_second_factor` claim the
 *   backend checks) — if not, the screen says to sign out and back in.
 * - Authenticator app: TOTP enrollment (TotpEnrollSheet) and removal. Firebase
 *   wants a recent sign-in for both; ReauthSheet re-confirms and the action
 *   resumes.
 * - Passkey: registers a WebAuthn credential with the backend (react-native-passkey).
 * - Text message: shown as unavailable — Firebase phone MFA needs reCAPTCHA,
 *   which the JS SDK can only run in a browser.
 * - Backup codes: server-side remaining count, and regenerate (replaces the set).
 */

import {
  multiFactor,
  TotpMultiFactorGenerator,
  type MultiFactorInfo,
} from 'firebase/auth';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchBackupCodeStatus,
  generateBackupCodes,
  storeBackupCodes,
  type BackupCodeStatus,
} from '@/api/auth-recovery';
import { isPasskeyCancel, passkeyErrorMessage, passkeysSupported, registerPasskey } from '@/api/webauthn';
import { BackupCodesList } from '@/components/auth/backup-codes-list';
import { FormSheet } from '@/components/auth/form-sheet';
import { ReauthSheet } from '@/components/auth/reauth-sheet';
import { TotpEnrollSheet } from '@/components/auth/totp-enroll-sheet';
import { Icon, type SFSymbol } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { LivePill, ThemedButton, ThemedIconTile, ThemedSectionHeader } from '@/components/themed';
import { useSession } from '@/context/session';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { useAppTheme } from '@/theme/theme-context';

type PendingAction = { kind: 'enroll' } | { kind: 'remove'; factor: MultiFactorInfo };

function enrolledFactors(): MultiFactorInfo[] {
  const user = auth.currentUser;
  return user ? multiFactor(user).enrolledFactors : [];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Security() {
  const theme = useAppTheme();
  const { account, signOut } = useSession();
  const [factors, setFactors] = useState<MultiFactorInfo[]>(enrolledFactors);
  const [sessionPassed, setSessionPassed] = useState<boolean | null>(null);
  const [backup, setBackup] = useState<BackupCodeStatus | null>(null);
  const [backupError, setBackupError] = useState('');
  const [showEnroll, setShowEnroll] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [showReauth, setShowReauth] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);

  const totp = factors.find((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  const phone = factors.find((f) => f.factorId === 'phone');
  const enrolled = factors.length > 0;

  const refresh = useCallback(async () => {
    setFactors(enrolledFactors());
    try {
      const result = await auth.currentUser?.getIdTokenResult();
      const firebaseClaim = result?.claims.firebase as { sign_in_second_factor?: string } | undefined;
      setSessionPassed(!!firebaseClaim?.sign_in_second_factor);
    } catch {
      setSessionPassed(null);
    }
    try {
      setBackup(await fetchBackupCodeStatus());
      setBackupError('');
    } catch (e) {
      setBackupError(firebaseAuthErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // --- Authenticator ---------------------------------------------------------

  const needsReauth = (action: PendingAction) => {
    setShowEnroll(false);
    setPending(action);
    setShowReauth(true);
  };

  const removeFactor = async (factor: MultiFactorInfo) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await multiFactor(user).unenroll(factor);
      await refresh();
      Alert.alert('Removed', `${factor.displayName || 'The authenticator'} was removed from your account.`);
    } catch (e) {
      const code = firebaseErrorCode(e);
      if (code === 'auth/requires-recent-login') return needsReauth({ kind: 'remove', factor });
      if (code === 'auth/user-token-expired') {
        Alert.alert('Signed out', 'Removing your two-step method signed you out. Please sign back in.');
        return;
      }
      Alert.alert("Couldn't Remove", firebaseAuthErrorMessage(e));
    }
  };

  const confirmRemove = (factor: MultiFactorInfo) =>
    Alert.alert(
      'Remove authenticator?',
      'You will only need your password to sign in, and payments and payouts will stop working if ToolBelt requires two-step sign-in.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void removeFactor(factor) },
      ],
    );

  const onReauthed = () => {
    setShowReauth(false);
    const action = pending;
    setPending(null);
    if (action?.kind === 'enroll') setShowEnroll(true);
    else if (action?.kind === 'remove') void removeFactor(action.factor);
  };

  // --- Passkey ---------------------------------------------------------------

  const addPasskey = async () => {
    if (addingPasskey) return;
    if (!passkeysSupported()) {
      Alert.alert('Passkeys unavailable', 'This device doesn’t support passkeys.');
      return;
    }
    setAddingPasskey(true);
    try {
      await registerPasskey(account?.name || account?.email || 'ToolBelt User');
      Alert.alert('Passkey added', 'You can now use “Sign in with Passkey” on the sign-in screen.');
    } catch (e) {
      if (!isPasskeyCancel(e)) Alert.alert("Couldn't Add Passkey", passkeyErrorMessage(e));
    } finally {
      setAddingPasskey(false);
    }
  };

  // --- Backup codes ----------------------------------------------------------

  const regenerate = async () => {
    setGenerating(true);
    try {
      const codes = generateBackupCodes();
      await storeBackupCodes(codes);
      setNewCodes(codes);
      await refresh();
    } catch (e) {
      Alert.alert("Couldn't Create Codes", firebaseAuthErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  };

  const confirmRegenerate = () => {
    if (!backup?.hasCodes) return void regenerate();
    Alert.alert('Replace backup codes?', 'Your current backup codes will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Generate New Codes', onPress: () => void regenerate() },
    ]);
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScreenHeader title="Security" />
        <ScrollView contentContainerStyle={styles.body}>
          {/* Status */}
          <View style={[theme.card, styles.status]}>
            <View style={styles.statusRow}>
              <ThemedIconTile name={enrolled ? 'checkmark.shield.fill' : 'lock.shield.fill'} size={48} filled={enrolled} />
              <View style={styles.flex}>
                <Text style={theme.display(22)}>{enrolled ? '2FA Set Up' : '2FA Not Set Up'}</Text>
                <Text style={[styles.sub, { color: theme.secondaryText }]}>
                  {enrolled
                    ? `Sign-in asks for a code from your ${totp ? 'authenticator app' : 'phone'}.`
                    : 'Add a second step so a stolen password isn’t enough to get in.'}
                </Text>
              </View>
              <LivePill live={enrolled} liveLabel="On" offLabel="Off" />
            </View>
            {enrolled && sessionPassed === false ? (
              <View style={[styles.notice, { backgroundColor: theme.accentSoft, borderRadius: theme.cornerRadius }]}>
                <Icon name="exclamationmark.triangle.fill" size={16} color={theme.accent} />
                <Text style={[styles.noticeText, { color: theme.primaryText }]}>
                  This session started before two-step sign-in was used. Sign out and back in with your code to
                  unlock payments and payouts.
                </Text>
              </View>
            ) : null}
            {enrolled && sessionPassed === false ? (
              <ThemedButton title="Sign Out Now" kind="quiet" onPress={signOut} />
            ) : null}
            {!enrolled ? <ThemedButton title="Set Up 2FA" kind="inverse" onPress={() => setShowEnroll(true)} /> : null}
          </View>

          {/* Methods */}
          <ThemedSectionHeader title="Sign-in methods" />
          <View style={theme.card}>
            <MethodRow
              icon="apps.iphone"
              title="Authenticator app"
              subtitle={
                totp
                  ? `${totp.displayName || 'Authenticator app'} · added ${formatDate(totp.enrollmentTime)}`
                  : 'Codes from Google Authenticator, Authy or 1Password'
              }
              badge={!totp ? 'Recommended' : undefined}>
              {totp ? (
                <Pressable onPress={() => confirmRemove(totp)} hitSlop={8}>
                  <Text style={[styles.destructive, { color: theme.secondaryText }]}>Remove</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setShowEnroll(true)} hitSlop={8}>
                  <Text style={[styles.link, { color: theme.accent }]}>Add</Text>
                </Pressable>
              )}
            </MethodRow>
            <Divider />
            <MethodRow
              icon="person.badge.key.fill"
              title="Passkey"
              subtitle="Sign in with your fingerprint, face or screen lock">
              {addingPasskey ? (
                <ActivityIndicator color={theme.accent} />
              ) : (
                <Pressable onPress={addPasskey} hitSlop={8}>
                  <Text style={[styles.link, { color: theme.accent }]}>Add passkey</Text>
                </Pressable>
              )}
            </MethodRow>
            <Divider />
            <MethodRow
              icon="phone.fill"
              title="Text message"
              subtitle={
                phone
                  ? 'Set up on iPhone. Android can’t receive these codes yet — add an authenticator app too.'
                  : 'Unavailable on Android: Firebase text-message codes need a browser reCAPTCHA check this app can’t run.'
              }>
              {phone ? (
                <Pressable onPress={() => confirmRemove(phone)} hitSlop={8}>
                  <Text style={[styles.destructive, { color: theme.secondaryText }]}>Remove</Text>
                </Pressable>
              ) : (
                <Text style={[styles.muted, { color: theme.tertiaryText }]}>Unavailable</Text>
              )}
            </MethodRow>
          </View>

          {/* Backup codes */}
          <ThemedSectionHeader title="Backup codes" />
          <View style={[theme.card, styles.backup]}>
            <View style={styles.statusRow}>
              <ThemedIconTile name="key.fill" size={40} />
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: theme.primaryText }]}>
                  {backup
                    ? backup.hasCodes
                      ? `${backup.remaining} of ${backup.total} codes left`
                      : 'No backup codes'
                    : backupError
                      ? 'Status unavailable'
                      : 'Checking…'}
                </Text>
                <Text style={[styles.sub, { color: theme.secondaryText }]}>
                  {backupError ||
                    'Each code signs you in once if you lose your authenticator. Use them from “Use a Backup Code” on the sign-in screen.'}
                </Text>
              </View>
            </View>
            <ThemedButton
              title={backup?.hasCodes ? 'Generate New Codes' : 'Create Backup Codes'}
              kind="quiet"
              icon="arrow.clockwise.circle.fill"
              onPress={confirmRegenerate}
              loading={generating}
            />
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.accentSoft, borderRadius: theme.cornerRadius }]}>
            <Icon name="shield.checkered" size={24} color={theme.accent} />
            <View style={styles.flex}>
              <Text style={[styles.infoTitle, { color: theme.primaryText }]}>Why is this important?</Text>
              <Text style={[styles.infoText, { color: theme.secondaryText }]}>
                Two-step sign-in protects your payouts and client payment information, even if your password leaks.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <TotpEnrollSheet
        visible={showEnroll}
        onClose={() => {
          setShowEnroll(false);
          void refresh();
        }}
        onNeedsReauth={() => needsReauth({ kind: 'enroll' })}
        onFinished={() => {
          setShowEnroll(false);
          void refresh();
        }}
      />
      <ReauthSheet
        visible={showReauth}
        onClose={() => {
          setShowReauth(false);
          setPending(null);
        }}
        onConfirmed={onReauthed}
      />
      <FormSheet visible={!!newCodes} title="Backup Codes" closeLabel="Done" onClose={() => setNewCodes(null)}>
        {newCodes ? <BackupCodesList codes={newCodes} /> : null}
      </FormSheet>
    </View>
  );
}

function MethodRow({
  icon,
  title,
  subtitle,
  badge,
  children,
}: {
  icon: SFSymbol;
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.method}>
      <ThemedIconTile name={icon} size={40} />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: theme.liveSoft }]}>
              <Text style={[styles.badgeText, { color: theme.live }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.sub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  status: { padding: 16, gap: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sub: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  notice: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  link: { fontSize: 15, fontWeight: '600' },
  destructive: { fontSize: 15, fontWeight: '500' },
  muted: { fontSize: 13, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 70 },
  backup: { padding: 16, gap: 14 },
  infoCard: { flexDirection: 'row', gap: 12, padding: 16, marginTop: 4 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
});
