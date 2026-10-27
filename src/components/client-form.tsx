/**
 * ClientForm — add/edit a client. Port of AddClientView.swift.
 * Shared by `clients/new` and `clients/[id]`.
 *
 * Tapping the photo circle takes / chooses a photo, kept on the device only
 * (like iOS) via `local-photos` keyed by the client id. "Import from Contacts"
 * opens the system contact picker and fills name / phone / email. Birthday uses
 * the native date picker (inline sheet on iOS, dialog on Android). Phone
 * formatting, buffer time (via the shared time-wheel sheet), and SMS consent
 * are fully wired.
 */

import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareForm } from '@/components/keyboard-aware-form';

import { pickDeviceContact, choosePhoneNumber } from '@/components/contacts-picker-sheet';
import { Icon } from '@/components/icon';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { TimeWheelSheet } from '@/components/sheets/time-wheel-sheet';
import { useClients } from '@/context/clients-store';
import { clientInitials } from '@/models/client';
import { choosePhoto, getPhoto, setPhoto } from '@/lib/local-photos';
import { formatPhoneNumber } from '@/lib/phone';
import { useAppTheme } from '@/theme/theme-context';

// Required-field asterisks stay red (semantic).
const REQUIRED_RED = '#F26666';

const birthdayFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** Noon local time, so the stored ISO day never shifts across time zones. */
function noonISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString();
}

/** Parse a stored birthday ('YYYY-MM-DD' or full ISO) as a local calendar day. */
function parseBirthday(value?: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

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
  const [birthday, setBirthday] = useState<string | undefined>(
    () => (parseBirthday(editing?.birthday) ? noonISO(parseBirthday(editing?.birthday)!) : undefined),
  );
  const [birthdaySheet, setBirthdaySheet] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [importing, setImporting] = useState(false);

  // Photos are device-local (never uploaded), keyed by client id.
  useEffect(() => {
    if (!editingId) return;
    getPhoto('client', editingId).then(setPhotoUri);
  }, [editingId]);

  const [hasBuffer, setHasBuffer] = useState((editing?.clientBlockTime ?? 0) > 0);
  const [bufferH, setBufferH] = useState(Math.floor((editing?.clientBlockTime ?? 0) / 60));
  const [bufferM, setBufferM] = useState((editing?.clientBlockTime ?? 15) % 60 || 15);
  const [bufferSheet, setBufferSheet] = useState(false);

  const [smsConsent, setSmsConsent] = useState(editing?.smsConsentGiven ?? false);

  const [saving, setSaving] = useState(false);
  const canSave = name.trim().length > 0 && phone.trim().length > 0;

  const save = async () => {
    if (saving) return;
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
      birthday: trackBirthday ? birthday : undefined,
      photoUri,
      clientBlockTime: blockTime,
      smsConsentGiven: smsConsent,
      smsConsentDate: smsConsent ? editing?.smsConsentDate ?? new Date().toISOString() : undefined,
      smsConsentMethod: smsConsent ? editing?.smsConsentMethod ?? 'staff_collected' : undefined,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateClient({ ...editing, ...base });
        await setPhoto('client', editing.id, photoUri);
      } else {
        const created = await addClient(base);
        if (photoUri && created?.id) await setPhoto('client', created.id, photoUri);
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    const uri = await choosePhoto({ title: 'Client Photo', onRemove: photoUri ? () => setPhotoUri(undefined) : undefined });
    if (uri) setPhotoUri(uri);
  };

  const importContact = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const contact = await pickDeviceContact();
      if (!contact) return;
      const number = await choosePhoneNumber(contact);
      if (contact.name) setName(contact.name);
      if (number) setPhone(formatPhoneNumber(number));
      const other = contact.phones.find((p) => p !== number);
      if (other && !secondaryPhone) setSecondaryPhone(formatPhoneNumber(other));
      if (contact.email) setEmail(contact.email);
    } finally {
      setImporting(false);
    }
  };

  const birthdayDate = parseBirthday(birthday);

  const openBirthday = () => {
    const value = birthdayDate ?? new Date(new Date().getFullYear() - 30, 0, 1, 12);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (e, d) => {
          if (e.type === 'set' && d) setBirthday(noonISO(d));
        },
      });
    } else {
      if (!birthday) setBirthday(noonISO(value));
      setBirthdaySheet(true);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Icon name="chevron.left" size={16} weight="semibold" color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
            {editing ? 'Edit Client' : 'New Client'}
          </Text>
          <Pressable onPress={save} disabled={!canSave || saving}>
            <Text
              style={[
                styles.saveCapsule,
                {
                  backgroundColor: theme.accent,
                  color: theme.onAccent,
                  opacity: canSave ? 1 : 0.5,
                  borderRadius: theme.isEditorial ? 2 : 999,
                },
              ]}>
              Save
            </Text>
          </Pressable>
        </View>

        <KeyboardAwareForm contentContainerStyle={styles.body}>
          {/* Photo (device-local) */}
          <View style={styles.photoBlock}>
            <Pressable onPress={pickPhoto} accessibilityLabel="Client photo">
              <View style={[styles.photoCircle, { backgroundColor: theme.accentSoft }]}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImage} contentFit="cover" />
                ) : editing ? (
                  <Text style={[styles.photoInitials, { color: theme.accent }]}>{clientInitials(name || '?')}</Text>
                ) : (
                  <>
                    <Icon name="camera.fill" size={24} color={theme.accent} />
                    <Text style={[styles.photoLabel, { color: theme.accent }]}>Add Photo</Text>
                  </>
                )}
              </View>
            </Pressable>
            <Pressable
              onPress={importContact}
              disabled={importing}
              style={[styles.importRow, { opacity: importing ? 0.5 : 1 }]}>
              <Icon name="person.crop.circle.badge.plus" size={14} color={theme.accent} />
              <Text style={[styles.importText, { color: theme.accent }]}>Import from Contacts</Text>
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
              <TextInput value={notes} onChangeText={setNotes} placeholder="Add notes about preferences" placeholderTextColor={theme.tertiaryText} multiline style={[styles.input, styles.notes, { color: theme.primaryText }]} />
            </Field>
          </Section>

          {/* Birthday */}
          <Section title="Birthday" icon="gift.fill">
            <ToggleRow icon="calendar" title="Track Birthday" value={trackBirthday} onChange={setTrackBirthday} />
            {trackBirthday ? (
              <>
                <Divider />
                <Pressable onPress={openBirthday} style={styles.bufferRow}>
                  <Icon name="gift.fill" size={16} color={theme.secondaryText} />
                  <Text style={[styles.bufferLabel, { color: theme.secondaryText }]}>Date</Text>
                  <View style={styles.bufferEnd}>
                    <Text style={[styles.bufferValue, { color: birthdayDate ? theme.primaryText : theme.tertiaryText }]}>
                      {birthdayDate ? birthdayFmt.format(birthdayDate) : 'Select date'}
                    </Text>
                    <Icon name="chevron.right" size={12} color={theme.secondaryText} />
                  </View>
                </Pressable>
              </>
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
        </KeyboardAwareForm>
      </SafeAreaView>

      {Platform.OS === 'ios' ? (
        <DatePickerSheet
          visible={birthdaySheet}
          date={birthday ?? noonISO(new Date())}
          onChange={(iso) => setBirthday(noonISO(new Date(iso)))}
          onClose={() => setBirthdaySheet(false)}
        />
      ) : null}

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
        <Icon name={icon} size={14} weight="semibold" color={theme.accent} />
        <Text style={[styles.sectionHeadTitle, { color: theme.secondaryText }]}>{title}</Text>
      </View>
      <View style={[styles.sectionCard, theme.card]}>{children}</View>
    </View>
  );
}

function Field({ label, required, icon, children }: { label: string; required?: boolean; icon: SFSymbol; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Icon name={icon} size={14} color={theme.accent} />
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
      <Icon name={icon} size={14} color={theme.accent} />
      <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent, false: theme.inputBackground }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  saveCapsule: { fontSize: 16, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden' },
  body: { paddingBottom: 40, gap: 20, paddingTop: 24 },
  photoBlock: { alignItems: 'center', gap: 16 },
  photoCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoImage: { width: 100, height: 100, borderRadius: 50 },
  photoInitials: { fontSize: 32, fontWeight: '600' },
  photoLabel: { fontSize: 12, fontWeight: '500' },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  importText: { fontSize: 14, fontWeight: '500' },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  sectionHeadTitle: { fontSize: 15, fontWeight: '700' },
  sectionCard: { marginHorizontal: 16 },
  field: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  required: { fontSize: 13, fontWeight: '700', color: REQUIRED_RED },
  fieldContent: { paddingLeft: 26 },
  input: { fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  sectionDesc: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  toggleTitle: { flex: 1, fontSize: 16 },
  bufferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  bufferLabel: { fontSize: 14 },
  bufferEnd: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  bufferValue: { fontSize: 16 },
  requiredNote: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 4 },
});
