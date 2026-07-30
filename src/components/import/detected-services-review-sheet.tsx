/**
 * DetectedServicesReviewSheet — port of DetectedServicesReviewSheet.swift.
 *
 * Shown right after import detects appointment types in event titles:
 *   Step 0 — "We detected these services": confirm/correct what each detected
 *            type maps to (existing service / new / keep raw / time off / skip /
 *            combine with another type).
 *   Step 1 — "Connect to staff members?": per type, pick the staff member all
 *            its appointments belong to. Prefilled when exactly one active
 *            staff member provides the resolved service.
 *
 * Purely presentational: every edit is routed back through callbacks that
 * mutate the parent's detectedGroups state, the same state executeImport reads.
 */

import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { withOpacity } from '@/lib/color';
import {
  groupCount, resolutionLabel,
  type DetectedServiceGroup, type Resolution,
} from '@/models/import-data';
import type { Service } from '@/models/service';
import type { StaffMember } from '@/models/staff';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const ACCENT = '#4285F5';
const NONE = '__none__';

type Picker = { kind: 'resolution'; groupId: string } | { kind: 'staff'; groupId: string } | { kind: 'staffAll' } | null;

function isStaffEligible(g: DetectedServiceGroup): boolean {
  return g.resolution.kind !== 'leaveAsIs' && g.resolution.kind !== 'skip';
}

export function DetectedServicesReviewSheet({
  visible,
  groups,
  services,
  staff,
  onSetResolution,
  onMerge,
  onSetStaff,
  onSetStaffAll,
  onPrefillStaff,
  onDone,
  onKeepOriginals,
}: {
  visible: boolean;
  groups: DetectedServiceGroup[];
  services: Service[];
  staff: StaffMember[];
  onSetResolution: (groupId: string, r: Resolution) => void;
  onMerge: (sourceId: string, targetId: string) => void;
  onSetStaff: (groupId: string, staffId: string | null) => void;
  onSetStaffAll: (staffId: string | null) => void;
  onPrefillStaff: () => void;
  onDone: () => void;
  onKeepOriginals: () => void;
}) {
  const theme = useAppTheme();
  const [step, setStep] = useState(0);
  const [picker, setPicker] = useState<Picker>(null);

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  const activeStaff = staff.filter((s) => s.isActive);
  const eligible = groups.filter(isStaffEligible);

  const advance = () => {
    if (activeStaff.length === 0 || eligible.length === 0) {
      onDone();
    } else {
      onPrefillStaff();
      setStep(1);
    }
  };

  // Picker option builders.
  const resolutionValue = (g: DetectedServiceGroup): string => {
    switch (g.resolution.kind) {
      case 'assignExisting': return `existing:${g.resolution.serviceId}`;
      case 'createNew': return 'createNew';
      case 'leaveAsIs': return 'leaveAsIs';
      case 'convertToTimeOff': return 'convertToTimeOff';
      case 'skip': return 'skip';
    }
  };
  const resolutionOptions = (g: DetectedServiceGroup) => [
    ...services.map((s) => ({ label: `Use “${s.name}”`, value: `existing:${s.id}` })),
    { label: `Create new service “${g.label}”`, value: 'createNew' },
    { label: 'Keep original titles', value: 'leaveAsIs' },
    { label: 'Import as time off', value: 'convertToTimeOff' },
    { label: "Don't import these", value: 'skip' },
    ...groups.filter((o) => o.id !== g.id).map((o) => ({ label: `Combine with ${o.label} (${groupCount(o)})`, value: `merge:${o.id}` })),
  ];
  const applyResolution = (groupId: string, value: string) => {
    if (value.startsWith('existing:')) onSetResolution(groupId, { kind: 'assignExisting', serviceId: value.slice(9) });
    else if (value.startsWith('merge:')) onMerge(groupId, value.slice(6));
    else onSetResolution(groupId, { kind: value } as Resolution);
  };

  const staffOptions = [{ label: "Don't assign", value: NONE }, ...activeStaff.map((s) => ({ label: s.name, value: s.id }))];
  const staffLabelFor = (g: DetectedServiceGroup): string => {
    if (!g.assignedStaffId) return g.resolution.kind === 'convertToTimeOff' ? 'Everyone' : "Don't assign";
    return staff.find((s) => s.id === g.assignedStaffId)?.name ?? "Don't assign";
  };

  const pickerGroup = picker && picker.kind !== 'staffAll' ? groups.find((g) => g.id === picker.groupId) : undefined;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDone}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name={step === 0 ? 'wand.and.stars' : 'person.2.badge.gearshape.fill'} size={18} color={iOSColors.purple} />
              <Text style={[styles.title, { color: theme.primaryText }]}>
                {step === 0 ? 'We Detected These Services' : 'Connect to Staff Members?'}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              {step === 0
                ? 'Your synced appointments follow a naming pattern. Confirm what each type should become — the choice applies to every matching appointment.'
                : "Assign each service's appointments to the staff member who performs it, so they land on the right schedule."}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {step === 0
              ? groups.map((g) => (
                  <View key={g.id} style={[styles.card, { backgroundColor: theme.cardBackground }]}>
                    <View style={styles.cardHead}>
                      <View style={styles.flex}>
                        <Text style={[styles.groupLabel, { color: theme.primaryText }]}>{g.label}</Text>
                        <Text style={[styles.groupCount, { color: theme.secondaryText }]}>
                          {groupCount(g)} appointment{groupCount(g) === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Pressable onPress={() => setPicker({ kind: 'resolution', groupId: g.id })} style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>{resolutionLabel(g, services)}</Text>
                        <Icon name="chevron.up.chevron.down" size={10} color={ACCENT} />
                      </Pressable>
                    </View>
                    <View style={styles.sampleRow}>
                      <Icon name="text.quote" size={10} color={theme.secondaryText} />
                      <Text style={[styles.sampleText, { color: theme.secondaryText }]} numberOfLines={1}>e.g. “{g.sampleTitle}”</Text>
                    </View>
                  </View>
                ))
              : activeStaff.length === 0 ? (
                <Text style={[styles.emptyStaff, { color: theme.secondaryText }]}>
                  No staff members yet — you can add staff later and assign these services to them.
                </Text>
              ) : (
                <>
                  {eligible.length > 1 ? (
                    <View style={[styles.card, styles.assignAll, { backgroundColor: theme.cardBackground, borderColor: withOpacity(ACCENT, 0.25) }]}>
                      <Text style={[styles.assignAllLabel, { color: theme.primaryText }]}>Assign all to</Text>
                      <Pressable onPress={() => setPicker({ kind: 'staffAll' })} style={styles.chip}>
                        <Icon name="person.2.fill" size={11} color={ACCENT} />
                        <Text style={styles.chipText}>Choose…</Text>
                        <Icon name="chevron.up.chevron.down" size={10} color={ACCENT} />
                      </Pressable>
                    </View>
                  ) : null}
                  {eligible.map((g) => (
                    <View key={g.id} style={[styles.card, styles.cardHead, { backgroundColor: theme.cardBackground }]}>
                      <View style={styles.flex}>
                        <Text style={[styles.groupLabel, { color: theme.primaryText }]}>{g.label}</Text>
                        <Text style={[styles.groupCount, { color: theme.secondaryText }]}>
                          {groupCount(g)} appointment{groupCount(g) === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setPicker({ kind: 'staff', groupId: g.id })}
                        style={[styles.chip, { backgroundColor: withOpacity(g.assignedStaffId ? iOSColors.green : theme.secondaryText, 0.1) }]}>
                        <Icon name="person.fill" size={11} color={g.assignedStaffId ? iOSColors.green : theme.secondaryText} />
                        <Text style={[styles.chipText, { color: g.assignedStaffId ? iOSColors.green : theme.secondaryText }]} numberOfLines={1}>{staffLabelFor(g)}</Text>
                        <Icon name="chevron.up.chevron.down" size={10} color={g.assignedStaffId ? iOSColors.green : theme.secondaryText} />
                      </Pressable>
                    </View>
                  ))}
                </>
              )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
            <Pressable style={styles.primaryBtn} onPress={step === 0 ? advance : onDone}>
              <Text style={styles.primaryBtnText}>{step === 0 ? 'These Look Right' : 'Done'}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={step === 0 ? onKeepOriginals : () => setStep(0)}>
              <Text style={[styles.secondaryBtnText, { color: theme.secondaryText }]}>
                {step === 0 ? 'Skip — keep original titles' : 'Back'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </DashboardGradient>

      {/* Resolution / staff pickers */}
      <OptionSheet
        visible={picker?.kind === 'resolution' && pickerGroup != null}
        title="Map this type"
        options={pickerGroup ? resolutionOptions(pickerGroup) : []}
        selected={pickerGroup ? resolutionValue(pickerGroup) : ''}
        onSelect={(v) => { if (pickerGroup) applyResolution(pickerGroup.id, v); }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker?.kind === 'staff' && pickerGroup != null}
        title="Connect to staff"
        options={staffOptions}
        selected={pickerGroup?.assignedStaffId ?? NONE}
        onSelect={(v) => { if (pickerGroup) onSetStaff(pickerGroup.id, v === NONE ? null : v); }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker?.kind === 'staffAll'}
        title="Assign all to"
        options={staffOptions}
        selected={NONE}
        onSelect={(v) => onSetStaffAll(v === NONE ? null : v)}
        onClose={() => setPicker(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 6, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 13, textAlign: 'center' },
  body: { paddingHorizontal: 20, paddingVertical: 8, gap: 14 },
  card: { padding: 14, borderRadius: 12, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupLabel: { fontSize: 16, fontWeight: '600' },
  groupCount: { fontSize: 12, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: withOpacity(ACCENT, 0.1), maxWidth: '55%' },
  chipText: { color: ACCENT, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sampleText: { fontSize: 12, flexShrink: 1 },
  assignAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  assignAllLabel: { fontSize: 14, fontWeight: '600' },
  emptyStaff: { fontSize: 14, padding: 14 },
  footer: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  primaryBtn: { backgroundColor: ACCENT, alignItems: 'center', paddingVertical: 15, borderRadius: 14 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 4 },
  secondaryBtnText: { fontSize: 14, fontWeight: '500' },
});
