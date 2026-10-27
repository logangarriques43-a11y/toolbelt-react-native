/**
 * Online Booking sheets — the "Edit Booking URL" and "Bookable Services"
 * sheets from OnlineBookingView.swift, plus the bottom toast it uses for
 * "Link copied!" / "Site updated!".
 *
 * SlugSheet validates as iOS does (lowercase letters, numbers and dashes) and
 * awaits the caller's save so a 409 ("URL already taken") keeps the sheet open
 * with the server's message. ServicesSheet edits `enabledServiceIds` with the
 * iOS semantics: empty = All Services; un-ticking one while on All switches
 * to an explicit list of every other service.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PUBLIC_HOST } from '@/api/booking-page';
import { Icon } from '@/components/icon';
import { priceDisplay, type Service } from '@/models/service';
import { useAppTheme } from '@/theme/theme-context';

const SLUG_RE = /^[a-z0-9-]+$/;

export function validateSlug(slug: string): string | null {
  if (!slug) return 'Enter a URL.';
  if (!SLUG_RE.test(slug)) return 'Use lowercase letters, numbers, and dashes only.';
  if (slug.startsWith('-') || slug.endsWith('-')) return "The URL can't start or end with a dash.";
  return null;
}

export function SlugSheet({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: string;
  /** Resolve to null on success (sheet closes) or an error message to show. */
  onSave: (slug: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const [slug, setSlug] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSlug(initial);
      setError(null);
    }
  }, [visible, initial]);

  const save = async () => {
    const cleaned = slug.trim().toLowerCase();
    const invalid = validateSlug(cleaned);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    const err = await onSave(cleaned);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.headerBtn, { color: theme.secondaryText }]}>Cancel</Text>
          </Pressable>
          <Text style={theme.display(20)}>Edit Booking URL</Text>
          <Pressable onPress={save} hitSlop={8} disabled={saving || !slug.trim()}>
            {saving ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <Text style={[styles.headerBtn, styles.bold, { color: theme.accent, opacity: slug.trim() ? 1 : 0.4 }]}>Save</Text>
            )}
          </Pressable>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        <View style={styles.body}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>Customise your booking URL</Text>
          <View style={[styles.slugField, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 12 }]}>
            <Text style={[styles.prefix, { color: theme.secondaryText }]}>{PUBLIC_HOST.replace('https://', '')}/book/</Text>
            <TextInput
              value={slug}
              onChangeText={(t) => {
                setSlug(t.toLowerCase());
                setError(null);
              }}
              placeholder="your-business"
              placeholderTextColor={theme.tertiaryText}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={[styles.slugInput, { color: theme.primaryText }]}
            />
          </View>
          <Text style={[styles.hint, { color: error ? '#FF3B30' : theme.secondaryText }]}>
            {error ?? 'Use lowercase letters, numbers, and dashes only.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export function ServicesSheet({
  visible,
  services,
  enabledServiceIds,
  onChange,
  onClose,
}: {
  visible: boolean;
  /** Services available for online booking. */
  services: Service[];
  enabledServiceIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const all = enabledServiceIds.length === 0;

  const toggle = (id: string) => {
    if (all) onChange(services.map((s) => s.id).filter((x) => x !== id));
    // Un-ticking the last one leaves an empty list, i.e. All Services (as on iOS).
    else if (enabledServiceIds.includes(id)) onChange(enabledServiceIds.filter((x) => x !== id));
    else onChange([...enabledServiceIds, id]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.full, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={theme.display(20)}>Bookable Services</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.headerSpacer}>
            <Text style={[styles.headerBtn, styles.bold, styles.right, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.listBody}>
          <View style={theme.card}>
            <Pressable style={styles.row} onPress={() => onChange([])}>
              <Text style={[styles.rowTitle, styles.flex, { color: theme.primaryText }]}>All Services</Text>
              {all ? <Icon name="checkmark" size={16} color={theme.accent} /> : null}
            </Pressable>
          </View>
          <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>SELECT SPECIFIC SERVICES</Text>
          <View style={theme.card}>
            {services.length === 0 ? (
              <Text style={[styles.empty, { color: theme.secondaryText }]}>
                No services are available for online booking. Turn on &quot;Available for online booking&quot; on a service first.
              </Text>
            ) : (
              services.map((s, i) => (
                <View key={s.id}>
                  {i > 0 ? <View style={[styles.divider, styles.inset, { backgroundColor: theme.divider }]} /> : null}
                  <Pressable style={styles.row} onPress={() => toggle(s.id)}>
                    <View style={[styles.dot, { backgroundColor: s.colorHex }]} />
                    <Text style={[styles.rowTitle, styles.flex, { color: theme.primaryText }]}>{s.name}</Text>
                    <Text style={[styles.rowSub, { color: theme.secondaryText }]}>${priceDisplay(s)}</Text>
                    {!all && enabledServiceIds.includes(s.id) ? <Icon name="checkmark" size={16} color={theme.accent} /> : null}
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function Toast({ message, error }: { message: string | null; error?: boolean }) {
  const theme = useAppTheme();
  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.toastWrap}>
      <View style={[styles.toast, { backgroundColor: error ? '#FF3B30' : theme.inverse, borderRadius: theme.isEditorial ? 2 : 999 }]}>
        <Icon name={error ? 'exclamationmark.triangle.fill' : 'checkmark.circle.fill'} size={16} color={error ? '#FFFFFF' : theme.onInverse} />
        <Text style={[styles.toastText, { color: error ? '#FFFFFF' : theme.onInverse }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  full: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerBtn: { fontSize: 16 },
  headerSpacer: { minWidth: 56 },
  right: { textAlign: 'right' },
  bold: { fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  inset: { marginLeft: 16 },
  body: { padding: 20, gap: 12 },
  label: { fontSize: 14, fontWeight: '500' },
  slugField: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  prefix: { fontSize: 14 },
  slugInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 14 },
  hint: { fontSize: 13 },
  listBody: { padding: 20, gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { fontSize: 14, padding: 16, lineHeight: 20 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 110, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  toastText: { fontSize: 15, fontWeight: '600' },
});
