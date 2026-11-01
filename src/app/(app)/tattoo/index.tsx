/**
 * Tattoo Studio — the feature's home. Owners turn it on or off and set the
 * consultation deposit. Everyone gets the links to Requests and Portfolios,
 * which only work once it's on (the API answers 404 until then).
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateTattooSettings } from '@/api/tattoo';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon, type SFSymbol } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { usePermissions } from '@/context/permissions-store';
import { useSession } from '@/context/session';
import { SERVICES_QUERY_KEY } from '@/context/services-store';
import { tattooKeys, useTattooSettings } from '@/hooks/use-tattoo';
import { errorMessage } from '@/lib/api-client';
import { centsToDollarInput, parseDepositDollars } from '@/lib/tattoo';
import type { TattooSettings, TattooSettingsUpdate } from '@/models/tattoo';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function TattooStudio() {
  const theme = useAppTheme();
  const router = useRouter();
  const { role } = usePermissions();
  const { data: settings, isLoading, error, refetch } = useTattooSettings();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Tattoo Studio" />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : !settings ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: theme.secondaryText }]}>
              {errorMessage(error, "Couldn't load Tattoo Studio.")}
            </Text>
            <ThemedButton title="Try again" kind="quiet" onPress={() => refetch()} />
          </View>
        ) : !settings.available ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: theme.secondaryText }]}>Tattoo Studio isn&apos;t available yet.</Text>
          </View>
        ) : (
          <KeyboardAwareForm contentContainerStyle={styles.body}>
            {role === 'owner' ? <OwnerSettings settings={settings} /> : null}
            {settings.enabled ? (
              <>
                <LinkRow
                  icon="tray"
                  title="Requests"
                  subtitle="Photos and details from clients"
                  onPress={() => router.push('/tattoo/requests')}
                />
                <LinkRow
                  icon="photo.fill"
                  title="Portfolios"
                  subtitle="Each artist's work and styles"
                  onPress={() => router.push('/tattoo/portfolios')}
                />
              </>
            ) : role === 'owner' ? null : (
              <Text style={[styles.message, { color: theme.secondaryText }]}>
                Tattoo Studio is off. The shop owner can turn it on.
              </Text>
            )}
          </KeyboardAwareForm>
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

function OwnerSettings({ settings }: { settings: TattooSettings }) {
  const theme = useAppTheme();
  const qc = useQueryClient();
  const { uid } = useSession();
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState(centsToDollarInput(settings.depositCents));
  const [inputError, setInputError] = useState<string | null>(null);

  const save = async (changes: TattooSettingsUpdate, failureTitle: string): Promise<boolean> => {
    setSaving(true);
    try {
      const result = await updateTattooSettings(changes);
      // The PUT answers without `styles`, so merge rather than replace.
      qc.setQueryData<TattooSettings>(tattooKeys.settings(uid), (current) =>
        current ? { ...current, ...result } : current,
      );
      // Turning it on the first time creates the consultation service.
      if (changes.enabled) qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      return true;
    } catch (e) {
      Alert.alert(failureTitle, errorMessage(e, 'Please try again.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDeposit = async () => {
    const parsed = parseDepositDollars(text);
    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }
    setInputError(null);
    if (await save({ depositCents: parsed.cents }, "Couldn't save deposit")) {
      setText(centsToDollarInput(parsed.cents));
    }
  };

  const unchanged = text.trim() === centsToDollarInput(settings.depositCents);

  return (
    <>
      <View style={[styles.card, theme.card]}>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Tattoo requests by text</Text>
            <Text style={[styles.sub, { color: theme.secondaryText }]}>
              {settings.enabled ? 'Clients can text you a reference photo.' : 'Turn on to take requests by text.'}
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            disabled={saving}
            onValueChange={(enabled) => {
              save({ enabled }, "Couldn't update Tattoo Studio");
            }}
            trackColor={{ true: theme.live, false: theme.inputBackground }}
          />
        </View>
      </View>

      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Consultation deposit</Text>
        <Text style={[styles.sub, { color: theme.secondaryText }]}>Leave blank for no deposit.</Text>
        <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 12 }]}>
          <Text style={[styles.input, styles.dollar, { color: theme.secondaryText }]}>$</Text>
          <TextInput
            value={text}
            onChangeText={(value) => {
              setText(value);
              setInputError(null);
            }}
            placeholder="0.00"
            placeholderTextColor={theme.tertiaryText}
            keyboardType="decimal-pad"
            accessibilityLabel="Deposit amount in dollars"
            style={[styles.input, { color: theme.primaryText }]}
          />
        </View>
        {inputError ? <Text style={[styles.sub, { color: iOSColors.red }]}>{inputError}</Text> : null}
        <ThemedButton title="Save deposit" kind="accent" loading={saving} disabled={unchanged} onPress={saveDeposit} />
      </View>
    </>
  );
}

function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: SFSymbol;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, styles.linkRow, theme.card]}>
      <ThemedIconTile name={icon} size={40} />
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.sub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      <Icon name="chevron.right" size={14} color={theme.chevronTint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { fontSize: 15, textAlign: 'center' },
  body: { padding: 20, gap: 14, paddingBottom: 40 },
  card: { padding: 16, gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', padding: 0 },
  dollar: { flex: 0 },
});
