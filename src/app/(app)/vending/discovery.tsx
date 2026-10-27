/**
 * Find Vendors — port of VendorDiscoveryView.swift.
 * Live search + category filter + sort + smart-match (inventory-based) over the
 * vendor store. "Nearby Businesses" searches Google Places (key from
 * GET /config/places-key) within 10 miles of the device (expo-location), with
 * its own query field defaulting to the screen's search / category (or the
 * `q` param when opened from an inventory item's "Find Vendors"). Results show
 * rating, address and Call / Website buttons. When the backend returns an empty
 * key, the section is replaced by a one-line note.
 */

import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlacesKey, MILES_TO_METERS, searchPlaces, type Place } from '@/api/places';
import { Icon } from '@/components/icon';
import { ThemedButton } from '@/components/themed';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { VendorListRow } from '@/components/vending/vendor-list-row';
import { useInventory } from '@/context/inventory-store';
import { useVendors } from '@/context/vendor-store';
import type { Vendor } from '@/models/vendor';
import { useAppTheme } from '@/theme/theme-context';

type Sort = 'relevance' | 'rating' | 'newest' | 'leadTime';
const SORT_LABEL: Record<Sort, string> = { relevance: 'Relevance', rating: 'Highest Rated', newest: 'Newest', leadTime: 'Fastest Delivery' };
const NEARBY_RADIUS_MILES = 10;
const DEFAULT_NEARBY_QUERY = 'wholesale supplies';

export default function VendorDiscovery() {
  const theme = useAppTheme();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const vendors = useVendors();
  const inventory = useInventory();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('relevance');
  const [smartMatch, setSmartMatch] = useState(false);
  const [showSort, setShowSort] = useState(false);

  let result: Vendor[] = search.trim()
    ? vendors.searchVendors(search)
    : category
      ? vendors.vendorsInCategory(category)
      : vendors.verifiedVendors;
  result = [...result];
  if (sort === 'rating') result.sort((a, b) => b.averageRating - a.averageRating);
  else if (sort === 'newest') result.sort((a, b) => new Date(b.dateRegistered).getTime() - new Date(a.dateRegistered).getTime());
  else if (sort === 'leadTime') result.sort((a, b) => a.leadTimeDays - b.leadTimeDays);

  const inventoryCategories = [...new Set(inventory.items.map((i) => i.category))];
  const matched = vendors.recommendVendors(inventoryCategories).slice(0, 3);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Icon name="house.fill" size={20} color={theme.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Find Vendors</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.search, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.divider }]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search vendors, suppliers, products..." placeholderTextColor={theme.secondaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Icon name="xmark.circle.fill" size={16} color={theme.secondaryText} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => setSmartMatch((v) => !v)} style={[styles.smart, { backgroundColor: smartMatch ? theme.accentSoft : theme.cardBackground, borderWidth: 1, borderColor: smartMatch ? theme.accent : theme.divider }]}>
            <Icon name="sparkles" size={20} color={smartMatch ? theme.accent : theme.secondaryText} />
          </Pressable>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          <FilterPill label="All" active={category === null} onPress={() => setCategory(null)} />
          {vendors.defaultCategories.slice(0, 8).map((c) => (
            <FilterPill key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
          ))}
        </ScrollView>
        <View style={styles.sortRow}>
          <Pressable onPress={() => setShowSort(true)} style={[styles.sortBtn, { backgroundColor: theme.inputBackground }]}>
            <Icon name="arrow.up.arrow.down" size={12} color={theme.secondaryText} />
            <Text style={[styles.sortText, { color: theme.secondaryText }]}>{SORT_LABEL[sort]}</Text>
          </Pressable>
        </View>

        {/* Smart match */}
        {smartMatch && matched.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Icon name="sparkles" size={16} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Smart Match</Text>
              <View style={styles.flex} />
              <Text style={[styles.sectionNote, { color: theme.secondaryText }]}>Based on your inventory</Text>
            </View>
            {matched.map((v) => (
              <VendorListRow key={v.id} vendor={v} onPress={() => router.push(`/vending/${v.id}`)} />
            ))}
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          </View>
        )}

        {/* Results */}
        {result.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="storefront" size={50} color={theme.tertiaryText} />
            <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No vendors found</Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.resultsHeader, { color: theme.secondaryText }]}>{result.length} vendor{result.length === 1 ? '' : 's'} found</Text>
            {result.map((v) => (
              <VendorListRow key={v.id} vendor={v} onPress={() => router.push(`/vending/${v.id}`)} />
            ))}
          </View>
        )}

        {/* Nearby (Google Places) */}
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        <NearbyBusinesses initialQuery={q?.trim() || undefined} suggestion={search.trim() || category || undefined} />
      </ScrollView>

      <OptionSheet
        visible={showSort}
        title="Sort By"
        options={(Object.keys(SORT_LABEL) as Sort[]).map((s) => ({ label: SORT_LABEL[s], value: s }))}
        selected={sort}
        onSelect={(v) => setSort(v as Sort)}
        onClose={() => setShowSort(false)}
      />
    </SafeAreaView>
  );
}

type KeyState = { status: 'loading' } | { status: 'ready'; key: string } | { status: 'error'; message: string };

function NearbyBusinesses({ initialQuery, suggestion }: { initialQuery?: string; suggestion?: string }) {
  const theme = useAppTheme();
  const [keyState, setKeyState] = useState<KeyState>({ status: 'loading' });
  const [query, setQuery] = useState(initialQuery ?? suggestion ?? DEFAULT_NEARBY_QUERY);
  const edited = useRef(!!initialQuery);
  const autoRan = useRef(false);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);

  const loadKey = () => {
    setKeyState({ status: 'loading' });
    getPlacesKey()
      .then((key) => setKeyState({ status: 'ready', key }))
      .catch((e) => setKeyState({ status: 'error', message: e instanceof Error ? e.message : 'Could not load nearby search.' }));
  };
  useEffect(loadKey, []);

  // Follow the screen's search / category until the user types their own query.
  useEffect(() => {
    if (!edited.current) setQuery(suggestion ?? DEFAULT_NEARBY_QUERY);
  }, [suggestion]);

  const run = async (apiKey: string) => {
    const text = query.trim();
    if (!text) return;
    setSearching(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setLocationBlocked(!perm.canAskAgain);
        if (perm.canAskAgain) Alert.alert('Location needed', 'Allow location access to find businesses near you.');
        return;
      }
      setLocationBlocked(false);
      const pos =
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ??
        (await Location.getLastKnownPositionAsync());
      if (!pos) throw new Error('Could not determine your location. Check that location services are on.');
      const results = await searchPlaces({
        apiKey,
        query: text,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radiusMeters: NEARBY_RADIUS_MILES * MILES_TO_METERS,
      });
      setPlaces(results);
    } catch (e) {
      Alert.alert('Nearby search failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Opened from an inventory item's "Find Vendors": search straight away.
  useEffect(() => {
    if (keyState.status === 'ready' && keyState.key && initialQuery && !autoRan.current) {
      autoRan.current = true;
      run(keyState.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyState]);

  if (keyState.status === 'ready' && !keyState.key) {
    return (
      <View style={[styles.nearbyStub, { backgroundColor: theme.inputBackground }]}>
        <Icon name="location.slash" size={16} color={theme.secondaryText} />
        <Text style={[styles.nearbyText, { color: theme.secondaryText }]}>Nearby business search isn’t turned on for ToolBelt right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.nearby}>
      <View style={[styles.sectionHead, styles.noInset]}>
        <Icon name="location.fill" size={16} color={theme.accent} />
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Nearby Businesses</Text>
        <View style={styles.flex} />
        <Text style={[styles.sectionNote, { color: theme.secondaryText }]}>Within {NEARBY_RADIUS_MILES} miles</Text>
      </View>

      {keyState.status === 'loading' ? (
        <ActivityIndicator color={theme.accent} style={styles.nearbySpinner} />
      ) : keyState.status === 'error' ? (
        <View style={[styles.nearbyStub, styles.noInset, { backgroundColor: theme.inputBackground }]}>
          <Text style={[styles.nearbyText, { color: theme.secondaryText }]}>{keyState.message}</Text>
          <Pressable onPress={loadKey} hitSlop={8}>
            <Text style={[styles.retry, { color: theme.accent }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.nearbyQueryRow}>
            <View style={[styles.search, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.divider }]}>
              <Icon name="mappin.and.ellipse" size={16} color={theme.secondaryText} />
              <TextInput
                value={query}
                onChangeText={(t) => {
                  edited.current = true;
                  setQuery(t);
                }}
                placeholder="What are you looking for?"
                placeholderTextColor={theme.secondaryText}
                returnKeyType="search"
                onSubmitEditing={() => run(keyState.key)}
                style={[styles.searchInput, { color: theme.primaryText }]}
              />
            </View>
          </View>
          <ThemedButton
            title="Search Nearby"
            icon="location.fill"
            onPress={() => run(keyState.key)}
            loading={searching}
            disabled={!query.trim()}
          />

          {locationBlocked && (
            <View style={[styles.nearbyStub, styles.noInset, { backgroundColor: theme.inputBackground }]}>
              <Icon name="location.slash" size={16} color={theme.secondaryText} />
              <Text style={[styles.nearbyText, { color: theme.secondaryText }]}>Location access is off for ToolBelt.</Text>
              <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
                <Text style={[styles.retry, { color: theme.accent }]}>Open Settings</Text>
              </Pressable>
            </View>
          )}

          {places && places.length === 0 && (
            <Text style={[styles.sectionNote, { color: theme.secondaryText }]}>No businesses found nearby for “{query.trim()}”.</Text>
          )}
          {places?.map((p) => <PlaceCard key={p.id} place={p} />)}
        </>
      )}
    </View>
  );
}

function PlaceCard({ place }: { place: Place }) {
  const theme = useAppTheme();
  const closed = place.businessStatus && place.businessStatus !== 'OPERATIONAL';
  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Could not open link', url));
  return (
    <View style={[styles.placeCard, theme.card]}>
      <Text style={[styles.placeName, { color: theme.primaryText }]}>{place.name}</Text>
      {place.rating != null && (
        <View style={styles.placeMeta}>
          <Icon name="star.fill" size={12} color={theme.accent} />
          <Text style={[styles.placeMetaText, { color: theme.secondaryText }]}>
            {place.rating.toFixed(1)}
            {place.ratingCount != null ? ` (${place.ratingCount})` : ''}
          </Text>
          {closed ? <Text style={[styles.placeMetaText, { color: theme.secondaryText }]}>· {place.businessStatus === 'CLOSED_PERMANENTLY' ? 'Permanently closed' : 'Temporarily closed'}</Text> : null}
        </View>
      )}
      {place.address ? <Text style={[styles.placeAddress, { color: theme.secondaryText }]}>{place.address}</Text> : null}
      {(place.phone || place.website) && (
        <View style={styles.placeActions}>
          {place.phone ? (
            <ThemedButton title="Call" icon="phone.fill" kind="quiet" style={styles.placeBtn} onPress={() => open(`tel:${place.phone!.replace(/[^\d+]/g, '')}`)} />
          ) : null}
          {place.website ? (
            <ThemedButton title="Website" icon="globe" kind="quiet" style={styles.placeBtn} onPress={() => open(place.website!)} />
          ) : null}
        </View>
      )}
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.pill, { borderRadius: theme.isEditorial ? 2 : 999, backgroundColor: active ? theme.accent : theme.cardBackground, borderColor: active ? theme.accent : theme.divider }]}>
      <Text style={[styles.pillText, { color: active ? theme.onAccent : theme.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 60 },
  backText: { fontSize: 16, fontWeight: '500' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  body: { paddingBottom: 40, gap: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  smart: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pills: { gap: 8, paddingHorizontal: 20, paddingTop: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '500' },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sortText: { fontSize: 13, fontWeight: '500' },
  section: { gap: 10, paddingHorizontal: 20, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionNote: { fontSize: 12 },
  resultsHeader: { fontSize: 14, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20, marginVertical: 8 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySub: { fontSize: 14 },
  nearbyStub: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginHorizontal: 20 },
  nearbyText: { flex: 1, fontSize: 13 },
  nearby: { gap: 10, paddingHorizontal: 20 },
  noInset: { paddingHorizontal: 0, marginHorizontal: 0 },
  nearbySpinner: { paddingVertical: 20 },
  nearbyQueryRow: { flexDirection: 'row' },
  retry: { fontSize: 13, fontWeight: '600' },
  placeCard: { padding: 14, gap: 6 },
  placeName: { fontSize: 16, fontWeight: '600' },
  placeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  placeMetaText: { fontSize: 13 },
  placeAddress: { fontSize: 13 },
  placeActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  placeBtn: { flex: 1, paddingVertical: 10 },
});
