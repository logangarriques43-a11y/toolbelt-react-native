/**
 * Import & Sync — port of ImportDataView.swift.
 * A wizard that imports clients / services / appointments from a CSV or ICS file
 * into the existing stores: select source → (map CSV columns) → preview/select →
 * import → results. File picking uses expo-document-picker; reading uses
 * expo-file-system. Apple Calendar (EventKit) sync is native and deferred — its
 * card explains the ICS-export path instead.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetectedServicesReviewSheet } from '@/components/import/detected-services-review-sheet';
import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { useServices } from '@/context/services-store';
import { useStaff } from '@/context/staff-store';
import { useTimeOff } from '@/context/time-off-store';
import { detect, uniqueProvider } from '@/lib/appointment-type-detector';
import { withOpacity } from '@/lib/color';
import {
  autoMapColumns,
  parseAppointments,
  parseClients,
  parseCSV,
  parseServices,
} from '@/lib/csv-parser';
import { parseICS } from '@/lib/ics-parser';
import {
  fieldsForCategory,
  importSummary,
  importTotal,
  type ColumnMapping,
  type DetectedServiceGroup,
  type ImportDataCategory,
  type ImportFileType,
  type ImportResult,
  type ImportStep,
  type MappableField,
  type ParsedAppointment,
  type ParsedClient,
  type ParsedService,
  type Resolution,
} from '@/models/import-data';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = '#4285F5';
const GREEN = '#4CBF80';
const PURPLE = '#9966E6';
const SKIP = '__skip__';
const PALETTE = [
  iOSColors.purple,
  iOSColors.blue,
  iOSColors.green,
  iOSColors.orange,
  iOSColors.pink,
  iOSColors.red,
  iOSColors.teal,
  iOSColors.indigo,
  iOSColors.mint,
  iOSColors.cyan,
];

const PROGRESS_STEPS: ImportStep[] = ['mapColumns', 'preview', 'importing', 'complete'];
const dateTimeFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' });

export default function ImportData() {
  const theme = useAppTheme();
  const router = useRouter();
  const clientsStore = useClients();
  const servicesStore = useServices();
  const appointmentsStore = useAppointments();
  const { staff } = useStaff();
  const timeOffStore = useTimeOff();

  const [step, setStep] = useState<ImportStep>('selectSource');
  const [fileType, setFileType] = useState<ImportFileType>('csv');
  const [category, setCategory] = useState<ImportDataCategory>('clients');
  const [fileName, setFileName] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [clients, setClients] = useState<ParsedClient[]>([]);
  const [services, setServices] = useState<ParsedService[]>([]);
  const [appointments, setAppointments] = useState<ParsedAppointment[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [editingMapping, setEditingMapping] = useState<ColumnMapping | null>(null);
  // Smart type detection (Sync-4) — groups + the review sheet over Preview.
  const [detectedGroups, setDetectedGroups] = useState<DetectedServiceGroup[]>([]);
  const [showReview, setShowReview] = useState(false);

  // Run detection over freshly parsed appointments; when it finds structure,
  // drop the derived service list (creation flows through resolutions) and
  // surface the review sheet on top of Preview.
  const applyDetection = (appts: ParsedAppointment[]) => {
    const groups = detect(appts, servicesStore.services);
    setDetectedGroups(groups);
    if (groups.length > 0) {
      setServices([]);
      setShowReview(true);
    }
  };

  // ── Detected-group edits (routed from the review sheet) ──
  const setResolution = (groupId: string, resolution: Resolution) =>
    setDetectedGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, resolution } : g)));
  const setGroupStaff = (groupId: string, staffId: string | null) =>
    setDetectedGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, assignedStaffId: staffId ?? undefined } : g)));
  const setAllGroupStaff = (staffId: string | null) =>
    setDetectedGroups((prev) => prev.map((g) => ({ ...g, assignedStaffId: staffId ?? undefined })));
  const mergeGroup = (sourceId: string, targetId: string) =>
    setDetectedGroups((prev) => {
      const source = prev.find((g) => g.id === sourceId);
      if (!source || sourceId === targetId) return prev;
      return prev
        .filter((g) => g.id !== sourceId)
        .map((g) =>
          g.id === targetId
            ? {
                ...g,
                appointmentIds: [...g.appointmentIds, ...source.appointmentIds],
                refinedClientNames: { ...source.refinedClientNames, ...g.refinedClientNames },
              }
            : g,
        );
    });
  // Default each group's staff to the only active provider of its resolved service.
  const prefillGroupStaff = () =>
    setDetectedGroups((prev) =>
      prev.map((g) => {
        if (g.assignedStaffId) return g;
        const r = g.resolution;
        if (r.kind !== 'assignExisting') return g;
        const only = uniqueProvider(r.serviceId, staff);
        return only ? { ...g, assignedStaffId: only.id } : g;
      }),
    );
  const keepOriginals = () => {
    setDetectedGroups((prev) => prev.map((g) => ({ ...g, resolution: { kind: 'leaveAsIs' } })));
    setShowReview(false);
  };

  const selectedCount =
    clients.filter((c) => c.selected).length +
    services.filter((s) => s.selected).length +
    appointments.filter((a) => a.selected).length;
  const totalCount = clients.length + services.length + appointments.length;

  // ── File pick + parse ──
  const pickFile = async (ft: ImportFileType, cat: ImportDataCategory) => {
    setFileType(ft);
    setCategory(cat);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type:
          ft === 'csv'
            ? ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', 'text/plain']
            : ['text/calendar', 'public.calendar-event', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri);
      processFile(content, asset.name, ft, cat);
    } catch (e) {
      Alert.alert('Import Error', e instanceof Error ? e.message : 'Could not read the file.');
    }
  };

  const processFile = (content: string, name: string, ft: ImportFileType, cat: ImportDataCategory) => {
    setFileName(name);
    if (ft === 'csv') {
      const { headers, rows } = parseCSV(content);
      if (headers.length === 0) {
        Alert.alert('Import Error', 'No data found in the CSV file. Make sure it has column headers.');
        return;
      }
      if (rows.length === 0) {
        Alert.alert('Import Error', 'The CSV file has headers but no data rows.');
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setMappings(autoMapColumns(headers, cat));
      setClients([]);
      setServices([]);
      setAppointments([]);
      setStep('mapColumns');
    } else {
      const parsed = parseICS(content);
      if (parsed.appointments.length === 0) {
        Alert.alert('Import Error', "No calendar events found. Make sure it's a valid iCal file.");
        return;
      }
      setClients(parsed.clients);
      setServices(parsed.services);
      setAppointments(parsed.appointments);
      applyDetection(parsed.appointments);
      setStep('preview');
    }
  };

  const applyMappings = () => {
    if (category === 'clients') {
      setClients(parseClients(csvRows, mappings));
      setServices([]);
      setAppointments([]);
    } else if (category === 'services') {
      setServices(parseServices(csvRows, mappings));
      setClients([]);
      setAppointments([]);
    } else {
      const appts = parseAppointments(csvRows, mappings);
      setAppointments(appts);
      // Derive unique clients/services from the appointments.
      const clientNames = new Set<string>();
      const serviceNames = new Set<string>();
      for (const a of appts) {
        if (a.clientName !== 'Unknown Client') clientNames.add(a.clientName);
        if (a.serviceName !== 'Imported Service') serviceNames.add(a.serviceName);
      }
      setClients([...clientNames].map((n) => ({ id: `${n}`, name: n, phone: '', selected: true })));
      setServices([...serviceNames].map((n) => ({ id: `${n}`, name: n, price: 0, duration: 30, selected: true })));
      applyDetection(appts);
    }
    setStep('preview');
  };

  // ── Import execution ──
  const executeImport = async () => {
    setStep('importing');
    setProgress(0);
    const selClients = clients.filter((c) => c.selected);
    const selServices = services.filter((s) => s.selected);
    const selAppts = appointments.filter((a) => a.selected);
    const total = selClients.length + selServices.length + selAppts.length;
    const res: ImportResult = { clientsImported: 0, servicesImported: 0, appointmentsImported: 0, timeOffImported: 0, errors: [] };
    if (total === 0) {
      res.errors.push('No items selected for import.');
      setResult(res);
      setStep('complete');
      return;
    }

    const clientLookup = new Map<string, string>();
    const serviceLookup = new Map<string, string>();
    const serviceColor = new Map<string, string>();
    for (const c of clientsStore.clients) clientLookup.set(c.name.toLowerCase(), c.id);
    for (const s of servicesStore.services) {
      serviceLookup.set(s.name.toLowerCase(), s.id);
      serviceColor.set(s.name.toLowerCase(), s.colorHex);
    }

    let completed = 0;
    const tick = async () => {
      completed += 1;
      setProgress(completed / total);
      await new Promise((r) => setTimeout(r, 0));
    };

    // Clients
    for (const pc of selClients) {
      const key = pc.name.toLowerCase();
      if (!clientLookup.has(key)) {
        const c = await clientsStore.addClient({
          name: pc.name,
          phoneNumber: pc.phone,
          email: pc.email,
          notes: pc.notes,
          location: pc.location,
          clientBlockTime: 0,
          smsConsentGiven: false,
        });
        clientLookup.set(key, c.id);
        res.clientsImported += 1;
      }
      await tick();
    }

    // Services (empty when smart detection fired — creation flows via groups)
    let si = 0;
    for (const ps of selServices) {
      const key = ps.name.toLowerCase();
      if (!serviceLookup.has(key)) {
        const color = ps.colorHex || PALETTE[si % PALETTE.length];
        const s = servicesStore.addService({
          name: ps.name,
          colorHex: color,
          price: ps.price,
          duration: ps.duration,
          priceType: 'Fixed',
          processingTime: 0,
          blockTime: 0,
          noDoubleBooking: false,
          availableForOnlineBooking: true,
        });
        serviceLookup.set(key, s.id);
        serviceColor.set(key, color);
        res.servicesImported += 1;
      }
      si += 1;
      await tick();
    }

    // Resolve smart-detected types into per-appointment overrides.
    const serviceOverride = new Map<string, { id: string; name: string; colorHex: string }>();
    const clientNameOverride = new Map<string, string>();
    const staffOverride = new Map<string, { id: string; name: string }>();
    const timeOffApptIds = new Set<string>();
    const skippedApptIds = new Set<string>();
    for (const group of detectedGroups) {
      const applyGroupStaff = () => {
        if (!group.assignedStaffId) return;
        const m = staff.find((s) => s.id === group.assignedStaffId);
        if (m) for (const id of group.appointmentIds) staffOverride.set(id, { id: m.id, name: m.name });
      };
      if (group.resolution.kind === 'leaveAsIs') {
        // Falls through to the raw find-or-create path below.
      } else if (group.resolution.kind === 'convertToTimeOff') {
        group.appointmentIds.forEach((id) => timeOffApptIds.add(id));
        applyGroupStaff();
        continue;
      } else if (group.resolution.kind === 'skip') {
        group.appointmentIds.forEach((id) => skippedApptIds.add(id));
        continue;
      } else {
        let resolved: { id: string; name: string; colorHex: string } | null = null;
        if (group.resolution.kind === 'assignExisting') {
          const targetId = group.resolution.serviceId;
          const svc = servicesStore.services.find((s) => s.id === targetId);
          if (svc) resolved = { id: svc.id, name: svc.name, colorHex: svc.colorHex };
        } else {
          // createNew — find-or-create ONE service (median duration, max price).
          const key = group.label.toLowerCase();
          if (serviceLookup.has(key)) {
            resolved = { id: serviceLookup.get(key)!, name: group.label, colorHex: serviceColor.get(key) ?? BLUE };
          } else {
            const members = appointments.filter((a) => group.appointmentIds.includes(a.id));
            const durations = members
              .map((a) => Math.round((new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 60_000))
              .filter((d) => d > 0)
              .sort((x, y) => x - y);
            const duration = durations.length === 0 ? 30 : durations[Math.floor(durations.length / 2)];
            const price = members.reduce((mx, a) => Math.max(mx, a.price), 0);
            const color = PALETTE[res.servicesImported % PALETTE.length];
            const s = servicesStore.addService({
              name: group.label,
              colorHex: color,
              price,
              duration,
              priceType: 'Fixed',
              processingTime: 0,
              blockTime: 0,
              noDoubleBooking: false,
              availableForOnlineBooking: true,
            });
            serviceLookup.set(key, s.id);
            serviceColor.set(key, color);
            res.servicesImported += 1;
            resolved = { id: s.id, name: group.label, colorHex: color };
          }
        }
        if (resolved) for (const id of group.appointmentIds) serviceOverride.set(id, resolved);
      }
      applyGroupStaff();
      for (const [apptId, refined] of Object.entries(group.refinedClientNames)) clientNameOverride.set(apptId, refined);
    }

    // Appointments
    for (const pa of selAppts) {
      if (skippedApptIds.has(pa.id)) {
        await tick();
        continue;
      }

      // Personal calendar events → time off (scoped to the connected staff, or
      // business-wide when none was chosen).
      if (timeOffApptIds.has(pa.id)) {
        const so = staffOverride.get(pa.id);
        timeOffStore.addEvent({
          title: pa.serviceName,
          startTime: pa.startTime,
          endTime: pa.endTime,
          staffName: so?.name ?? '',
          staffMemberId: so?.id,
          isBusinessWide: !so,
          status: 'approved',
          requestedByStaff: false,
          cancellationRequested: false,
          colorHex: iOSColors.blue,
          notes: pa.notes || undefined,
          isAllDay: false,
        });
        res.timeOffImported += 1;
        await tick();
        continue;
      }

      // Prefer a client name split out of the title over "Unknown Client".
      let clientName = pa.clientName;
      const refined = clientNameOverride.get(pa.id);
      if (refined && (clientName === '' || clientName === 'Unknown Client')) clientName = refined;

      const ckey = clientName.toLowerCase();
      let clientId = clientLookup.get(ckey);
      if (!clientId) {
        const c = await clientsStore.addClient({ name: clientName, phoneNumber: '', clientBlockTime: 0, smsConsentGiven: false });
        clientId = c.id;
        clientLookup.set(ckey, c.id);
      }

      const durationMin = Math.max(1, Math.round((new Date(pa.endTime).getTime() - new Date(pa.startTime).getTime()) / 60_000));

      // Smart-detected service first; otherwise find or create from the raw title.
      let serviceId: string;
      let serviceName: string;
      let svcColor: string;
      const ov = serviceOverride.get(pa.id);
      if (ov) {
        serviceId = ov.id;
        serviceName = ov.name;
        svcColor = ov.colorHex;
      } else {
        const skey = pa.serviceName.toLowerCase();
        serviceName = pa.serviceName;
        if (serviceLookup.has(skey)) {
          serviceId = serviceLookup.get(skey)!;
          svcColor = serviceColor.get(skey) ?? BLUE;
        } else {
          svcColor = PALETTE[serviceLookup.size % PALETTE.length];
          const s = servicesStore.addService({
            name: pa.serviceName,
            colorHex: svcColor,
            price: pa.price,
            duration: durationMin,
            priceType: 'Fixed',
            processingTime: 0,
            blockTime: 0,
            noDoubleBooking: false,
            availableForOnlineBooking: true,
          });
          serviceId = s.id;
          serviceLookup.set(skey, s.id);
          serviceColor.set(skey, svcColor);
        }
      }

      // Staff assignment, most-specific rule first: connected type → file's
      // staff column (by name) → the only provider of the service.
      let assigned = staffOverride.get(pa.id) ?? null;
      if (!assigned && pa.staffName) {
        const m = staff.find((s) => s.name.toLowerCase() === pa.staffName!.toLowerCase());
        if (m) assigned = { id: m.id, name: m.name };
      }
      if (!assigned) {
        const up = uniqueProvider(serviceId, staff);
        if (up) assigned = { id: up.id, name: up.name };
      }

      appointmentsStore.addAppointment({
        clientId,
        clientName,
        serviceId,
        serviceName,
        serviceColor: svcColor,
        startTime: pa.startTime,
        endTime: pa.endTime,
        duration: durationMin,
        price: pa.price,
        processingTime: 0,
        blockTime: 0,
        staffMemberId: assigned?.id,
        staffMemberName: assigned?.name,
        reminderMinutesBefore: 0,
        status: 'scheduled',
        notes: pa.notes ?? '',
        internalNotes: '',
        location: '',
      });
      res.appointmentsImported += 1;
      await tick();
    }

    setResult(res);
    setProgress(1);
    setStep('complete');
  };

  const reset = () => {
    setStep('selectSource');
    setFileType('csv');
    setCategory('clients');
    setFileName('');
    setCsvRows([]);
    setCsvHeaders([]);
    setMappings([]);
    setClients([]);
    setServices([]);
    setAppointments([]);
    setResult(null);
    setProgress(0);
    setDetectedGroups([]);
    setShowReview(false);
  };

  const goBack = () => {
    if (step === 'selectSource' || step === 'complete') {
      router.back();
    } else if (step === 'mapColumns') {
      setStep('selectSource');
    } else if (step === 'preview') {
      setStep(fileType === 'csv' ? 'mapColumns' : 'selectSource');
    }
  };

  const setAllSelected = (value: boolean) => {
    setClients((prev) => prev.map((c) => ({ ...c, selected: value })));
    setServices((prev) => prev.map((s) => ({ ...s, selected: value })));
    setAppointments((prev) => prev.map((a) => ({ ...a, selected: value })));
  };

  const title = step === 'selectSource' ? 'Import & Sync' : stepTitle(step);
  const showProgress = step !== 'selectSource' && step !== 'complete';
  const progressIndex = PROGRESS_STEPS.indexOf(step === 'importing' ? 'importing' : step);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <Pressable onPress={goBack} style={styles.back} hitSlop={8}>
          <Icon name="chevron.left" size={16} color={BLUE} weight="semibold" />
          {(step === 'selectSource' || step === 'complete') && <Text style={[styles.backText, { color: BLUE }]}>Back</Text>}
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{title}</Text>
        <View style={styles.back} />
      </View>

      {showProgress && (
        <View style={styles.progressBar}>
          {PROGRESS_STEPS.map((s, i) => (
            <View key={s} style={[styles.progressSeg, { backgroundColor: i <= progressIndex ? BLUE : theme.divider }]} />
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.body}>
        {step === 'selectSource' && <SelectSource onPick={pickFile} />}
        {step === 'mapColumns' && (
          <MapColumns
            headers={csvHeaders}
            rows={csvRows}
            mappings={mappings}
            onEdit={setEditingMapping}
            onPreview={applyMappings}
          />
        )}
        {step === 'preview' && (
          <Preview
            clients={clients}
            services={services}
            appointments={appointments}
            selectedCount={selectedCount}
            totalCount={totalCount}
            onToggleClient={(i) => setClients((p) => p.map((c, j) => (j === i ? { ...c, selected: !c.selected } : c)))}
            onToggleService={(i) => setServices((p) => p.map((s, j) => (j === i ? { ...s, selected: !s.selected } : s)))}
            onToggleAppt={(i) => setAppointments((p) => p.map((a, j) => (j === i ? { ...a, selected: !a.selected } : a)))}
            onToggleAll={() => setAllSelected(selectedCount !== totalCount)}
            onImport={executeImport}
          />
        )}
        {step === 'importing' && <Importing progress={progress} />}
        {step === 'complete' && <Complete result={result} onDone={() => router.back()} onMore={reset} />}
      </ScrollView>

      <OptionSheet
        visible={editingMapping != null}
        title="Map Column"
        options={[
          { label: 'Skip this column', value: SKIP },
          ...fieldsForCategory(category).map((f) => ({ label: f.label, value: f.field as string })),
        ]}
        selected={editingMapping?.mappedField ?? SKIP}
        onSelect={(value) => {
          if (!editingMapping) return;
          const field = value === SKIP ? null : (value as MappableField);
          setMappings((prev) => prev.map((m) => (m.id === editingMapping.id ? { ...m, mappedField: field } : m)));
        }}
        onClose={() => setEditingMapping(null)}
      />

      <DetectedServicesReviewSheet
        visible={showReview}
        groups={detectedGroups}
        services={servicesStore.services}
        staff={staff}
        onSetResolution={setResolution}
        onMerge={mergeGroup}
        onSetStaff={setGroupStaff}
        onSetStaffAll={setAllGroupStaff}
        onPrefillStaff={prefillGroupStaff}
        onDone={() => setShowReview(false)}
        onKeepOriginals={keepOriginals}
      />
    </SafeAreaView>
  );
}

function stepTitle(step: ImportStep): string {
  switch (step) {
    case 'pickFile':
      return 'Choose File';
    case 'mapColumns':
      return 'Map Columns';
    case 'preview':
      return 'Preview';
    case 'importing':
      return 'Importing';
    default:
      return 'Import & Sync';
  }
}

// ── Select source ──

function SelectSource({ onPick }: { onPick: (ft: ImportFileType, cat: ImportDataCategory) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.blockHead}>
        <Icon name="arrow.triangle.2.circlepath.circle.fill" size={20} color={BLUE} />
        <Text style={[styles.blockTitle, { color: theme.primaryText }]}>Sync with Calendar</Text>
      </View>
      <Text style={[styles.blockSub, { color: theme.secondaryText }]}>Pull appointments from your phone's calendar apps directly.</Text>
      <SourceCard
        icon="calendar"
        title="Apple Calendar"
        subtitle="Sync events from your iPhone calendar"
        color={iOSColors.red}
        onPress={() => Alert.alert('Apple Calendar', 'Direct calendar sync needs the native build (coming with Phase 7). For now, export an ICS file and import it below.')}
      />
      <SourceCard
        icon="g.circle.fill"
        title="Google Calendar"
        subtitle="Import via exported ICS file from Google Calendar"
        color="#4285D1"
        onPress={() =>
          Alert.alert(
            'Import from Google Calendar',
            "1. Go to calendar.google.com on a computer\n2. Settings → Import & Export\n3. Export your calendar as an ICS file\n4. Transfer it to your phone\n5. Come back and tap 'ICS / iCal File' below",
          )
        }
      />

      <View style={styles.orRow}>
        <View style={[styles.orLine, { backgroundColor: withOpacity(iOSColors.gray, 0.25) }]} />
        <Text style={[styles.orText, { color: theme.secondaryText }]}>or import a file</Text>
        <View style={[styles.orLine, { backgroundColor: withOpacity(iOSColors.gray, 0.25) }]} />
      </View>

      <View style={styles.blockHead}>
        <Icon name="square.and.arrow.down.on.square" size={20} color="#33B399" />
        <Text style={[styles.blockTitle, { color: theme.primaryText }]}>Import from File</Text>
      </View>
      <Text style={[styles.blockSub, { color: theme.secondaryText }]}>
        Upload a CSV or ICS file exported from apps like Goldie, Fresha, Square, or Vagaro.
      </Text>
      <QuickCard icon="tablecells" title="CSV — Clients" subtitle="Import client names, phones, emails" color={GREEN} onPress={() => onPick('csv', 'clients')} />
      <QuickCard icon="tablecells" title="CSV — Services" subtitle="Import service names, prices, durations" color={PURPLE} onPress={() => onPick('csv', 'services')} />
      <QuickCard icon="tablecells" title="CSV — Appointments" subtitle="Import appointment dates, clients, services" color={BLUE} onPress={() => onPick('csv', 'appointments')} />
      <QuickCard icon="calendar" title="ICS / iCal File" subtitle="Import calendar events as appointments" color="#F26666" onPress={() => onPick('ics', 'appointments')} />
    </View>
  );
}

function SourceCard({ icon, title, subtitle, color, onPress }: { icon: SFSymbol; title: string; subtitle: string; color: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={[styles.card, { backgroundColor: theme.cardBackground }]} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: withOpacity(color, 0.12) }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: theme.secondaryText }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Icon name="arrow.right.circle.fill" size={22} color={withOpacity(color, 0.5)} />
    </Pressable>
  );
}

function QuickCard({ icon, title, subtitle, color, onPress }: { icon: SFSymbol; title: string; subtitle: string; color: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={[styles.card, { backgroundColor: theme.cardBackground }]} onPress={onPress}>
      <View style={[styles.cardIconSm, { backgroundColor: withOpacity(color, 0.1) }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: theme.secondaryText }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Icon name="chevron.right" size={13} color={withOpacity(iOSColors.gray, 0.5)} weight="medium" />
    </Pressable>
  );
}

// ── Map columns ──

function MapColumns({
  headers,
  rows,
  mappings,
  onEdit,
  onPreview,
}: {
  headers: string[];
  rows: Record<string, string>[];
  mappings: ColumnMapping[];
  onEdit: (m: ColumnMapping) => void;
  onPreview: () => void;
}) {
  const theme = useAppTheme();
  const firstRow = rows[0];
  return (
    <View style={styles.section}>
      <Text style={[styles.centerTitle, { color: theme.primaryText }]}>Map Your Columns</Text>
      <Text style={[styles.centerSub, { color: theme.secondaryText }]}>We've auto-detected what we can. Adjust any that look wrong.</Text>

      {firstRow && (
        <View style={[styles.sampleCard, { backgroundColor: withOpacity(BLUE, 0.06) }]}>
          <Text style={[styles.sampleLabel, { color: theme.secondaryText }]}>Sample data:</Text>
          {headers.slice(0, 5).map((h) => (
            <View key={h} style={styles.sampleRow}>
              <Text style={[styles.sampleKey, { color: theme.primaryText }]} numberOfLines={1}>{h}</Text>
              <Text style={[styles.sampleVal, { color: theme.secondaryText }]} numberOfLines={1}>{firstRow[h] || '—'}</Text>
            </View>
          ))}
        </View>
      )}

      {mappings.map((m) => (
        <Pressable key={m.id} style={[styles.mapRow, { backgroundColor: theme.cardBackground }]} onPress={() => onEdit(m)}>
          <View style={styles.flex}>
            <Text style={[styles.mapColLabel, { color: theme.secondaryText }]}>CSV Column</Text>
            <Text style={[styles.mapColName, { color: theme.primaryText }]} numberOfLines={1}>{m.csvHeader}</Text>
          </View>
          <Icon name="arrow.right" size={14} color={theme.secondaryText} />
          <View style={[styles.mapField, { backgroundColor: theme.inputBackground }]}>
            <Text style={[styles.mapFieldText, { color: m.mappedField ? theme.primaryText : iOSColors.gray }]} numberOfLines={1}>
              {m.mappedField ? mappedLabel(m.mappedField) : 'Not mapped'}
            </Text>
            <Icon name="chevron.up.chevron.down" size={11} color={theme.secondaryText} />
          </View>
        </Pressable>
      ))}

      <Pressable style={[styles.primaryBtn, { backgroundColor: BLUE }]} onPress={onPreview}>
        <Text style={styles.primaryBtnText}>Preview Import</Text>
      </Pressable>
    </View>
  );
}

function mappedLabel(field: MappableField): string {
  return fieldsForCategory('clients')
    .concat(fieldsForCategory('services'), fieldsForCategory('appointments'))
    .find((f) => f.field === field)!.label;
}

// ── Preview ──

function Preview({
  clients,
  services,
  appointments,
  selectedCount,
  totalCount,
  onToggleClient,
  onToggleService,
  onToggleAppt,
  onToggleAll,
  onImport,
}: {
  clients: ParsedClient[];
  services: ParsedService[];
  appointments: ParsedAppointment[];
  selectedCount: number;
  totalCount: number;
  onToggleClient: (i: number) => void;
  onToggleService: (i: number) => void;
  onToggleAppt: (i: number) => void;
  onToggleAll: () => void;
  onImport: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.previewHead}>
        <Text style={[styles.centerTitle, { color: theme.primaryText, textAlign: 'left' }]}>Review & Import</Text>
        <Pressable onPress={onToggleAll}>
          <Text style={[styles.link, { color: BLUE }]}>{selectedCount === totalCount ? 'Deselect All' : 'Select All'}</Text>
        </Pressable>
      </View>
      <Text style={[styles.blockSub, { color: theme.secondaryText }]}>{selectedCount} of {totalCount} items selected</Text>

      {clients.length > 0 && (
        <PreviewSection title="Clients" icon="person.3.fill" color={GREEN} count={clients.filter((c) => c.selected).length} total={clients.length}>
          {clients.map((c, i) => (
            <PreviewRow
              key={c.id}
              title={c.name}
              subtitle={[c.phone, c.email].filter((x) => x && x.length > 0).join(' · ')}
              selected={c.selected}
              onToggle={() => onToggleClient(i)}
            />
          ))}
        </PreviewSection>
      )}
      {services.length > 0 && (
        <PreviewSection title="Services" icon="list.clipboard.fill" color={PURPLE} count={services.filter((s) => s.selected).length} total={services.length}>
          {services.map((s, i) => (
            <PreviewRow key={s.id} title={s.name} subtitle={`$${s.price.toFixed(0)} · ${s.duration} min`} selected={s.selected} onToggle={() => onToggleService(i)} />
          ))}
        </PreviewSection>
      )}
      {appointments.length > 0 && (
        <PreviewSection title="Appointments" icon="calendar.badge.plus" color={BLUE} count={appointments.filter((a) => a.selected).length} total={appointments.length}>
          {appointments.map((a, i) => (
            <PreviewRow
              key={a.id}
              title={`${a.clientName} — ${a.serviceName}`}
              subtitle={dateTimeFmt.format(new Date(a.startTime))}
              selected={a.selected}
              onToggle={() => onToggleAppt(i)}
            />
          ))}
        </PreviewSection>
      )}

      <Pressable
        style={[styles.primaryBtn, { backgroundColor: selectedCount > 0 ? BLUE : iOSColors.gray, flexDirection: 'row', gap: 8 }]}
        disabled={selectedCount === 0}
        onPress={onImport}>
        <Icon name="square.and.arrow.down" size={16} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Import {selectedCount} Items</Text>
      </Pressable>
    </View>
  );
}

function PreviewSection({
  title,
  icon,
  color,
  count,
  total,
  children,
}: {
  title: string;
  icon: SFSymbol;
  color: string;
  count: number;
  total: number;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={[styles.previewSection, { backgroundColor: theme.cardBackground }]}>
      <Pressable style={styles.previewSectionHead} onPress={() => setExpanded((v) => !v)}>
        <Icon name={icon} size={16} color={color} />
        <Text style={[styles.previewSectionTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.previewSectionCount, { color: theme.secondaryText }]}>{count}/{total}</Text>
        <View style={styles.flex} />
        <Icon name={expanded ? 'chevron.up' : 'chevron.down'} size={13} color={theme.secondaryText} />
      </Pressable>
      {expanded && (
        <>
          <View style={[styles.previewDivider, { backgroundColor: theme.divider }]} />
          {children}
        </>
      )}
    </View>
  );
}

function PreviewRow({ title, subtitle, selected, onToggle }: { title: string; subtitle: string; selected: boolean; onToggle: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={styles.previewRow} onPress={onToggle}>
      <Icon name={selected ? 'checkmark.circle.fill' : 'circle'} size={20} color={selected ? BLUE : withOpacity(iOSColors.gray, 0.4)} />
      <View style={styles.flex}>
        <Text style={[styles.previewRowTitle, { color: selected ? theme.primaryText : theme.secondaryText }]} numberOfLines={1}>{title}</Text>
        {subtitle.length > 0 && <Text style={[styles.previewRowSub, { color: theme.secondaryText }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </Pressable>
  );
}

// ── Importing ──

function Importing({ progress }: { progress: number }) {
  const theme = useAppTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={BLUE} />
      <Text style={[styles.centerTitle, { color: theme.primaryText }]}>Importing your data...</Text>
      <View style={[styles.track, { backgroundColor: theme.divider }]}>
        <View style={[styles.fill, { backgroundColor: BLUE, width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={[styles.centerSub, { color: theme.secondaryText }]}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

// ── Complete ──

function Complete({ result, onDone, onMore }: { result: ImportResult | null; onDone: () => void; onMore: () => void }) {
  const theme = useAppTheme();
  if (!result) return null;
  const total = importTotal(result);
  return (
    <View style={styles.centered}>
      {total > 0 ? (
        <>
          <Icon name="checkmark.circle.fill" size={60} color={GREEN} />
          <Text style={[styles.completeTitle, { color: theme.primaryText }]}>Import Complete!</Text>
          <Text style={[styles.centerSub, { color: theme.secondaryText }]}>Successfully imported {importSummary(result)}</Text>
          <View style={[styles.resultCard, { backgroundColor: theme.cardBackground }]}>
            {result.clientsImported > 0 && <ResultRow icon="person.3.fill" label="Clients" count={result.clientsImported} color={GREEN} />}
            {result.servicesImported > 0 && <ResultRow icon="list.clipboard.fill" label="Services" count={result.servicesImported} color={PURPLE} />}
            {result.appointmentsImported > 0 && <ResultRow icon="calendar.badge.plus" label="Appointments" count={result.appointmentsImported} color={BLUE} />}
            {result.timeOffImported > 0 && <ResultRow icon="moon.zzz.fill" label="Time Off" count={result.timeOffImported} color={iOSColors.orange} />}
          </View>
        </>
      ) : (
        <>
          <Icon name="exclamationmark.triangle.fill" size={60} color={iOSColors.orange} />
          <Text style={[styles.completeTitle, { color: theme.primaryText }]}>No Data Imported</Text>
        </>
      )}

      {result.errors.length > 0 && (
        <View style={[styles.warnCard, { backgroundColor: withOpacity(iOSColors.orange, 0.08) }]}>
          <Text style={[styles.warnTitle, { color: iOSColors.orange }]}>Warnings:</Text>
          {result.errors.map((e) => (
            <Text key={e} style={[styles.warnText, { color: theme.secondaryText }]}>• {e}</Text>
          ))}
        </View>
      )}

      <Pressable style={[styles.primaryBtn, { backgroundColor: BLUE, alignSelf: 'stretch' }]} onPress={onDone}>
        <Text style={styles.primaryBtnText}>Done</Text>
      </Pressable>
      <Pressable style={[styles.primaryBtn, { backgroundColor: withOpacity(BLUE, 0.1), alignSelf: 'stretch' }]} onPress={onMore}>
        <Text style={[styles.primaryBtnText, { color: BLUE }]}>Import More Data</Text>
      </Pressable>
    </View>
  );
}

function ResultRow({ icon, label, count, color }: { icon: SFSymbol; label: string; count: number; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.resultRow}>
      <Icon name={icon} size={18} color={color} />
      <Text style={[styles.resultLabel, { color: theme.primaryText }]}>{label}</Text>
      <View style={styles.flex} />
      <Text style={[styles.resultCount, { color }]}>+{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 60 },
  backText: { fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  progressBar: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingVertical: 12 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { gap: 12, paddingTop: 8 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  blockTitle: { fontSize: 18, fontWeight: '700' },
  blockSub: { fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardIconSm: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: '500' },
  centerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  centerSub: { fontSize: 14, textAlign: 'center' },
  sampleCard: { padding: 14, borderRadius: 10, gap: 8 },
  sampleLabel: { fontSize: 13, fontWeight: '500' },
  sampleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  sampleKey: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  sampleVal: { fontSize: 13, flexShrink: 1, textAlign: 'right' },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
  mapColLabel: { fontSize: 11 },
  mapColName: { fontSize: 14, fontWeight: '500' },
  mapField: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, maxWidth: '45%' },
  mapFieldText: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontSize: 14, fontWeight: '500' },
  previewSection: { borderRadius: 12, overflow: 'hidden' },
  previewSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  previewSectionTitle: { fontSize: 16, fontWeight: '600' },
  previewSectionCount: { fontSize: 13 },
  previewDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  previewRowTitle: { fontSize: 14, fontWeight: '500' },
  previewRowSub: { fontSize: 12, marginTop: 2 },
  centered: { alignItems: 'center', gap: 16, paddingTop: 30 },
  track: { width: 250, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  completeTitle: { fontSize: 24, fontWeight: '700' },
  resultCard: { alignSelf: 'stretch', padding: 16, borderRadius: 12, gap: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultLabel: { fontSize: 15 },
  resultCount: { fontSize: 15, fontWeight: '600' },
  warnCard: { alignSelf: 'stretch', padding: 14, borderRadius: 10, gap: 8 },
  warnTitle: { fontSize: 14, fontWeight: '600' },
  warnText: { fontSize: 13 },
});
