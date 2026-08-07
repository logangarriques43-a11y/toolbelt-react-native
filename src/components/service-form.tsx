/**
 * ServiceForm — add/edit a service. Port of AddServiceView.swift +
 * AddServiceViewModel. Shared by the `services/new` and `services/[id]` routes.
 *
 * Faithful to the original's sections and picker sheets. The genuinely
 * unimplemented Swift buttons (AI description, add photo, add-ons, deposit edit)
 * are rendered but inert, exactly as in the source.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareForm } from '@/components/keyboard-aware-form';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ColorPickerSheet } from '@/components/sheets/color-picker-sheet';
import { PriceTypeSheet } from '@/components/sheets/price-type-sheet';
import { TimeWheelSheet } from '@/components/sheets/time-wheel-sheet';
import { useServices } from '@/context/services-store';
import { withOpacity } from '@/lib/color';
import { DEFAULT_SERVICE_COLOR, type PriceType } from '@/models/service';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

function formatDuration(h: number, m: number): string {
  if (h === 0 && m === 0) return '0 min';
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function digitsOnly(s: string): string {
  return s.replace(/[^0-9.]/g, '');
}

type TimeTarget = 'duration' | 'processing' | 'block' | null;

export function ServiceForm({ editingId }: { editingId?: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { services, addService, updateService } = useServices();

  const editing = useMemo(
    () => (editingId ? services.find((s) => s.id === editingId) : undefined),
    [editingId, services],
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState(editing?.colorHex ?? DEFAULT_SERVICE_COLOR);
  const [defaultForNew, setDefaultForNew] = useState(false);

  const [priceType, setPriceType] = useState<PriceType>(editing?.priceType ?? 'Fixed');
  const [price, setPrice] = useState(editing && editing.price ? String(Math.round(editing.price)) : '');
  const [minPrice, setMinPrice] = useState(editing?.minPrice != null ? String(Math.round(editing.minPrice)) : '');
  const [maxPrice, setMaxPrice] = useState(editing?.maxPrice != null ? String(Math.round(editing.maxPrice)) : '');

  const [durH, setDurH] = useState(Math.floor((editing?.duration ?? 30) / 60));
  const [durM, setDurM] = useState((editing?.duration ?? 30) % 60);

  const [addProcessing, setAddProcessing] = useState((editing?.processingTime ?? 0) > 0);
  const [procH, setProcH] = useState(Math.floor((editing?.processingTime ?? 0) / 60));
  const [procM, setProcM] = useState((editing?.processingTime ?? 15) % 60 || 15);

  const [blockExtra, setBlockExtra] = useState((editing?.blockTime ?? 0) > 0);
  const [blockH, setBlockH] = useState(Math.floor((editing?.blockTime ?? 0) / 60));
  const [blockM, setBlockM] = useState((editing?.blockTime ?? 15) % 60 || 15);

  const [onlineBooking, setOnlineBooking] = useState(editing?.availableForOnlineBooking ?? true);
  const [noDoubleBooking, setNoDoubleBooking] = useState(editing?.noDoubleBooking ?? false);
  const [description, setDescription] = useState('');

  const [colorSheet, setColorSheet] = useState(false);
  const [priceTypeSheet, setPriceTypeSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeSheet, setTimeSheet] = useState<TimeTarget>(null);

  const totalMinutes =
    durH * 60 + durM + (addProcessing ? procH * 60 + procM : 0) + (blockExtra ? blockH * 60 + blockM : 0);

  const save = async () => {
    if (saving) return;
    if (!name.trim()) return Alert.alert('Error', 'Please enter a service name');
    const durationValue = durH * 60 + durM;
    if (durationValue <= 0) return Alert.alert('Error', 'Please select a duration');

    let priceValue = 0;
    let minVal: number | undefined;
    let maxVal: number | undefined;
    if (priceType === 'Fixed') {
      priceValue = Number(price) || 0;
    } else {
      minVal = Number(minPrice) || 0;
      maxVal = Number(maxPrice) || 0;
      priceValue = minVal;
    }

    const base = {
      name,
      colorHex: color,
      price: priceValue,
      minPrice: minVal,
      maxPrice: maxVal,
      duration: durationValue,
      priceType,
      processingTime: addProcessing ? procH * 60 + procM : 0,
      blockTime: blockExtra ? blockH * 60 + blockM : 0,
      noDoubleBooking,
      availableForOnlineBooking: onlineBooking,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateService({ ...editing, ...base });
      } else {
        await addService(base);
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const timeProps = (() => {
    switch (timeSheet) {
      case 'duration':
        return { title: 'Select Duration', h: durH, m: durM, set: (h: number, m: number) => { setDurH(h); setDurM(m); } };
      case 'processing':
        return { title: 'Processing Time', h: procH, m: procM, set: (h: number, m: number) => { setProcH(h); setProcM(m); } };
      case 'block':
        return { title: 'Block Time', h: blockH, m: blockM, set: (h: number, m: number) => { setBlockH(h); setBlockM(m); } };
      default:
        return null;
    }
  })();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="chevron.left" size={20} weight="semibold" color={iOSColors.blue} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
            {editing ? 'Edit Service' : 'Add Service'}
          </Text>
          <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAwareForm contentContainerStyle={styles.body}>
          {/* Basic info */}
          <View style={styles.section}>
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Service Name</Text>
              <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter service name"
                  placeholderTextColor={theme.tertiaryText}
                  style={[styles.input, { color: theme.primaryText }]}
                />
              </View>
            </View>

            <Pressable
              onPress={() => setColorSheet(true)}
              style={[styles.card, styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <View style={styles.rowText}>
                <Text style={[styles.rowCaption, { color: theme.secondaryText }]}>Color</Text>
                <Text style={[styles.rowValue, { color: theme.primaryText }]}>Selected color</Text>
              </View>
              <Icon name="chevron.right" size={16} color={theme.secondaryText} />
            </Pressable>

            <ToggleRow
              icon="person.badge.plus"
              title="Default service for new clients"
              value={defaultForNew}
              onChange={setDefaultForNew}
            />
          </View>

          {/* Price & duration */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Price &amp; duration</Text>

            <View style={styles.priceRow}>
              <Pressable
                onPress={() => setPriceTypeSheet(true)}
                style={[styles.card, styles.flex, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <Text style={[styles.rowCaption, { color: theme.secondaryText }]}>Type</Text>
                <View style={styles.inlineBetween}>
                  <Text style={[styles.rowValue, { color: theme.primaryText }]}>{priceType}</Text>
                  <Icon name="chevron.down" size={12} color={theme.secondaryText} />
                </View>
              </Pressable>

              {priceType === 'Fixed' ? (
                <View style={[styles.card, styles.flex, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <Text style={[styles.rowCaption, { color: theme.secondaryText }]}>Price</Text>
                  <View style={styles.inlineStart}>
                    <Text style={{ color: theme.secondaryText }}>$</Text>
                    <TextInput
                      value={price}
                      onChangeText={(t) => setPrice(digitsOnly(t))}
                      placeholder="0"
                      placeholderTextColor={theme.tertiaryText}
                      keyboardType="decimal-pad"
                      style={[styles.priceInput, { color: theme.primaryText }]}
                    />
                  </View>
                </View>
              ) : (
                <View style={[styles.card, styles.flex, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <Text style={[styles.rowCaption, { color: theme.secondaryText }]}>Price Range</Text>
                  <View style={styles.inlineStart}>
                    <Text style={{ color: theme.secondaryText }}>$</Text>
                    <TextInput
                      value={minPrice}
                      onChangeText={(t) => setMinPrice(digitsOnly(t))}
                      placeholder="Min"
                      placeholderTextColor={theme.tertiaryText}
                      keyboardType="decimal-pad"
                      style={[styles.rangeInput, { color: theme.primaryText }]}
                    />
                    <Text style={{ color: theme.secondaryText }}>-</Text>
                    <Text style={{ color: theme.secondaryText }}>$</Text>
                    <TextInput
                      value={maxPrice}
                      onChangeText={(t) => setMaxPrice(digitsOnly(t))}
                      placeholder="Max"
                      placeholderTextColor={theme.tertiaryText}
                      keyboardType="decimal-pad"
                      style={[styles.rangeInput, { color: theme.primaryText }]}
                    />
                  </View>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => setTimeSheet('duration')}
              style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <Text style={[styles.rowCaption, { color: theme.secondaryText }]}>Duration</Text>
              <View style={styles.inlineBetween}>
                <Text style={[styles.rowValue, { color: theme.primaryText }]}>{formatDuration(durH, durM)}</Text>
                <Icon name="chevron.down" size={12} color={theme.secondaryText} />
              </View>
            </Pressable>

            <ToggleRow
              icon="hourglass"
              title="Add processing time"
              value={addProcessing}
              onChange={setAddProcessing}
            />
            {addProcessing ? (
              <Pressable
                onPress={() => setTimeSheet('processing')}
                style={[styles.card, styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <Icon name="hourglass" size={16} color={iOSColors.blue} />
                <Text style={[styles.inlineLabel, { color: theme.secondaryText }]}>Processing time</Text>
                <View style={styles.flexEnd}>
                  <Text style={[styles.rowValue, { color: theme.primaryText }]}>{formatDuration(procH, procM)}</Text>
                  <Icon name="chevron.right" size={12} color={theme.secondaryText} />
                </View>
              </Pressable>
            ) : null}

            <ToggleRow
              icon="clock.badge.xmark"
              title="Block extra time"
              value={blockExtra}
              onChange={setBlockExtra}
            />
            {blockExtra ? (
              <Pressable
                onPress={() => setTimeSheet('block')}
                style={[styles.card, styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <Icon name="lock.fill" size={16} color={theme.secondaryText} />
                <Text style={[styles.inlineLabel, { color: theme.secondaryText }]}>Block time</Text>
                <View style={styles.flexEnd}>
                  <Text style={[styles.rowValue, { color: theme.primaryText }]}>{formatDuration(blockH, blockM)}</Text>
                  <Icon name="chevron.right" size={12} color={theme.secondaryText} />
                </View>
              </Pressable>
            ) : null}

            {addProcessing || blockExtra ? (
              <View style={[styles.totalRow, { borderTopColor: theme.divider }]}>
                <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>Total time reserved:</Text>
                <Text style={[styles.totalValue, { color: theme.primaryText }]}>
                  {formatDuration(Math.floor(totalMinutes / 60), totalMinutes % 60)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Online booking */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Online booking</Text>
            <ToggleRow
              icon="globe"
              title="Available for online booking"
              value={onlineBooking}
              onChange={setOnlineBooking}
              accent={iOSColors.yellow}
            />
            <ToggleRow
              icon="calendar.badge.exclamationmark"
              title="Do not allow double booking"
              value={noDoubleBooking}
              onChange={setNoDoubleBooking}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Service description (optional)"
                placeholderTextColor={theme.secondaryText}
                multiline
                style={[styles.textArea, { color: theme.primaryText }]}
              />
            </View>
          </View>
        </KeyboardAwareForm>
      </SafeAreaView>

      <ColorPickerSheet
        visible={colorSheet}
        selected={color}
        onSelect={setColor}
        onClose={() => setColorSheet(false)}
      />
      <PriceTypeSheet
        visible={priceTypeSheet}
        selected={priceType}
        onSelect={setPriceType}
        onClose={() => setPriceTypeSheet(false)}
      />
      <TimeWheelSheet
        visible={timeSheet !== null}
        title={timeProps?.title ?? ''}
        hours={timeProps?.h ?? 0}
        minutes={timeProps?.m ?? 0}
        onChange={(h, m) => timeProps?.set(h, m)}
        onClose={() => setTimeSheet(null)}
      />
    </DashboardGradient>
  );
}

function ToggleRow({
  icon,
  title,
  value,
  onChange,
  accent = iOSColors.blue,
}: {
  icon: SFSymbol;
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, styles.toggleRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Icon name={icon} size={20} color={theme.secondaryText} />
      <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: accent, false: withOpacity(iOSColors.gray, 0.3) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  saveBtn: { backgroundColor: iOSColors.blue, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  body: { paddingTop: 24, paddingBottom: 60, gap: 24 },
  section: { gap: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  fieldBlock: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  card: { borderRadius: 12, padding: 16 },
  input: { fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowCaption: { fontSize: 12 },
  // flex:1 + a little right padding so the value takes the full card width and
  // Android can't clip the trailing glyph ("Fixed"->"Fixe", "35 min"->"35").
  rowValue: { fontSize: 16, flex: 1, paddingRight: 4 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  priceRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1, gap: 4 },
  inlineBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineStart: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceInput: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  rangeInput: { width: 44, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  inlineLabel: { fontSize: 14, flex: 1 },
  flexEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { flex: 1, fontSize: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  totalLabel: { fontSize: 14, fontWeight: '500' },
  totalValue: { fontSize: 16, fontWeight: '600' },
  textArea: { minHeight: 96, fontSize: 16, textAlignVertical: 'top' },
});
