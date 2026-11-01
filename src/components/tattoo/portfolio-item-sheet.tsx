/**
 * PortfolioItemSheet — one portfolio piece. Staff see the photo and its styles;
 * owners can also change the styles and delete the piece.
 */

import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deleteTattooPortfolioItem, updateTattooPortfolioItem } from '@/api/tattoo';
import { SignedPhoto } from '@/components/signed-photo';
import { ThemedButton } from '@/components/themed';
import { errorMessage } from '@/lib/api-client';
import { styleLabel } from '@/lib/tattoo';
import type { TattooPortfolioItem, TattooStyle } from '@/models/tattoo';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function PortfolioItemSheet({
  item,
  styleOptions,
  canEdit,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: TattooPortfolioItem | null;
  styleOptions: TattooStyle[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: (item: TattooPortfolioItem) => void;
  onDeleted: (id: string) => void;
}) {
  const theme = useAppTheme();
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const itemId = item?.id;
  const savedTags = item?.styleTags;
  useEffect(() => {
    setTags(savedTags ?? []);
    // Reset per piece: a background refresh mustn't drop unsaved picks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  if (!item) return null;

  const changed = [...tags].sort().join() !== [...item.styleTags].sort().join();
  const toggle = (id: string) =>
    setTags((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));

  const save = async () => {
    setBusy(true);
    try {
      onSaved(await updateTattooPortfolioItem(item.id, { styleTags: tags }));
    } catch (e) {
      Alert.alert("Couldn't save styles", errorMessage(e, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteTattooPortfolioItem(item.id);
      onDeleted(item.id);
    } catch (e) {
      Alert.alert("Couldn't delete photo", errorMessage(e, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this photo?', "It will be removed from this artist's portfolio. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);

  const hint =
    item.tagsSource === 'ai' ? 'Tagged by AI.' : item.tagsSource === 'owner' ? 'Tagged by the shop.' : 'No styles yet.';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Text style={theme.display(20)}>Portfolio photo</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <SignedPhoto url={item.url} style={[styles.photo, { borderRadius: theme.isEditorial ? 2 : 12 }]} />
          {item.caption ? <Text style={[styles.caption, { color: theme.primaryText }]}>{item.caption}</Text> : null}

          <Text style={[styles.label, { color: theme.secondaryText }]}>Styles</Text>
          <Text style={[styles.hint, { color: theme.secondaryText }]}>{hint}</Text>
          <View style={styles.tags}>
            {canEdit
              ? styleOptions.map((style) => {
                  const active = tags.includes(style.id);
                  return (
                    <Pressable
                      key={style.id}
                      onPress={() => toggle(style.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      style={[
                        styles.tag,
                        { backgroundColor: active ? theme.accent : theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 999 },
                      ]}>
                      <Text style={[styles.tagText, { color: active ? theme.onAccent : theme.accent }]}>{style.label}</Text>
                    </Pressable>
                  );
                })
              : item.styleTags.map((id) => (
                  <View key={id} style={[styles.tag, { backgroundColor: theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 999 }]}>
                    <Text style={[styles.tagText, { color: theme.accent }]}>{styleLabel(id, styleOptions)}</Text>
                  </View>
                ))}
          </View>

          {canEdit ? (
            <View style={styles.actions}>
              <ThemedButton title="Save styles" kind="accent" loading={busy} disabled={!changed} onPress={save} />
              <Pressable onPress={confirmDelete} disabled={busy} style={styles.delete} hitSlop={8}>
                <Text style={[styles.deleteText, { color: iOSColors.red }]}>Delete photo</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  done: { fontSize: 16, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  photo: { width: '100%', aspectRatio: 1 },
  caption: { fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  hint: { fontSize: 13 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { fontSize: 13, fontWeight: '600' },
  actions: { gap: 14, marginTop: 8 },
  delete: { alignItems: 'center', paddingVertical: 8 },
  deleteText: { fontSize: 15, fontWeight: '600' },
});
