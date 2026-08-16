/**
 * Vendor hub — port of VendorDashboardView.swift.
 * Stats, the Vendor Hub action cards (Find Vendors, Register/Edit, My Products,
 * Preview, Send Invoice), inventory-matched recommendations, and recently-added
 * vendors. The admin applications queue + diagnostics are admin-only and omitted;
 * register/edit/my-products land in 6d-ii.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { VendorListRow } from '@/components/vending/vendor-list-row';
import { useInventory } from '@/context/inventory-store';
import { useVendors } from '@/context/vendor-store';
import { withOpacity } from '@/lib/color';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function VendorHub() {
  const theme = useAppTheme();
  const router = useRouter();
  const vendors = useVendors();
  const inventory = useInventory();

  const my = vendors.myVendor;
  const myListings = vendors.vendors.filter((v) => v.ownedByMe).length;
  const inventoryCategories = [...new Set(inventory.items.map((i) => i.category))];
  const recommended = vendors.recommendVendors(inventoryCategories).slice(0, 3);
  const recent = [...vendors.verifiedVendors].sort((a, b) => new Date(b.dateRegistered).getTime() - new Date(a.dateRegistered).getTime()).slice(0, 5);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: theme.primaryText }]}>Vending</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Connect with vendors & suppliers</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="house.fill" size={20} color={iOSColors.blue} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <StatPill value={`${vendors.verifiedVendors.length}`} label="Vendors" color={iOSColors.blue} />
          <StatPill value={`${vendors.allCategories.length}`} label="Categories" color={iOSColors.purple} />
          <StatPill value={`${myListings}`} label="My Listings" color={iOSColors.green} />
        </View>

        {/* Vendor Hub */}
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Vendor Hub</Text>
        <ActionCard icon="magnifyingglass" title="Find Vendors" subtitle="Discover vendors matched to your inventory needs" color={iOSColors.blue} onPress={() => router.push('/vending/discovery')} />
        {my ? (
          <>
            <ActionCard icon="slider.horizontal.3" title="Edit Vending Options" subtitle="Update your public profile, service area, and order details" color={iOSColors.green} onPress={() => router.push('/vending/register')} />
            <ActionCard icon="cube.box.fill" title="My Products" subtitle="Manage the products you sell to other businesses" color={iOSColors.indigo} onPress={() => router.push('/vending/products')} />
            <ActionCard icon="eye.fill" title="Preview My Listing" subtitle="See your page the way buyers see it" color={iOSColors.teal} onPress={() => router.push(`/vending/${my.id}`)} />
            <ActionCard icon="doc.text.fill" title="Send Invoice to a Business" subtitle="Bill a buyer for an order or service" color={iOSColors.purple} onPress={() => router.push('/accounting/create-invoice')} />
          </>
        ) : (
          <ActionCard icon="person.badge.plus" title="Register as a Vendor" subtitle="List your business for other ToolBelt users to find" color={iOSColors.green} onPress={() => router.push('/vending/register')} />
        )}

        {/* Recommended */}
        {recommended.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Icon name="sparkles" size={16} color={iOSColors.orange} />
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Recommended for You</Text>
            </View>
            {recommended.map((v) => (
              <VendorListRow key={v.id} vendor={v} onPress={() => router.push(`/vending/${v.id}`)} />
            ))}
          </View>
        )}

        {/* Recently Added */}
        {recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.recentHead}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Recently Added</Text>
              <Pressable onPress={() => router.push('/vending/discovery')}>
                <Text style={[styles.seeAll, { color: iOSColors.blue }]}>See All</Text>
              </Pressable>
            </View>
            {recent.map((v) => (
              <VendorListRow key={v.id} vendor={v} onPress={() => router.push(`/vending/${v.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ value, label, color }: { value: string; label: string; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.statPill, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text
        style={[styles.statLabel, { color: theme.secondaryText }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}>
        {label}
      </Text>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, color, onPress }: { icon: SFSymbol; title: string; subtitle: string; color: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={[styles.action, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: withOpacity(color, 0.15) }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.actionTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.actionSub, { color: theme.secondaryText }]} numberOfLines={2}>{subtitle}</Text>
      </View>
      <Icon name="chevron.right" size={14} color={theme.secondaryText} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 20, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'stretch' },
  // paddingHorizontal keeps the label off the edges; alignItems:stretch on the
  // row keeps all three the same height (number on top, label cleanly below).
  statPill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 12 },
  // 600 (not 700) so the numbers aren't overly bold — matches iOS.
  statValue: { fontSize: 22, fontWeight: '600' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  section: { gap: 12, marginTop: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 14 },
  actionIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 16, fontWeight: '600' },
  actionSub: { fontSize: 13, marginTop: 4 },
});
