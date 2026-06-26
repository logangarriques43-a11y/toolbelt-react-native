/**
 * Find Vendors — port of VendorDiscoveryView.swift.
 * Live search + category filter + sort + smart-match (inventory-based) over the
 * seeded vendor store. The Google-Places "Nearby Businesses" section needs native
 * location + a backend and is shown as a stub note.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { VendorListRow } from '@/components/vending/vendor-list-row';
import { useInventory } from '@/context/inventory-store';
import { useVendors } from '@/context/vendor-store';
import { withOpacity } from '@/lib/color';
import type { Vendor } from '@/models/vendor';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Sort = 'relevance' | 'rating' | 'newest' | 'leadTime';
const SORT_LABEL: Record<Sort, string> = { relevance: 'Relevance', rating: 'Highest Rated', newest: 'Newest', leadTime: 'Fastest Delivery' };

export default function VendorDiscovery() {
  const theme = useAppTheme();
  const router = useRouter();
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
          <Icon name="chevron.left" size={16} color={iOSColors.blue} weight="medium" />
          <Text style={[styles.backText, { color: iOSColors.blue }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Find Vendors</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.search, { backgroundColor: theme.cardBackground }]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search vendors, suppliers, products..." placeholderTextColor={theme.secondaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Icon name="xmark.circle.fill" size={16} color={theme.secondaryText} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => setSmartMatch((v) => !v)} style={[styles.smart, { backgroundColor: smartMatch ? withOpacity(iOSColors.orange, 0.15) : theme.cardBackground }]}>
            <Icon name="sparkles" size={20} color={smartMatch ? iOSColors.orange : theme.secondaryText} />
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
          <Pressable onPress={() => setShowSort(true)} style={[styles.sortBtn, { backgroundColor: theme.cardBackground }]}>
            <Icon name="arrow.up.arrow.down" size={12} color={theme.secondaryText} />
            <Text style={[styles.sortText, { color: theme.secondaryText }]}>{SORT_LABEL[sort]}</Text>
          </Pressable>
        </View>

        {/* Smart match */}
        {smartMatch && matched.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Icon name="sparkles" size={16} color={iOSColors.orange} />
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
            <Icon name="storefront" size={50} color={withOpacity(iOSColors.gray, 0.5)} />
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

        {/* Nearby (stub) */}
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        <View style={styles.sectionHead}>
          <Icon name="location.fill" size={16} color={iOSColors.green} />
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Nearby Businesses</Text>
        </View>
        <View style={[styles.nearbyStub, { backgroundColor: withOpacity(iOSColors.orange, 0.08) }]}>
          <Icon name="location.slash" size={16} color={iOSColors.orange} />
          <Text style={[styles.nearbyText, { color: theme.secondaryText }]}>Location-based vendor search (Google Places) needs the native build. Registered vendors are shown above.</Text>
        </View>
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

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: active ? iOSColors.blue : theme.cardBackground, borderColor: active ? 'transparent' : withOpacity(iOSColors.gray, 0.2) }]}>
      <Text style={[styles.pillText, { color: active ? '#FFFFFF' : theme.primaryText }]}>{label}</Text>
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
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
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
});
