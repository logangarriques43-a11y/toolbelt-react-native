/**
 * ClientForm — add/edit a client. Port of AddClientView.swift.
 * Shared by `clients/new` and `clients/[id]`.
 *
 * Deferred (native modules, consistent with the port's staging): profile photo
 * picker, Import-from-Contacts, and the graphical birthday date picker — these
 * render as inert affordances. Phone formatting, buffer time (via the shared
 * time-wheel sheet), and SMS consent are fully wired.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { TimeWheelSheet } from '@/components/sheets/time-wheel-sheet';
import { useClients } from '@/context/clients-store';
import { clientInitials } from '@/models/client';
import { formatPhoneNumber } from '@/lib/phone';
import { withOpacity } from '@/lib/color';
import { Brand, iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const SECTION_TITLE = '#4D4D59';
const REQUIRED_RED = '#F26666';

function formatBuffer(h: number, m: number): string {
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function ClientForm({ editingId }: { editingId?: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { clients, addClient, updateClient } = useClients();

  const editing = useMemo(
    () => (editingId ? clients.find((c) => c.id === editingId) : undefined),
    [editingId, clients],
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [phone, setPhone] = useState(editing?.phoneNumber ?? '');
  const [secondaryPhone, setSecondaryPhone] = useState(editing?.secondaryPhoneNumber ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [trackBirthday, setTrackBirthday] = useState(!!editing?.birthday);

  const [hasBuffer, setHasBuffer] = useState((editing?.clientBlockTime ?? 0) > 0);
  const [bufferH, setBufferH] = useState(Math.floor((editing?.clientBlockTime ?? 0) / 60));
  const [bufferM, setBufferM] = useState((editing?.clientBlockTime ?? 15) % 60 || 15);
  const [bufferSheet, setBufferSheet] = useState(false);

  const [smsConsent, setSmsConsent] = useState(editing?.smsConsentGiven ?? false);

  const canSave = name.trim().length > 0 && phone.trim().length > 0;

  const save = () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter a client name');
    if (!phone.trim()) return Alert.alert('Error', 'Please enter a phone number');

    const blockTime = hasBuffer ? bufferH * 60 + bufferM : 0;
    const base = {
      name,
      phoneNumber: phone,
      secondaryPhoneNumber: secondaryPhone || undefined,
      email: email || undefined,
      notes: notes || undefined,
      location: location || undefined,
      birthday: trackBirthday ? editing?.birthday : undefined,
      photoUri: editing?.photoUri,
      clientBlockTime: blockTime,
      smsConsentGiven: smsConsent,
      smsConsentDate: smsConsent ? editing?.smsConsentDate ?? new Date().toISOString() : undefined,
      smsConsentMethod: smsConsent ? editing?.smsConsentMethod ?? 'staff_collected' : undefined,
    };

    if (editing) {
      updateClient({ ...editing, ...base });
    } else {
      addClient(base);
    }
    router.back();
  };

  const stub = (msg: string) => Alert.alert('Coming soon', msg);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Icon name="chevron.left" size={16} weight="semibold" color={iOSColors.blue} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
            {editing ? 'Edit Client' : 'New Client'}
          </Text>
          <Pressable onPress={save} disabled={!canSave}>
            <Text style={[styles.saveCapsule, { backgroundColor: canSave ? iOSColors.blue : withOpacity(iOSColors.gray, 0.4) }]}>
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {/* Photo (deferred) */}
          <View style={styles.photoBlock}>
            <Pressable onPress={() => stub('Photo picker is coming with a later phase.')}>
              <LinearGradient
                colors={[theme.gradientTop, theme.gradientBottom]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoCircle}>
                {editing ? (
                  <Text style={styles.photoInitials}>{clientInitials(name || '?')}</Text>
                ) : (
                  <>
                    <Icon name="camera.fill" size={24} color={Brand.accent} />
                    <Text style={[styles.photoLabel, { color: Brand.accent }]}>Add Photo</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => stub('Import from Contacts is coming with a later phase.')}
              style={styles.importRow}>
              <Icon name="person.crop.circle.badge.plus" size={14} color={Brand.accent} />
              <Text style={[styles.importText, { color: Brand.accent }]}>Import from Contacts</Text>
            </Pressable>
          </View>

          {/* Basic Information */}
          <Section title="Basic Information" icon="person.fill">
            <Field label="Full Name" required icon="person.fill">
              <TextInput value={name} onChangeText={setName} placeholder="e.g. John Smith" placeholderTextColor={theme.tertiaryText} style={[styles.input, { color: theme.primaryText }]} autoCorrect={false} />
            </Field>
            <Divider />
            <Field label="Phone Number" required icon="phone.fill">
              <TextInput value={phone} onChangeText={(t) => setPhone(formatPhoneNumber(t))} placeholder="(555) 123-4567" placeholderTextColor={theme.tertiaryText} keyboardType="phone-pad" style={[styles.input, { color: theme.primaryText }]} />
            </Field>
            <Divider />
            <Field label="Secondary Phone" icon="phone.badge.plus">
              <TextInput value={secondaryPhone} onChangeText={(t) => setSecondaryPhone(formatPhoneNumber(t))} placeholder="Optional" placeholderTextColor={theme.tertiaryText} keyboardType="phone-pad" style={[styles.input, { color: theme.primaryText }]} />
            </Field>
            <Divider />
            <Field label="Email" icon="envelope.fill">
              <TextInput value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor={theme.tertiaryText} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={[styles.input, { color: theme.primaryText }]} />
            </Field>
          </Section>

          {/* Details */}
          <Section title="Details" icon="doc.text.fill">
            <Field label="Location" icon="mappin.and.ellipse">
              <TextInput value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor={theme.tertiaryText} style={[styles.input, { color: theme.primaryText }]} />
            </Field>
            <Divider />
            <Field label="Notes" icon="note.text">
              <TextInput value={notes} onChangeText={setNotes} placeholder="Add notes about preferences, allergies, etc..." placeholderTextColor={withOpacity(iOSColors.gray, 0.5)} multiline style={[styles.input, styles.notes, { color: theme.primaryText }]} />
            </Field>
          </Section>

          {/* Birthday (date picker deferred) */}
          <Section title="Birthday" icon="gift.fill">
            <ToggleRow icon="calendar" title="Track Birthday" value={trackBirthday} onChange={setTrackBirthday} />
            {trackBirthday ? (
              <Text style={[styles.hint, { color: theme.secondaryText }]}>
                Birthday date selection is coming with a later phase.
              </Text>
            ) : null}
          </Section>

          {/* Scheduling */}
          <Section title="Scheduling" icon="clock.badge.xmark">
            <ToggleRow icon="clock.badge.xmark" title="Client Buffer Time" value={hasBuffer} onChange={setHasBuffer} />
            <Text style={[styles.sectionDesc, { color: theme.secondaryText }]}>
              Buffer time adds extra space after appointments for clients who may need a little more flexibility.
            </Text>
            {hasBuffer ? (
              <>
                <Divider />
                <Pressable onPress={() => setBufferSheet(true)} style={styles.bufferRow}>
                  <Icon name="lock.fill" size={16} color={theme.secondaryText} />
                  <Text style={[styles.bufferLabel, { color: theme.secondaryText }]}>Buffer time</Text>
                  <View style={styles.bufferEnd}>
                    <Text style={[styles.bufferValue, { color: theme.primaryText }]}>{formatBuffer(bufferH, bufferM)}</Text>
                    <Icon name="chevron.right" size={12} color={theme.secondaryText} />
                  </View>
                </Pressable>
              </>
            ) : null}
          </Section>

          {/* SMS Consent */}
          <Section title="SMS Consent" icon="message.badge.filled.fill">
            <ToggleRow icon="message.fill" title="Client Consented to SMS Reminders" value={smsConsent} onChange={setSmsConsent} />
            <Text style={[styles.sectionDesc, { color: theme.secondaryText }]}>
              By enabling this, you confirm the client has given consent to receive SMS appointment reminders. Clients can reply STOP to opt out at any time. Msg &amp; data rates may apply.
            </Text>
          </Section>

          <View style={styles.requiredNote}>
            <Text style={{ color: REQUIRED_RED }}>*</Text>
            <Text style={{ color: theme.secondaryText }}> Required fields</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <TimeWheelSheet
        visible={bufferSheet}
        title="Buffer Time"
        hours={bufferH}
        minutes={bufferM}
        onChange={(h, m) => { setBufferH(h); setBufferM(m); }}
        onClose={() => setBufferSheet(false)}
      />
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: SFSymbol; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={14} weight="semibold" color={Brand.accent} />
        <Text style={styles.sectionHeadTitle}>{title}</Text>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>{children}</View>
    </View>
  );
}

function Field({ label, required, icon, children }: { label: string; required?: boolean; icon: SFSymbol; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Icon name={icon} size={14} color={Brand.accent} />
        <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
        {required ? <Text style={styles.required}>*</Text> : null}
      </View>
      <View style={styles.fieldContent}>{children}</View>
    </View>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

function ToggleRow({ icon, title, value, onChange }: { icon: SFSymbol; title: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.toggleRow}>
      <Icon name={icon} size={14} color={Brand.accent} />
      <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: Brand.accent, false: withOpacity(iOSColors.gray, 0.3) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: iOSColors.blue, fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  saveCapsule: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
  body: { paddingBottom: 40, gap: 20, paddingTop: 24 },
  photoBlock: { alignItems: 'center', gap: 16 },
  photoCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoInitials: { fontSize: 32, fontWeight: '700', color: Brand.accent },
  photoLabel: { fontSize: 12, fontWeight: '500' },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  importText: { fontSize: 14, fontWeight: '500' },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  sectionHeadTitle: { fontSize: 15, fontWeight: '700', color: SECTION_TITLE },
  sectionCard: { marginHorizontal: 16, borderRadius: 14 },
  field: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  required: { fontSize: 13, fontWeight: '700', color: REQUIRED_RED },
  fieldContent: { paddingLeft: 26 },
  input: { fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  hint: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 12 },
  sectionDesc: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  toggleTitle: { flex: 1, fontSize: 16 },
  bufferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  bufferLabel: { fontSize: 14 },
  bufferEnd: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  bufferValue: { fontSize: 16 },
  requiredNote: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 4 },
});
