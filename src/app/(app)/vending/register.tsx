/**
 * Vendor registration / edit — port of VendorRegistrationView.swift (+ the same
 * form drives VendorEditView). If the user already has a listing it prefills and
 * saves edits (updateVendor); otherwise it creates a pending listing
 * (registerVendor). Address geocoding for radius filtering is native and skipped.
 */

import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useVendors } from '@/context/vendor-store';
import { withOpacity } from '@/lib/color';
import { DEFAULT_VENDOR_CATEGORIES, VENDOR_TYPES, type VendorType } from '@/models/vendor';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function VendorRegister() {
  const theme = useAppTheme();
  const router = useRouter();
  const vendors = useVendors();
  const existing = vendors.myVendor;
  const editing = existing != null;

  const [businessName, setBusinessName] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [vendorType, setVendorType] = useState<VendorType>('supplier');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [shipsNationwide, setShipsNationwide] = useState(true);
  const [shipsRadiusMiles, setShipsRadiusMiles] = useState('');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('');
  const [shippingInfo, setShippingInfo] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [acceptsReturns, setAcceptsReturns] = useState(true);

  useEffect(() => {
    if (!existing) return;
    setBusinessName(existing.businessName);
    setDescriptionText(existing.descriptionText);
    setVendorType(existing.vendorType);
    setContactName(existing.contactName);
    setEmail(existing.email);
    setPhoneNumber(existing.phoneNumber);
    setWebsite(existing.website);
    setCategories(existing.categories);
    setAddressLine1(existing.addressLine1);
    setAddressLine2(existing.addressLine2);
    setCity(existing.city);
    setStateField(existing.state);
    setZipCode(existing.zipCode);
    setShipsNationwide(existing.shipsNationwide);
    setShipsRadiusMiles(existing.shipsRadiusMiles ? String(existing.shipsRadiusMiles) : '');
    setMinimumOrderAmount(existing.minimumOrderAmount ? String(existing.minimumOrderAmount) : '');
    setShippingInfo(existing.shippingInfo);
    setLeadTimeDays(String(existing.leadTimeDays));
    setAcceptsReturns(existing.acceptsReturns);
  }, [existing]);

  const toggleCategory = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const isValid = businessName.trim().length > 0 && email.trim().length > 0 && categories.length > 0;

  const submit = () => {
    const name = businessName.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (name.length < 2) return Alert.alert('Registration Error', 'Business name must be at least 2 characters.');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) return Alert.alert('Registration Error', 'Please enter a valid email address.');

    const radius = Number(shipsRadiusMiles);
    const nationwide = shipsNationwide || !(radius > 0);
    const fields = {
      businessName: name,
      contactName: contactName.trim(),
      email: cleanEmail,
      phoneNumber: phoneNumber.trim(),
      website: website.trim(),
      vendorType,
      categories,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: stateField.trim().toUpperCase(),
      zipCode: zipCode.trim(),
      country: 'US',
      descriptionText: descriptionText.trim(),
      minimumOrderAmount: Number(minimumOrderAmount) || 0,
      shippingInfo: shippingInfo.trim(),
      leadTimeDays: parseInt(leadTimeDays, 10) || 3,
      acceptsReturns,
      shipsNationwide: nationwide,
      shipsRadiusMiles: nationwide ? undefined : radius,
    };

    if (editing && existing) {
      vendors.updateVendor({ ...existing, ...fields });
      Alert.alert('Changes Saved', 'Your vendor listing has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      vendors.registerVendor(fields);
      Alert.alert('Registration Submitted', "Your vendor listing has been submitted for review. You'll be notified once it's verified.", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Icon name="chevron.left" size={16} color={iOSColors.blue} weight="medium" />
          <Text style={[styles.backText, { color: iOSColors.blue }]}>Back</Text>
        </Pressable>
        <View style={styles.flex} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.intro}>
          <Icon name="storefront.fill" size={40} color={iOSColors.green} />
          <Text style={[styles.introTitle, { color: theme.primaryText }]}>{editing ? 'Edit Your Listing' : 'Register Your Business'}</Text>
          <Text style={[styles.introSub, { color: theme.secondaryText }]}>Make your products discoverable to small businesses on ToolBelt</Text>
        </View>

        {/* Business info */}
        <Section title="Business Information">
          <Field label="Business Name" value={businessName} onChangeText={setBusinessName} placeholder="Your company name" />
          <Field label="Description" value={descriptionText} onChangeText={setDescriptionText} placeholder="What products or services do you offer?" multiline />
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Vendor Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
            {VENDOR_TYPES.map((t) => {
              const active = vendorType === t.type;
              return (
                <Pressable key={t.type} onPress={() => setVendorType(t.type)} style={[styles.typePill, { backgroundColor: active ? iOSColors.blue : theme.background, borderColor: active ? 'transparent' : withOpacity(iOSColors.gray, 0.3) }]}>
                  <Icon name={t.icon} size={14} color={active ? '#FFFFFF' : theme.primaryText} />
                  <Text style={[styles.typeText, { color: active ? '#FFFFFF' : theme.primaryText }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Section>

        {/* Contact */}
        <Section title="Contact Information">
          <Field label="Contact Name" value={contactName} onChangeText={setContactName} placeholder="Primary contact person" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="business@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="(555) 123-4567" keyboardType="phone-pad" />
          <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://yourwebsite.com" autoCapitalize="none" />
        </Section>

        {/* Categories */}
        <Section title="Supply Categories">
          <Text style={[styles.hint, { color: theme.secondaryText }]}>Select all that apply to your products</Text>
          <View style={styles.catGrid}>
            {DEFAULT_VENDOR_CATEGORIES.map((c) => {
              const active = categories.includes(c);
              return (
                <Pressable key={c} onPress={() => toggleCategory(c)} style={[styles.catCell, { backgroundColor: active ? withOpacity(iOSColors.blue, 0.08) : theme.background }]}>
                  <Icon name={active ? 'checkmark.circle.fill' : 'circle'} size={16} color={active ? iOSColors.blue : theme.secondaryText} />
                  <Text style={[styles.catText, { color: theme.primaryText }]} numberOfLines={1}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Location */}
        <Section title="Location">
          <Field label="Address Line 1" value={addressLine1} onChangeText={setAddressLine1} placeholder="Street address" />
          <Field label="Address Line 2" value={addressLine2} onChangeText={setAddressLine2} placeholder="Suite, unit, etc. (optional)" />
          <View style={styles.cityRow}>
            <View style={styles.flex}>
              <Field label="City" value={city} onChangeText={setCity} placeholder="City" />
            </View>
            <View style={styles.stateField}>
              <Field label="State" value={stateField} onChangeText={setStateField} placeholder="ST" autoCapitalize="characters" />
            </View>
          </View>
          <Field label="ZIP Code" value={zipCode} onChangeText={setZipCode} placeholder="12345" keyboardType="number-pad" />
        </Section>

        {/* Shipping area */}
        <Section title="Shipping Area">
          <View style={styles.toggleRow}>
            <View style={styles.flex}>
              <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>Ships nationwide</Text>
              <Text style={[styles.toggleSub, { color: theme.secondaryText }]}>Visible to every business in the US, regardless of distance.</Text>
            </View>
            <Switch value={shipsNationwide} onValueChange={setShipsNationwide} />
          </View>
          {!shipsNationwide && (
            <>
              <Field label="Delivery radius (miles)" value={shipsRadiusMiles} onChangeText={(t) => setShipsRadiusMiles(t.replace(/[^0-9]/g, ''))} placeholder="e.g. 50" keyboardType="number-pad" />
              <Text style={[styles.hint, { color: theme.secondaryText }]}>Only businesses within this radius of your address will see your listing.</Text>
            </>
          )}
        </Section>

        {/* Order details */}
        <Section title="Order Details">
          <Field label="Minimum Order ($)" value={minimumOrderAmount} onChangeText={(t) => setMinimumOrderAmount(t.replace(/[^0-9.]/g, ''))} placeholder="0.00" keyboardType="decimal-pad" />
          <Field label="Shipping Info" value={shippingInfo} onChangeText={setShippingInfo} placeholder="Free shipping over $100, etc." />
          <Field label="Lead Time (days)" value={leadTimeDays} onChangeText={(t) => setLeadTimeDays(t.replace(/[^0-9]/g, ''))} placeholder="3" keyboardType="number-pad" />
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleTitle, styles.flex, { color: theme.primaryText }]}>Accepts Returns</Text>
            <Switch value={acceptsReturns} onValueChange={setAcceptsReturns} />
          </View>
        </Section>

        <Pressable onPress={submit} disabled={!isValid} style={[styles.submit, { backgroundColor: isValid ? iOSColors.blue : iOSColors.gray }]}>
          <Icon name="checkmark.shield.fill" size={16} color="#FFFFFF" />
          <Text style={styles.submitText}>{editing ? 'Save Changes' : 'Submit for Verification'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: import('react').ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & ComponentProps<typeof TextInput>) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={theme.secondaryText}
        style={[multiline ? styles.inputMultiline : styles.input, { backgroundColor: theme.background, color: theme.primaryText, borderColor: withOpacity(iOSColors.gray, 0.2) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 16, fontWeight: '500' },
  body: { padding: 20, gap: 20, paddingBottom: 40 },
  intro: { alignItems: 'center', gap: 8 },
  introTitle: { fontSize: 22, fontWeight: '700' },
  introSub: { fontSize: 14, textAlign: 'center' },
  section: { borderRadius: 14, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  input: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, fontSize: 15 },
  inputMultiline: { minHeight: 80, padding: 10, borderRadius: 10, borderWidth: 1, fontSize: 15, textAlignVertical: 'top' },
  typeRow: { gap: 10 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeText: { fontSize: 13, fontWeight: '500' },
  hint: { fontSize: 13 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCell: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  catText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  cityRow: { flexDirection: 'row', gap: 12 },
  stateField: { width: 90 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '500' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
