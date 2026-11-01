/**
 * One artist's portfolio. Staff can look; owners add photos, fix styles and
 * delete. Portfolio links are signed too, so they follow the same query rules
 * as request photos. The server's message is shown for a refused upload.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addTattooPortfolioItem, listTattooPortfolio } from '@/api/tattoo';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Fab } from '@/components/fab';
import { ScreenHeader } from '@/components/screen-header';
import { SignedPhoto } from '@/components/signed-photo';
import { PortfolioItemSheet } from '@/components/tattoo/portfolio-item-sheet';
import { ThemedButton } from '@/components/themed';
import { usePermissions } from '@/context/permissions-store';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff-store';
import { SIGNED_LINK_QUERY, tattooKeys, useTattooSettings } from '@/hooks/use-tattoo';
import { errorMessage } from '@/lib/api-client';
import { pickImageBase64 } from '@/lib/pick-image';
import { base64ByteLength, MAX_PORTFOLIO_IMAGE_BYTES, newestFirst } from '@/lib/tattoo';
import type { TattooPortfolioItem } from '@/models/tattoo';
import { useAppTheme } from '@/theme/theme-context';

const COLUMNS = 3;
const GAP = 6;
const SIDE_PADDING = 16;
const UPLOAD_QUALITY = 0.7;

export default function TattooPortfolio() {
  const theme = useAppTheme();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const { uid } = useSession();
  const { role } = usePermissions();
  const { staff } = useStaff();
  const { data: settings } = useTattooSettings();
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const queryKey = tattooKeys.portfolio(uid, staffId);
  const { data, isLoading, error, refetch } = useQuery({
    ...SIGNED_LINK_QUERY,
    queryKey,
    queryFn: () => listTattooPortfolio(staffId),
    enabled: !!uid && !!staffId,
  });

  const items = useMemo(() => newestFirst(data ?? []), [data]);
  const open = items.find((item) => item.id === openId) ?? null;
  const canEdit = role === 'owner';
  const tile = (width - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  const writeItems = (change: (items: TattooPortfolioItem[]) => TattooPortfolioItem[]) =>
    qc.setQueryData<TattooPortfolioItem[]>(queryKey, (current) => change(current ?? []));

  const addPhoto = async () => {
    try {
      const imageBase64 = await pickImageBase64(UPLOAD_QUALITY);
      if (!imageBase64) return;
      if (base64ByteLength(imageBase64) > MAX_PORTFOLIO_IMAGE_BYTES) {
        Alert.alert('Photo too large', 'Choose a photo under 3.5 MB.');
        return;
      }
      setUploading(true);
      const item = await addTattooPortfolioItem({ staffId, imageBase64 });
      writeItems((current) => [item, ...current]);
    } catch (e) {
      Alert.alert("Couldn't add photo", errorMessage(e, 'Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title={staff.find((s) => s.id === staffId)?.name ?? 'Portfolio'} />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error && !data ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: theme.secondaryText }]}>
              {errorMessage(error, "Couldn't load this portfolio.")}
            </Text>
            <ThemedButton title="Try again" kind="quiet" onPress={() => refetch()} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={theme.display(22)}>No photos yet</Text>
            <Text style={[styles.message, { color: theme.secondaryText }]}>
              {canEdit ? "Add this artist's work so requests can be matched by style." : "This artist's work will show up here."}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {items.map((item) => (
              <Pressable key={item.id} onPress={() => setOpenId(item.id)} accessibilityLabel="Open photo">
                <SignedPhoto url={item.url} style={{ width: tile, height: tile, borderRadius: theme.isEditorial ? 2 : 8 }} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {uploading ? (
          <View style={[styles.uploading, theme.card]}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.uploadingText, { color: theme.primaryText }]}>Adding photo…</Text>
          </View>
        ) : canEdit ? (
          <Fab onPress={addPhoto} />
        ) : null}

        <PortfolioItemSheet
          item={open}
          styleOptions={settings?.styles ?? []}
          canEdit={canEdit}
          onClose={() => setOpenId(null)}
          onSaved={(next) => {
            writeItems((current) => current.map((item) => (item.id === next.id ? next : item)));
            setOpenId(null);
          }}
          onDeleted={(id) => {
            writeItems((current) => current.filter((item) => item.id !== id));
            setOpenId(null);
          }}
        />
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { fontSize: 15, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: SIDE_PADDING, paddingBottom: 110 },
  uploading: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  uploadingText: { fontSize: 15, fontWeight: '500' },
});
