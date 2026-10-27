/**
 * Online Booking — port of OnlineBookingView.swift: the business's public
 * booking website (https://api.toolbelt.tools/book/<slug>).
 *
 * Loads GET /booking-page. With no slug yet it shows the one-tap setup wizard
 * (business name → URL preview, brand colour, font, "Create My Website"),
 * which publishes the page live with the online-bookable services, active
 * staff and the device timezone.
 *
 * Once set up it's the management screen: live toggle, booking link (copy /
 * Edit URL), Website Appearance (name, welcome, brand colours, logo, font,
 * advance booking, minimum notice), Bookable Services, Require Deposit (only
 * once Stripe payouts are approved), the SMS-consent QR, and copy / share /
 * preview actions. Appearance and service edits collect in a local draft;
 * the sticky "Apply Changes to Site" bar pushes them (config + services +
 * staff + timezone) in one POST. The live toggle, URL and logo apply
 * immediately, like iOS. Server errors (e.g. the 409 "URL already taken")
 * are shown verbatim.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  bookableServices,
  bookingURL,
  consentURL,
  deviceTimezone,
  getBookingPage,
  payoutsApproved,
  PUBLIC_HOST,
  pushBookingPage,
  slugify,
  toServiceDTO,
  toStaffDTOs,
  uploadBookingLogo,
  type BookingPageConfig,
  type BookingPagePush,
} from '@/api/booking-page';
import { BrandColorPicker, FontStylePicker } from '@/components/booking/appearance-pickers';
import { ServicesSheet, SlugSheet, Toast } from '@/components/booking/booking-sheets';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ScreenHeader } from '@/components/screen-header';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { ConsentQRCard } from '@/components/sms/consent-qr-card';
import { ThemedButton, ThemedIconTile, ThemedSectionHeader } from '@/components/themed';
import { useServices } from '@/context/services-store';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff-store';
import { ApiError } from '@/lib/api-client';
import { priceDisplay } from '@/models/service';
import { useAppTheme } from '@/theme/theme-context';

const QUERY_KEY = ['booking-page'] as const;
const ADVANCE_OPTIONS = [7, 14, 30, 60, 90].map((d) => ({ label: `${d} days`, value: d }));
const NOTICE_OPTIONS = [1, 2, 4, 12, 24, 48].map((h) => ({ label: `${h} hour${h === 1 ? '' : 's'}`, value: h }));
const DEPOSIT_OPTIONS = [25, 50, 75, 100];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const errMsg = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

export default function OnlineBooking() {
  const theme = useAppTheme();
  const qc = useQueryClient();
  const { data: saved, isLoading, error, refetch } = useQuery({ queryKey: QUERY_KEY, queryFn: getBookingPage });
  const { services, isLoading: servicesLoading } = useServices();
  const { staff, isLoading: staffLoading } = useStaff();

  const isSetUp = !!saved?.slug;

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title={saved && !isSetUp ? 'Create Booking Page' : 'Online Booking'} />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error || !saved ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: theme.secondaryText }]}>
              {errMsg(error, "Couldn't load your booking page.")}
            </Text>
            <ThemedButton title="Try Again" kind="quiet" onPress={() => refetch()} />
          </View>
        ) : (
          <BookingContent
            key={isSetUp ? 'manage' : 'setup'}
            saved={saved}
            setSaved={(c) => qc.setQueryData(QUERY_KEY, c)}
            services={services}
            servicesReady={!servicesLoading && !staffLoading}
            staff={staff}
          />
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

type ContentProps = {
  saved: BookingPageConfig;
  setSaved: (c: BookingPageConfig) => void;
  services: ReturnType<typeof useServices>['services'];
  servicesReady: boolean;
  staff: ReturnType<typeof useStaff>['staff'];
};

function BookingContent(props: ContentProps) {
  const { saved, services, staff } = props;

  /** Full publish: config + the published services + active staff + timezone. */
  const fullPush = (config: BookingPageConfig) => {
    const body: BookingPagePush = {
      ...config,
      services: bookableServices(services, config.enabledServiceIds).map(toServiceDTO),
      staffMembers: toStaffDTOs(staff),
      timezone: deviceTimezone(),
    };
    return pushBookingPage(body);
  };

  return saved.slug ? <ManageView {...props} fullPush={fullPush} /> : <SetupWizard {...props} fullPush={fullPush} />;
}

// ============================================================
// Setup wizard (one-tap create)
// ============================================================

function SetupWizard({
  saved,
  setSaved,
  services,
  fullPush,
}: ContentProps & { fullPush: (c: BookingPageConfig) => Promise<BookingPageConfig> }) {
  const theme = useAppTheme();
  const { account } = useSession();
  const [name, setName] = useState(account?.businessName || saved.businessName || '');
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [colors, setColors] = useState({
    accentColorHex: saved.accentColorHex,
    secondaryColorHex: saved.secondaryColorHex,
    tertiaryColorHex: saved.tertiaryColorHex,
    colorMode: saved.colorMode,
  });
  const [font, setFont] = useState(saved.fontFamily);
  const [creating, setCreating] = useState(false);
  const [editSlug, setEditSlug] = useState(false);

  const trimmed = name.trim();
  const slug = slugOverride ?? slugify(trimmed);
  const onlineCount = services.filter((s) => s.availableForOnlineBooking).length;

  const create = async () => {
    if (!trimmed || !slug) return;
    setCreating(true);
    try {
      const result = await fullPush({
        ...saved,
        ...colors,
        fontFamily: font,
        slug,
        businessName: trimmed,
        welcomeMessage: `Book your appointment with ${trimmed} — fast & easy!`,
        requireDeposit: false,
        depositPercent: 50,
        isEnabled: true,
      });
      setSaved(result);
    } catch (e) {
      const conflict = e instanceof ApiError && e.status === 409;
      Alert.alert(conflict ? 'URL Taken' : "Couldn't Create Website", errMsg(e, 'Please try again.'), [
        ...(conflict ? [{ text: 'Edit URL', onPress: () => setEditSlug(true) }] : []),
        { text: 'OK' },
      ]);
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAwareForm contentContainerStyle={styles.body}>
      <View style={styles.hero}>
        <ThemedIconTile name="globe" size={88} filled />
        <Text style={[theme.display(24), styles.centerText]}>Let clients book online</Text>
        <Text style={[styles.heroSub, { color: theme.secondaryText }]}>
          Create a booking website in seconds. Clients can pick a service, choose a time, and book — no app needed.
        </Text>
      </View>

      <View style={[styles.card, theme.card]}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>Your business name</Text>
        <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 12 }]}>
          <Icon name="building.2.fill" size={18} color={theme.accent} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jane's Salon"
            placeholderTextColor={theme.tertiaryText}
            style={[styles.input, { color: theme.primaryText }]}
          />
        </View>
        {slug ? (
          <Pressable style={styles.urlPreview} onPress={() => setEditSlug(true)}>
            <Icon name="link" size={13} color={theme.accent} />
            <Text style={[styles.urlText, { color: theme.accent }]} numberOfLines={1}>
              {PUBLIC_HOST.replace('https://', '')}/book/{slug}
            </Text>
            <Icon name="pencil" size={13} color={theme.secondaryText} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Brand colour</Text>
        <BrandColorPicker value={colors} onChange={setColors} />
      </View>

      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Font style</Text>
        <FontStylePicker value={font} onChange={setFont} />
      </View>

      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>What you&apos;ll get</Text>
        {(
          [
            ['globe', 'A shareable booking link for your clients'],
            ['calendar.badge.clock', 'Automatic availability based on your schedule'],
            ['list.bullet.rectangle', `${onlineCount} service${onlineCount === 1 ? '' : 's'} available for booking`],
            ['bell.fill', 'Instant notifications for new bookings'],
          ] as const
        ).map(([icon, text]) => (
          <View key={icon} style={styles.getRow}>
            <Icon name={icon} size={15} color={theme.accent} />
            <Text style={[styles.getText, { color: theme.secondaryText }]}>{text}</Text>
          </View>
        ))}
      </View>

      <ThemedButton
        title="Create My Website"
        kind="inverse"
        icon="wand.and.stars"
        loading={creating}
        disabled={!trimmed || !slug}
        onPress={create}
      />
      <Text style={[styles.note, { color: theme.secondaryText }]}>Free to create. You can customise everything later.</Text>

      <SlugSheet
        visible={editSlug}
        initial={slug}
        onClose={() => setEditSlug(false)}
        onSave={async (s) => {
          setSlugOverride(s);
          return null;
        }}
      />
    </KeyboardAwareForm>
  );
}

// ============================================================
// Management screen
// ============================================================

function ManageView({
  saved,
  setSaved,
  services,
  servicesReady,
  staff,
  fullPush,
}: ContentProps & { fullPush: (c: BookingPageConfig) => Promise<BookingPageConfig> }) {
  const theme = useAppTheme();
  const router = useRouter();

  const [draft, setDraft] = useState<BookingPageConfig>(saved);
  const [applying, setApplying] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [sheet, setSheet] = useState<'slug' | 'services' | 'advance' | 'notice' | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onlineServices = useMemo(() => services.filter((s) => s.availableForOnlineBooking), [services]);

  // iOS stored local UUIDs in enabledServiceIds; drop ids that match no
  // backend service. If none survive, the old pick is unusable → All Services.
  useEffect(() => {
    if (!servicesReady || saved.enabledServiceIds.length === 0) return;
    const known = saved.enabledServiceIds.filter((id) => services.some((s) => s.id === id));
    if (known.length !== saved.enabledServiceIds.length) {
      setDraft((d) => ({ ...d, enabledServiceIds: known }));
    }
    // Only on first load of services.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesReady]);

  const payouts = useQuery({
    queryKey: ['stripe-connect', 'payouts-approved'],
    queryFn: payoutsApproved,
    retry: false,
  });
  // A failed status check (offline, 2FA gate) reads as "not set up yet".
  const approved = payouts.isError ? false : payouts.data;

  // Like iOS's onAppear push: refresh the published services/staff/timezone
  // once both lists have loaded, without touching the config itself.
  const synced = useRef(false);
  useEffect(() => {
    if (!servicesReady || synced.current) return;
    synced.current = true;
    const ids = saved.enabledServiceIds.filter((id) => services.some((s) => s.id === id));
    pushBookingPage({
      services: bookableServices(services, ids).map(toServiceDTO),
      staffMembers: toStaffDTOs(staff),
      timezone: deviceTimezone(),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesReady]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const link = bookingURL(saved.slug);
  const shown = bookableServices(services, draft.enabledServiceIds);
  const set = <K extends keyof BookingPageConfig>(key: K, value: BookingPageConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const showToast = (message: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), error ? 6000 : 2200);
  };
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  /** Apply one field immediately (live toggle / URL / logo), keeping other draft edits pending. */
  const quickPush = async (patch: Partial<BookingPageConfig>) => {
    const result = await pushBookingPage(patch);
    setSaved(result);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const apply = async () => {
    setApplying(true);
    try {
      const result = await fullPush(draft);
      setSaved(result);
      setDraft(result);
      showToast('Site updated!');
    } catch (e) {
      showToast(errMsg(e, "Couldn't update — check your connection"), true);
    } finally {
      setApplying(false);
    }
  };

  const toggleLive = async (on: boolean) => {
    setTogglingLive(true);
    try {
      await quickPush({ isEnabled: on });
    } catch (e) {
      Alert.alert("Couldn't Update", errMsg(e, 'Please try again.'));
    } finally {
      setTogglingLive(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    showToast('Link copied!');
  };

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos Access Needed', 'Allow photo access in Settings to upload a logo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset?.base64) return;
    if (asset.base64.length * 0.75 > MAX_LOGO_BYTES) {
      Alert.alert('Image Too Large', 'Choose a logo under 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const contentType = asset.mimeType?.startsWith('image/') ? asset.mimeType : 'image/jpeg';
      const url = await uploadBookingLogo(asset.base64, contentType);
      await quickPush({ logoURL: url });
      showToast('Logo updated!');
    } catch (e) {
      Alert.alert("Couldn't Upload Logo", errMsg(e, 'Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () =>
    Alert.alert('Remove logo?', 'Your booking page will show your business name instead.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploading(true);
          try {
            await quickPush({ logoURL: null });
          } catch (e) {
            Alert.alert("Couldn't Remove Logo", errMsg(e, 'Please try again.'));
          } finally {
            setUploading(false);
          }
        },
      },
    ]);

  const depositAllowed = approved === true;

  return (
    <View style={styles.flex}>
      <KeyboardAwareForm contentContainerStyle={[styles.body, styles.bodyWithBar]}>
        {/* Status */}
        <View style={[styles.card, styles.statusRow, theme.card]}>
          <ThemedIconTile name="globe" size={48} filled={saved.isEnabled} />
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
              {saved.isEnabled ? 'Booking Page Live' : 'Booking Page Offline'}
            </Text>
            <Text style={[styles.sub, { color: theme.secondaryText }]}>
              {saved.isEnabled ? 'Clients can book appointments online' : 'Turn on to let clients book online'}
            </Text>
          </View>
          {togglingLive ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <Switch
              value={saved.isEnabled}
              onValueChange={toggleLive}
              trackColor={{ true: theme.live, false: theme.inputBackground }}
            />
          )}
        </View>

        {/* Booking link */}
        <View style={[styles.card, theme.card]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Your Booking Link</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 12 }]}>
            <Icon name="link" size={16} color={theme.accent} />
            <Text style={[styles.linkText, { color: theme.primaryText }]} numberOfLines={1} ellipsizeMode="middle">
              {link}
            </Text>
            <Pressable onPress={copyLink} hitSlop={8} accessibilityLabel="Copy booking link">
              <Icon name="doc.on.doc" size={18} color={theme.accent} />
            </Pressable>
          </View>
          <Pressable onPress={() => setSheet('slug')} style={styles.inlineAction}>
            <Icon name="pencil" size={14} color={theme.accent} />
            <Text style={[styles.inlineActionText, { color: theme.accent }]}>Edit URL</Text>
          </Pressable>
        </View>

        {/* Appearance */}
        <ThemedSectionHeader title="Website Appearance" />
        <View style={[styles.card, theme.card]}>
          <Field label="Business Name">
            <TextInput
              value={draft.businessName}
              onChangeText={(t) => set('businessName', t)}
              placeholder="Your business name"
              placeholderTextColor={theme.tertiaryText}
              style={[styles.field, { backgroundColor: theme.inputBackground, color: theme.primaryText, borderRadius: theme.isEditorial ? 2 : 10 }]}
            />
          </Field>
          <Divider />
          <Field label="Welcome Message">
            <TextInput
              value={draft.welcomeMessage}
              onChangeText={(t) => set('welcomeMessage', t)}
              placeholder="Welcome message"
              placeholderTextColor={theme.tertiaryText}
              multiline
              style={[styles.field, styles.multiline, { backgroundColor: theme.inputBackground, color: theme.primaryText, borderRadius: theme.isEditorial ? 2 : 10 }]}
            />
          </Field>
          <Divider />
          <Field label="Brand Colours">
            <BrandColorPicker value={draft} onChange={(c) => setDraft((d) => ({ ...d, ...c }))} />
          </Field>
          <Divider />
          <Field label="Logo">
            <View style={styles.logoRow}>
              <View style={[styles.logoBox, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 12 }]}>
                {saved.logoURL ? (
                  <Image source={{ uri: saved.logoURL }} style={styles.logoImg} contentFit="contain" />
                ) : (
                  <Icon name="photo.fill" size={22} color={theme.tertiaryText} />
                )}
              </View>
              <View style={styles.logoActions}>
                <ThemedButton
                  title={saved.logoURL ? 'Replace Logo' : 'Upload Logo'}
                  kind="quiet"
                  icon="square.and.arrow.up"
                  loading={uploading}
                  onPress={pickLogo}
                  style={styles.smallBtn}
                />
                {saved.logoURL && !uploading ? (
                  <Pressable onPress={removeLogo} hitSlop={6}>
                    <Text style={[styles.removeText, { color: theme.secondaryText }]}>Remove logo</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Field>
          <Divider />
          <Field label="Font Style">
            <FontStylePicker value={draft.fontFamily} onChange={(f) => set('fontFamily', f)} />
          </Field>
          <Divider />
          <PickerRow
            title="Advance Booking"
            subtitle="How far ahead clients can book"
            value={`${draft.maxAdvanceDays} days`}
            onPress={() => setSheet('advance')}
          />
          <Divider />
          <PickerRow
            title="Minimum Notice"
            subtitle="Lead time before a booking"
            value={NOTICE_OPTIONS.find((o) => o.value === draft.minLeadTimeHours)?.label ?? `${draft.minLeadTimeHours} hours`}
            onPress={() => setSheet('notice')}
          />
        </View>

        {/* Services */}
        <View style={[styles.card, theme.card]}>
          <View style={styles.cardHeadRow}>
            <Text style={[styles.cardTitle, styles.flex, { color: theme.primaryText }]}>Bookable Services</Text>
            <Pressable onPress={() => setSheet('services')} style={styles.inlineAction} hitSlop={8}>
              <Icon name="slider.horizontal.3" size={14} color={theme.accent} />
              <Text style={[styles.inlineActionText, { color: theme.accent }]}>Edit</Text>
            </Pressable>
          </View>
          <Text style={[styles.sub, { color: theme.secondaryText }]}>
            {draft.enabledServiceIds.length === 0 ? 'All online-bookable services' : `${shown.length} selected`}
          </Text>
          {shown.length === 0 ? (
            <View style={styles.warnRow}>
              <Icon name="exclamationmark.triangle.fill" size={14} color={theme.secondaryText} />
              <Text style={[styles.sub, styles.flex, { color: theme.secondaryText }]}>
                No services selected. Add services (with online booking on) first.
              </Text>
            </View>
          ) : (
            shown.map((s) => (
              <View key={s.id} style={styles.serviceRow}>
                <View style={[styles.dot, { backgroundColor: s.colorHex }]} />
                <Text style={[styles.serviceName, { color: theme.primaryText }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.sub, { color: theme.secondaryText }]}>${priceDisplay(s)}</Text>
                <Text style={[styles.sub, { color: theme.tertiaryText }]}>{s.duration} min</Text>
              </View>
            ))
          )}
        </View>

        {/* Deposit */}
        <View style={[styles.card, theme.card]}>
          <View style={styles.cardHeadRow}>
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Require Deposit</Text>
              <Text style={[styles.sub, { color: theme.secondaryText }]}>Collect payment when clients book</Text>
            </View>
            <Switch
              value={draft.requireDeposit}
              disabled={!depositAllowed && !draft.requireDeposit}
              onValueChange={(v) => set('requireDeposit', v)}
              trackColor={{ true: theme.accent, false: theme.inputBackground }}
            />
          </View>
          {!depositAllowed ? (
            <>
              <View style={styles.warnRow}>
                <Icon name="exclamationmark.triangle.fill" size={14} color={theme.secondaryText} />
                <Text style={[styles.sub, styles.flex, { color: theme.secondaryText }]}>
                  {approved === undefined ? 'Checking your payout status…' : 'Set up Stripe payouts first to collect deposits.'}
                </Text>
              </View>
              {approved === false ? (
                <ThemedButton title="Set Up Payouts" kind="accent" icon="creditcard.fill" onPress={() => router.push('/payout')} />
              ) : null}
            </>
          ) : draft.requireDeposit ? (
            <>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Deposit Amount</Text>
              <View style={styles.chips}>
                {DEPOSIT_OPTIONS.map((pct) => {
                  const active = draft.depositPercent === pct;
                  return (
                    <Pressable
                      key={pct}
                      onPress={() => set('depositPercent', pct)}
                      style={[
                        styles.chip,
                        { backgroundColor: active ? theme.accent : theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 999 },
                      ]}>
                      <Text style={[styles.chipText, { color: active ? theme.onAccent : theme.accent }]}>{pct}%</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.sub, { color: theme.secondaryText }]}>
                {draft.depositPercent === 100
                  ? 'Full payment collected upfront'
                  : `${draft.depositPercent}% of service price collected at booking`}
              </Text>
            </>
          ) : null}
        </View>

        <ConsentQRCard consentURL={consentURL(saved.slug)} />

        {/* Share */}
        <View style={styles.shareStack}>
          <ThemedButton title="Copy Booking Link" kind="accent" icon="doc.on.doc" onPress={copyLink} />
          <ThemedButton
            title="Share Booking Page"
            kind="quiet"
            icon="square.and.arrow.up"
            onPress={() => Share.share({ message: link, url: link }).catch(() => {})}
          />
          <ThemedButton
            title="Preview Booking Page"
            kind="quiet"
            icon="eye.fill"
            onPress={() => WebBrowser.openBrowserAsync(`${link}?preview=1`).catch(() => {})}
          />
          {dirty ? (
            <Text style={[styles.note, { color: theme.secondaryText }]}>
              Preview shows the live site — apply your changes first to see them.
            </Text>
          ) : null}
        </View>
      </KeyboardAwareForm>

      {/* Sticky publish bar */}
      <View style={[styles.barWrap, { alignItems: dirty ? 'stretch' : 'center' }]} pointerEvents="box-none">
        {dirty ? (
          <ThemedButton title={applying ? 'Updating your site…' : 'Apply Changes to Site'} kind="inverse" icon="arrow.up.circle.fill" loading={applying} onPress={apply} />
        ) : (
          <Pressable
            onPress={apply}
            disabled={applying}
            style={[styles.upToDate, theme.card, { borderRadius: theme.isEditorial ? 2 : 999 }]}>
            {applying ? (
              <ActivityIndicator color={theme.live} />
            ) : (
              <Icon name="checkmark.circle.fill" size={16} color={theme.live} />
            )}
            <Text style={[styles.upToDateText, { color: theme.live }]}>
              {applying ? 'Updating your site…' : 'Website up to date — tap to re-publish'}
            </Text>
          </Pressable>
        )}
      </View>

      <Toast message={toast?.message ?? null} error={toast?.error} />

      <SlugSheet
        visible={sheet === 'slug'}
        initial={saved.slug}
        onClose={() => setSheet(null)}
        onSave={async (slug) => {
          if (slug === saved.slug) return null;
          try {
            await quickPush({ slug });
            showToast('Booking URL updated!');
            return null;
          } catch (e) {
            return errMsg(e, "Couldn't save the URL.");
          }
        }}
      />
      <ServicesSheet
        visible={sheet === 'services'}
        services={onlineServices}
        enabledServiceIds={draft.enabledServiceIds}
        onChange={(ids) => set('enabledServiceIds', ids)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'advance'}
        title="Advance Booking"
        options={ADVANCE_OPTIONS}
        selected={draft.maxAdvanceDays}
        onSelect={(v) => set('maxAdvanceDays', v)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'notice'}
        title="Minimum Notice"
        options={NOTICE_OPTIONS}
        selected={draft.minLeadTimeHours}
        onSelect={(v) => set('minLeadTimeHours', v)}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      {children}
    </View>
  );
}

function PickerRow({ title, subtitle, value, onPress }: { title: string; subtitle: string; value: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.cardHeadRow}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.sub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.pickerValue, { color: theme.accent }]}>{value}</Text>
      <Icon name="chevron.up.chevron.down" size={12} color={theme.accent} />
    </Pressable>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  centerText: { textAlign: 'center' },
  errorText: { fontSize: 15, textAlign: 'center' },
  body: { padding: 20, gap: 20, paddingBottom: 40 },
  bodyWithBar: { paddingBottom: 130 },
  hero: { alignItems: 'center', gap: 14, paddingTop: 12 },
  heroSub: { fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },
  card: { padding: 18, gap: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  label: { fontSize: 13, fontWeight: '600' },
  sub: { fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', padding: 0 },
  urlPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  urlText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  getRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  getText: { fontSize: 14, flex: 1 },
  note: { fontSize: 13, textAlign: 'center' },
  linkText: { flex: 1, fontSize: 14, fontWeight: '500' },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineActionText: { fontSize: 14, fontWeight: '600' },
  fieldWrap: { gap: 8 },
  field: { fontSize: 15, paddingHorizontal: 12, paddingVertical: 11 },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoBox: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 64, height: 64 },
  logoActions: { flex: 1, gap: 8, alignItems: 'flex-start' },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  removeText: { fontSize: 13, textDecorationLine: 'underline' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  pickerValue: { fontSize: 15, fontWeight: '600' },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceName: { flex: 1, fontSize: 15, fontWeight: '500' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  chipText: { fontSize: 15, fontWeight: '700' },
  shareStack: { gap: 12 },
  barWrap: { position: 'absolute', left: 20, right: 20, bottom: 24 },
  upToDate: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  upToDateText: { fontSize: 13, fontWeight: '600' },
});
