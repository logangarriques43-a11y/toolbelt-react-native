/**
 * Vendor detail — port of VendorDetailView.swift.
 * Profile (favorite, contact, request-quote), supply categories, order details,
 * contact & location, and reviews. Contact/quote use the system mailto:/tel:
 * handlers via Linking (no native mail-composer dependency).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useVendors } from '@/context/vendor-store';
import { withOpacity } from '@/lib/color';
import {
  vendorFullAddress,
  vendorInitials,
  vendorStatusColor,
  vendorStatusLabel,
  vendorTypeIcon,
  vendorTypeLabel,
  type Vendor,
  type VendorReview,
} from '@/models/vendor';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export default function VendorDetail() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendors = useVendors();
  const vendor = vendors.vendorById(id);
  const [showContact, setShowContact] = useState(false);

  if (!vendor) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.missing}>
          <Text style={{ color: theme.secondaryText }}>Vendor not found.</Text>
          <Pressable onPress={() => router.back()}><Text style={{ color: iOSColors.blue, fontWeight: '600' }}>Go Back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const reviews = vendors.reviewsFor(vendor.id);
  const fav = vendors.isFavorite(vendor.id);
  const statusColor = vendorStatusColor(vendor.status);

  const requestQuote = () => {
    if (!vendor.email) return;
    const subject = `Quote request: ${vendor.businessName}`;
    const body = `Hi ${vendor.businessName || 'team'},\n\nI'd like to request a quote. Here's what I'm looking for:\n- [Item / service]\n- [Quantity]\n- [Timing]\n\nCould you share pricing, lead time, and whether it's in stock?\n\nThanks.`;
    Linking.openURL(`mailto:${vendor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Icon name="chevron.left" size={16} color={iOSColors.blue} weight="medium" />
            <Text style={[styles.backText, { color: iOSColors.blue }]}>Back</Text>
          </Pressable>
          <Pressable onPress={() => vendors.toggleFavorite(vendor.id)} hitSlop={8}>
            <Icon name={fav ? 'star.fill' : 'star'} size={20} color={iOSColors.orange} weight="semibold" />
          </Pressable>
        </View>

        {/* Profile card */}
        <View style={[styles.card, styles.profile, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <View style={[styles.avatar, { backgroundColor: withOpacity(iOSColors.blue, 0.15) }]}>
            <Text style={[styles.avatarText, { color: iOSColors.blue }]}>{vendorInitials(vendor.businessName)}</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.primaryText }]}>{vendor.businessName}</Text>
            {vendor.status === 'verified' && <Icon name="checkmark.seal.fill" size={16} color={iOSColors.blue} />}
          </View>
          <View style={styles.typeRow}>
            <Icon name={vendorTypeIcon(vendor.vendorType)} size={13} color={theme.secondaryText} />
            <Text style={[styles.typeText, { color: theme.secondaryText }]}>{vendorTypeLabel(vendor.vendorType)}</Text>
          </View>
          {vendor.totalReviews > 0 && (
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Icon key={s} name={s <= vendor.averageRating ? 'star.fill' : 'star'} size={16} color={iOSColors.orange} />
              ))}
              <Text style={[styles.starCount, { color: theme.secondaryText }]}>({vendor.totalReviews})</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: withOpacity(statusColor, 0.1) }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{vendorStatusLabel(vendor.status)}</Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={() => setShowContact(true)} style={[styles.primaryBtn, { backgroundColor: iOSColors.blue }]}>
              <Icon name="envelope.fill" size={14} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Contact</Text>
            </Pressable>
            <Pressable onPress={requestQuote} disabled={!vendor.email} style={[styles.secondaryBtn, { backgroundColor: withOpacity(iOSColors.blue, 0.1) }]}>
              <Icon name="doc.text.below.ecg" size={14} color={iOSColors.blue} />
              <Text style={[styles.secondaryBtnText, { color: iOSColors.blue }]}>Request Quote</Text>
            </Pressable>
          </View>
        </View>

        {/* Categories */}
        {vendor.categories.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Supply Categories</Text>
            <View style={styles.chips}>
              {vendor.categories.map((c) => (
                <View key={c} style={[styles.chip, { backgroundColor: withOpacity(iOSColors.blue, 0.1) }]}>
                  <Text style={[styles.chipText, { color: iOSColors.blue }]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Order details */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Order Details</Text>
          {vendor.descriptionText.length > 0 && <Text style={[styles.desc, { color: theme.secondaryText }]}>{vendor.descriptionText}</Text>}
          <DetailRow icon="dollarsign.circle" label="Minimum Order" value={vendor.minimumOrderAmount > 0 ? `$${vendor.minimumOrderAmount.toFixed(2)}` : 'No minimum'} />
          <DetailRow icon="clock.fill" label="Lead Time" value={`${vendor.leadTimeDays} day${vendor.leadTimeDays === 1 ? '' : 's'}`} />
          <DetailRow icon="shippingbox.fill" label="Shipping" value={vendor.shippingInfo || 'Contact for details'} />
          <DetailRow icon="arrow.uturn.left.circle" label="Returns" value={vendor.acceptsReturns ? 'Accepted' : 'Not accepted'} />
        </View>

        {/* Contact & location */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Contact & Location</Text>
          {vendor.contactName.length > 0 && <DetailRow icon="person.fill" label="Contact" value={vendor.contactName} />}
          {vendor.email.length > 0 && <DetailRow icon="envelope.fill" label="Email" value={vendor.email} />}
          {vendor.phoneNumber.length > 0 && <DetailRow icon="phone.fill" label="Phone" value={vendor.phoneNumber} />}
          {vendor.website.length > 0 && <DetailRow icon="globe" label="Website" value={vendor.website} />}
          {vendorFullAddress(vendor).length > 0 && <DetailRow icon="mappin.circle.fill" label="Address" value={vendorFullAddress(vendor)} />}
        </View>

        {/* Reviews */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <View style={styles.reviewsHead}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Reviews</Text>
            <Text style={[styles.reviewCount, { color: theme.secondaryText }]}>{reviews.length}</Text>
          </View>
          {reviews.length === 0 ? (
            <Text style={[styles.noReviews, { color: theme.secondaryText }]}>No reviews yet</Text>
          ) : (
            reviews.slice(0, 5).map((r) => <ReviewRow key={r.id} review={r} />)
          )}
        </View>
      </ScrollView>

      <ContactSheet vendor={vendor} visible={showContact} onClose={() => setShowContact(false)} />
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: SFSymbol; label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={15} color={iOSColors.blue} />
      <View style={styles.flex}>
        <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.primaryText }]}>{value}</Text>
      </View>
    </View>
  );
}

function ReviewRow({ review }: { review: VendorReview }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.review, { backgroundColor: theme.background }]}>
      <View style={styles.reviewTop}>
        <Text style={[styles.reviewer, { color: theme.primaryText }]}>{review.reviewerName || 'Anonymous'}</Text>
        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Icon key={s} name={s <= review.rating ? 'star.fill' : 'star'} size={11} color={iOSColors.orange} />
          ))}
        </View>
      </View>
      {review.comment.length > 0 && <Text style={[styles.reviewComment, { color: theme.secondaryText }]}>{review.comment}</Text>}
      <Text style={[styles.reviewDate, { color: theme.tertiaryText }]}>{dateFmt.format(new Date(review.datePosted))}</Text>
    </View>
  );
}

function ContactSheet({ vendor, visible, onClose }: { vendor: Vendor; visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const options: { icon: SFSymbol; label: string; value: string; color: string; url: string }[] = [];
  if (vendor.email) options.push({ icon: 'envelope.fill', label: 'Email', value: vendor.email, color: iOSColors.blue, url: `mailto:${vendor.email}` });
  if (vendor.phoneNumber) options.push({ icon: 'phone.fill', label: 'Phone', value: vendor.phoneNumber, color: iOSColors.green, url: `tel:${vendor.phoneNumber.replace(/[^0-9+]/g, '')}` });
  if (vendor.website) options.push({ icon: 'globe', label: 'Website', value: vendor.website, color: iOSColors.purple, url: vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}` });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <Text style={[styles.sheetTitle, { color: theme.primaryText }]}>Contact {vendor.businessName}</Text>
        <View style={styles.sheetOptions}>
          {options.map((o) => (
            <Pressable key={o.label} onPress={() => Linking.openURL(o.url)} style={[styles.contactOption, { backgroundColor: theme.background }]}>
              <View style={[styles.contactIcon, { backgroundColor: withOpacity(o.color, 0.1) }]}>
                <Icon name={o.icon} size={20} color={o.color} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>{o.label}</Text>
                <Text style={[styles.contactValue, { color: theme.primaryText }]}>{o.value}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  body: { paddingBottom: 40, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 16, fontWeight: '500' },
  card: { borderRadius: 16, padding: 16, marginHorizontal: 20, gap: 12 },
  profile: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: '700' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeText: { fontSize: 14, fontWeight: '500' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starCount: { fontSize: 14, marginLeft: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', paddingHorizontal: 4, marginTop: 4 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '500' },
  desc: { fontSize: 14, lineHeight: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '500' },
  detailValue: { fontSize: 14, marginTop: 2 },
  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewCount: { fontSize: 14, fontWeight: '500' },
  noReviews: { fontSize: 14, paddingVertical: 8 },
  review: { padding: 12, borderRadius: 10, gap: 8 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewer: { fontSize: 14, fontWeight: '600' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13 },
  reviewDate: { fontSize: 11 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 16 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.4)' },
  sheetTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sheetOptions: { gap: 12 },
  contactOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12 },
  contactIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactValue: { fontSize: 15, marginTop: 2 },
});
