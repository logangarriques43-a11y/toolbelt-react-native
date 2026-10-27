/**
 * VendorListRow — shared vendor row (port of VendorListRow in
 * VendorDashboardView.swift), used by the Vendor hub and Discovery.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { vendorInitials, vendorTypeLabel, type Vendor } from '@/models/vendor';
import { useAppTheme } from '@/theme/theme-context';

export function VendorListRow({ vendor, onPress }: { vendor: Vendor; onPress: () => void }) {
  const theme = useAppTheme();
  const verified = vendor.status === 'verified';
  return (
    <Pressable style={[styles.row, theme.card]} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: verified ? theme.accentSoft : theme.inputBackground }]}>
        <Text style={[styles.avatarText, { color: verified ? theme.accent : theme.secondaryText }]}>{vendorInitials(vendor.businessName)}</Text>
      </View>
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={1}>{vendor.businessName}</Text>
          {verified && <Icon name="checkmark.seal.fill" size={12} color={theme.accent} />}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.type, { color: theme.secondaryText }]}>{vendorTypeLabel(vendor.vendorType)}</Text>
          {vendor.totalReviews > 0 && (
            <View style={styles.rating}>
              <Icon name="star.fill" size={10} color={theme.accent} />
              <Text style={[styles.ratingText, { color: theme.secondaryText }]}>{vendor.averageRating.toFixed(1)}</Text>
            </View>
          )}
          {vendor.city.length > 0 && <Text style={[styles.city, { color: theme.tertiaryText }]} numberOfLines={1}>{vendor.city}</Text>}
        </View>
      </View>
      <Icon name="chevron.right" size={12} color={theme.secondaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  type: { fontSize: 12, fontWeight: '500' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '500' },
  city: { fontSize: 12, flexShrink: 1 },
});
