/**
 * Booking-page appearance pickers — ports of BrandColorPicker.swift,
 * BookingPageThemes.swift and FontStylePicker.swift.
 *
 * - BrandColorPicker: the six curated three-colour presets plus a 1 / 2 / 3
 *   colour-count control. "1" sends only the primary (the backend derives the
 *   rest), "2" adds an explicit secondary, "3" all three. A stored colour that
 *   matches no preset shows as a "Current" swatch so it's never lost.
 * - FontStylePicker: the five Google-Fonts pairs the public page can render.
 *
 * The swatches are the business's own brand colours (shown on its public
 * page), so they're literal hex values rather than theme tokens — the same
 * exception as user-picked service/staff colours.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BookingColorMode, BookingFontFamily, BookingPageConfig } from '@/api/booking-page';
import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

export interface BrandPreset {
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
}

/** BookingPageThemes.all — Indigo first (the legacy default accent). */
export const BRAND_PRESETS: BrandPreset[] = [
  { name: 'Indigo', primary: '#6366F1', secondary: '#8B5CF6', tertiary: '#A78BFA' },
  { name: 'Ocean', primary: '#0EA5E9', secondary: '#06B6D4', tertiary: '#67E8F9' },
  { name: 'Forest', primary: '#10B981', secondary: '#059669', tertiary: '#6EE7B7' },
  { name: 'Sunset', primary: '#F97316', secondary: '#EF4444', tertiary: '#FCA5A5' },
  { name: 'Rose', primary: '#EC4899', secondary: '#DB2777', tertiary: '#F9A8D4' },
  { name: 'Midnight', primary: '#1E293B', secondary: '#334155', tertiary: '#64748B' },
];

export const FONT_STYLES: { id: BookingFontFamily; name: string; tagline: string }[] = [
  { id: 'modern', name: 'Modern', tagline: 'Clean, professional' },
  { id: 'classic', name: 'Classic', tagline: 'Editorial, refined' },
  { id: 'friendly', name: 'Friendly', tagline: 'Approachable, warm' },
  { id: 'bold', name: 'Bold', tagline: 'Strong, confident' },
  { id: 'elegant', name: 'Elegant', tagline: 'Sophisticated' },
];

const MODES: { mode: BookingColorMode; label: string }[] = [
  { mode: 'single', label: '1 colour' },
  { mode: 'pair', label: '2 colours' },
  { mode: 'triple', label: '3 colours' },
];

/** Mix `hex` toward white by `amount` (0–1) — BrandColorPicker.lighten. */
export function lighten(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const ch = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * amount).toString(16).padStart(2, '0');
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`.toUpperCase();
}

const same = (a?: string | null, b?: string | null) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

type ColorFields = Pick<BookingPageConfig, 'accentColorHex' | 'secondaryColorHex' | 'tertiaryColorHex' | 'colorMode'>;

/** Colours for a given primary + mode, borrowing a preset's extras when the primary is one. */
function colorsFor(primary: string, mode: BookingColorMode, current?: ColorFields): ColorFields {
  const preset = BRAND_PRESETS.find((p) => same(p.primary, primary));
  const secondary = preset?.secondary ?? current?.secondaryColorHex ?? lighten(primary, 0.15);
  const tertiary = preset?.tertiary ?? current?.tertiaryColorHex ?? lighten(primary, 0.3);
  return {
    accentColorHex: primary,
    secondaryColorHex: mode === 'single' ? null : secondary,
    tertiaryColorHex: mode === 'triple' ? tertiary : null,
    colorMode: mode,
  };
}

export function BrandColorPicker({
  value,
  onChange,
  showModes = true,
}: {
  value: ColorFields;
  onChange: (next: ColorFields) => void;
  showModes?: boolean;
}) {
  const theme = useAppTheme();
  const isPreset = BRAND_PRESETS.some((p) => same(p.primary, value.accentColorHex));
  const swatches: { name: string; primary: string; secondary: string }[] = [
    ...(isPreset
      ? []
      : [{ name: 'Current', primary: value.accentColorHex, secondary: value.secondaryColorHex ?? lighten(value.accentColorHex, 0.15) }]),
    ...BRAND_PRESETS,
  ];
  const radius = theme.isEditorial ? 2 : 999;

  return (
    <View style={styles.wrap}>
      <View style={styles.swatches}>
        {swatches.map((s) => {
          const active = same(s.primary, value.accentColorHex);
          return (
            <Pressable
              key={s.name}
              onPress={() => onChange(colorsFor(s.primary, value.colorMode, value))}
              accessibilityLabel={`${s.name} brand colour`}
              style={styles.swatchItem}>
              <View style={[styles.swatchRing, { borderColor: active ? theme.primaryText : 'transparent', borderRadius: radius }]}>
                <View style={[styles.swatch, { borderRadius: radius, overflow: 'hidden' }]}>
                  <View style={[styles.flex, { backgroundColor: s.primary }]} />
                  {value.colorMode !== 'single' ? <View style={[styles.half, { backgroundColor: s.secondary }]} /> : null}
                </View>
              </View>
              <Text style={[styles.swatchLabel, { color: active ? theme.primaryText : theme.secondaryText }]}>{s.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {showModes ? (
        <View style={[styles.segment, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 10 }]}>
          {MODES.map((m) => {
            const active = value.colorMode === m.mode;
            return (
              <Pressable
                key={m.mode}
                onPress={() => onChange(colorsFor(value.accentColorHex, m.mode, value))}
                style={[
                  styles.segmentItem,
                  { borderRadius: theme.isEditorial ? 2 : 8, backgroundColor: active ? theme.cardBackground : 'transparent' },
                ]}>
                <Text style={[styles.segmentText, { color: active ? theme.primaryText : theme.secondaryText }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function FontStylePicker({ value, onChange }: { value: BookingFontFamily; onChange: (f: BookingFontFamily) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.fonts}>
      {FONT_STYLES.map((f) => {
        const active = f.id === value;
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            style={[
              styles.fontRow,
              {
                borderRadius: theme.isEditorial ? 2 : 12,
                borderColor: active ? theme.accent : theme.divider,
                backgroundColor: active ? theme.accentSoft : 'transparent',
              },
            ]}>
            <View style={styles.flex}>
              <Text style={[styles.fontName, { color: theme.primaryText }]}>{f.name}</Text>
              <Text style={[styles.fontTag, { color: theme.secondaryText }]}>{f.tagline}</Text>
            </View>
            {active ? <Icon name="checkmark.circle.fill" size={20} color={theme.accent} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  flex: { flex: 1 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchItem: { alignItems: 'center', gap: 4, width: 52 },
  swatchRing: { padding: 3, borderWidth: 2 },
  swatch: { width: 38, height: 38, flexDirection: 'row' },
  half: { flex: 1 },
  swatchLabel: { fontSize: 11, fontWeight: '500' },
  segment: { flexDirection: 'row', padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  segmentText: { fontSize: 13, fontWeight: '600' },
  fonts: { gap: 8 },
  fontRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  fontName: { fontSize: 15, fontWeight: '600' },
  fontTag: { fontSize: 12, marginTop: 2 },
});
