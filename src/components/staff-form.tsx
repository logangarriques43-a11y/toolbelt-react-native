/**
 * StaffForm — add/edit a staff member. Port of AddStaffSheet (StaffView.swift).
 * Fields: photo (deferred stub), import-from-contacts (deferred stub), name,
 * role (free text + suggestions), phone, email, and the services this member
 * performs. Shared by `staff/new` and `staff/[id]`.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { useServices } from '@/context/services-store';
import { useStaff } from '@/context/staff-store';
import { withOpacity } from '@/lib/color';
import { formatPhoneNumber } from '@/lib/phone';
import { STAFF_ORANGE, staffInitials } from '@/models/staff';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const ROLE_OPTIONS = ['Stylist', 'Barber', 'Technician', 'Therapist', 'Assistant', 'Manager', 'Receptionist', 'Owner'].map(
  (r) => ({ label: r, value: r }),
);

export function StaffForm({ editingId }: { editingId?: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { staff, addStaff, updateStaff } = useStaff();
  const { services } = useServices();

  const editing = useMemo(
    () => (editingId ? staff.find((s) => s.id === editingId) : undefined),
    [editingId, staff],
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [role, setRole] = useState(editing?.role ?? '');
  const [phone, setPhone] = useState(editing?.phoneNumber ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set(editing?.assignedServiceIds ?? []));
  const [roleSheet, setRoleSheet] = useState(false);

  const canSave = name.trim().length > 0 && role.trim().length > 0;
  const stub = (msg: string) => Alert.alert('Coming soon', msg);

  const toggleService = (id: string) =>
    setServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter a name');
    if (!role.trim()) return Alert.alert('Error', 'Please enter a role');
    const base = {
      name,
      role,
      phoneNumber: phone,
      email: email || undefined,
      isActive,
      isOwner: editing?.isOwner ?? false,
      assignedServiceIds: [...serviceIds],
    };
    if (editing) updateStaff({ ...editing, ...base });
    else addStaff(base);
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Icon name="chevron.left" size={16} weight="semibold" color={iOSColors.blue} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{editing ? 'Edit Staff' : 'Add Staff'}</Text>
          <Pressable onPress={save} disabled={!canSave}>
            <Text style={[styles.savePill, { backgroundColor: canSave ? STAFF_ORANGE : withOpacity(iOSColors.gray, 0.4) }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Photo (deferred) */}
          <View style={styles.photoBlock}>
            <Pressable onPress={() => stub('Photo picker arrives in a later phase.')} style={[styles.photoCircle, { backgroundColor: withOpacity(STAFF_ORANGE, 0.15) }]}>
              {name ? (
                <Text style={[styles.photoInitials, { color: STAFF_ORANGE }]}>{staffInitials(name)}</Text>
              ) : (
                <>
                  <Icon name="camera.fill" size={22} color={STAFF_ORANGE} />
                  <Text style={[styles.photoLabel, { color: STAFF_ORANGE }]}>Photo</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => stub('Import from Contacts arrives in a later phase.')} style={[styles.importBtn, { borderColor: STAFF_ORANGE }]}>
              <Icon name="person.crop.circle.badge.plus" size={18} color={STAFF_ORANGE} />
              <Text style={[styles.importText, { color: STAFF_ORANGE }]}>Import from Contacts</Text>
            </Pressable>
          </View>

          {/* Fields */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Row icon="person.fill" label="Name">
              <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={theme.tertiaryText} style={[styles.input, { color: theme.primaryText }]} />
            </Row>
            <Divider />
            <Row icon="briefcase.fill" label="Role">
              <TextInput value={role} onChangeText={setRole} placeholder="Type or select role" placeholderTextColor={theme.tertiaryText} style={[styles.input, { color: theme.primaryText }]} />
              <Pressable onPress={() => setRoleSheet(true)} hitSlop={8}>
                <Icon name="chevron.down" size={12} color={theme.secondaryText} />
              </Pressable>
            </Row>
            <Divider />
            <Row icon="phone.fill" label="Phone">
              <TextInput value={phone} onChangeText={(t) => setPhone(formatPhoneNumber(t))} placeholder="Phone number" placeholderTextColor={theme.tertiaryText} keyboardType="phone-pad" style={[styles.input, { color: theme.primaryText }]} />
            </Row>
            <Divider />
            <Row icon="envelope.fill" label="Email">
              <TextInput value={email} onChangeText={setEmail} placeholder="Email (optional)" placeholderTextColor={theme.tertiaryText} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { color: theme.primaryText }]} />
            </Row>
            {editing ? (
              <>
                <Divider />
                <View style={styles.activeRow}>
                  <Icon name="checkmark.circle.fill" size={16} color={STAFF_ORANGE} />
                  <Text style={[styles.activeLabel, { color: theme.primaryText }]}>Active</Text>
                  <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: STAFF_ORANGE, false: withOpacity(iOSColors.gray, 0.3) }} />
                </View>
              </>
            ) : null}
          </View>

          {/* Services provided */}
          {services.length > 0 ? (
            <View style={styles.servicesBlock}>
              <View style={styles.servicesHead}>
                <Icon name="scissors" size={15} color={STAFF_ORANGE} />
                <Text style={[styles.servicesTitle, { color: theme.primaryText }]}>Services Provided</Text>
              </View>
              <Text style={[styles.servicesDesc, { color: theme.secondaryText }]}>
                Select which services this staff member can perform.
              </Text>
              <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                {services.map((s, i) => {
                  const on = serviceIds.has(s.id);
                  return (
                    <View key={s.id}>
                      {i > 0 ? <Divider /> : null}
                      <Pressable onPress={() => toggleService(s.id)} style={styles.serviceRow}>
                        <View style={[styles.serviceDot, { backgroundColor: s.colorHex }]} />
                        <Text style={[styles.serviceName, { color: theme.primaryText }]}>{s.name}</Text>
                        <Icon
                          name={on ? 'checkmark.circle.fill' : 'circle'}
                          size={20}
                          color={on ? STAFF_ORANGE : withOpacity(iOSColors.gray, 0.4)}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <OptionSheet visible={roleSheet} title="Role" options={ROLE_OPTIONS} selected={role} onSelect={setRole} onClose={() => setRoleSheet(false)} />
    </DashboardGradient>
  );
}

function Row({ icon, label, children }: { icon: SFSymbol; label: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Icon name={icon} size={16} color={STAFF_ORANGE} />
      <Text style={[styles.rowLabel, { color: theme.secondaryText }]}>{label}</Text>
      {children}
    </View>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: iOSColors.blue, fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  savePill: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
  body: { paddingVertical: 20, gap: 24 },
  photoBlock: { alignItems: 'center', gap: 16 },
  photoCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoInitials: { fontSize: 28, fontWeight: '700' },
  photoLabel: { fontSize: 11, fontWeight: '500' },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  importText: { fontSize: 15, fontWeight: '500' },
  card: { marginHorizontal: 16, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 13, fontWeight: '500', width: 52 },
  input: { flex: 1, fontSize: 16, padding: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  activeLabel: { flex: 1, fontSize: 16 },
  servicesBlock: { gap: 12 },
  servicesHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  servicesTitle: { fontSize: 14, fontWeight: '700' },
  servicesDesc: { fontSize: 12, paddingHorizontal: 20 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  serviceDot: { width: 10, height: 10, borderRadius: 5 },
  serviceName: { flex: 1, fontSize: 15 },
});
