/**
 * Business dashboard hub — port of the redesigned BusinessDashboardView.swift.
 *
 * Header (date, greeting, avatar menu), the AI helper card, the day's schedule
 * ("Up next" + the rest of today), customer channels, counts, the two main
 * actions, and a Workspace list with every destination the old tile grid had.
 * The day section is laid out per look (theme.homeLayout): hero, timeline,
 * card, editorial or agenda.
 */

import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBookingPage } from '@/api/booking-page';
import type { HelperSnapshot } from '@/api/helper';
import { HelperChatSheet } from '@/components/ai-helper/helper-chat-sheet';
import { HelperEntryCard } from '@/components/ai-helper/helper-entry-card';
import { useHelperChat } from '@/components/ai-helper/use-helper-chat';
import { Icon } from '@/components/icon';
import { LivePill, ThemedButton, ThemedIconTile, ThemedSectionHeader } from '@/components/themed';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { usePermissions } from '@/context/permissions-store';
import { useServices } from '@/context/services-store';
import { useSession } from '@/context/session';
import { useSMS } from '@/context/sms-store';
import { useStaff } from '@/context/staff-store';
import { HELPER_DESTINATIONS, unavailableScreens } from '@/lib/helper-destinations';
import { displayNameFromEmail } from '@/lib/name';
import type { Appointment } from '@/models/appointment';
import type { Permission } from '@/models/permission';
import { DISPLAY_FONT } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

interface WorkspaceItem {
  icon: SFSymbol;
  title: string;
  route: Href;
  permission?: Permission;
}

/** Every destination the old tile grid and Quick Actions list had. */
const WORKSPACE: WorkspaceItem[] = [
  { icon: 'calendar', title: 'Calendar', route: '/appointments', permission: 'viewAppointments' },
  { icon: 'creditcard.fill', title: 'Payments', route: '/payments', permission: 'viewPayments' },
  { icon: 'dollarsign.circle.fill', title: 'Finances', route: '/accounting', permission: 'viewReports' },
  { icon: 'shippingbox.fill', title: 'Inventory', route: '/inventory', permission: 'viewInventory' },
  { icon: 'storefront.fill', title: 'Vendor marketplace', route: '/vending', permission: 'viewVendors' },
  { icon: 'megaphone.fill', title: 'Marketing', route: '/marketing', permission: 'viewMarketing' },
  { icon: 'sparkles', title: 'Special features', route: '/special-features' },
  { icon: 'paintbrush.fill', title: 'Custom website design', route: '/custom-website' },
  { icon: 'chart.bar.fill', title: 'Analytics', route: '/analytics', permission: 'viewAnalytics' },
  { icon: 'questionmark.circle.fill', title: 'Help', route: '/help' },
  { icon: 'gearshape.fill', title: 'Settings', route: '/settings', permission: 'manageSettings' },
];

export default function Dashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { account, signOut, payoutComplete } = useSession();
  const { appointments } = useAppointments();
  const { clients } = useClients();
  const { services } = useServices();
  const { staff } = useStaff();
  const { phoneNumber } = useSMS();
  const { role, can } = usePermissions();
  const chat = useHelperChat();
  const bookingPage = useQuery({ queryKey: ['booking-page'], queryFn: getBookingPage });
  const bookingLive = bookingPage.data?.isEnabled === true && !!bookingPage.data?.slug;

  const [now, setNow] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);

  // Countdown and "Up next" refresh each minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const displayName = resolveDisplayName(account?.name, account?.email);
  const firstName = displayName.split(' ')[0];
  const smsActive = phoneNumber?.isActive === true;
  // Owners see every module the old grid showed; staff are filtered by permission.
  const allowed = (p?: Permission) => !p || role === 'owner' || can(p);

  const today = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== 'cancelled' && sameDay(new Date(a.startTime), now))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [appointments, now],
  );
  const upNext = today.find((a) => new Date(a.endTime).getTime() > now.getTime());
  const rest = today.filter((a) => a !== upNext && new Date(a.endTime).getTime() > now.getTime());

  const snapshot = (): HelperSnapshot => ({
    businessName: account?.businessName ?? null,
    role: role === 'staff' ? 'staff' : 'owner',
    counts: {
      services: services.length,
      staff: staff.length,
      clients: clients.length,
      upcomingAppointments: appointments.filter(
        (a) => a.status === 'scheduled' && new Date(a.startTime).getTime() > Date.now(),
      ).length,
    },
    setup: {
      aiTexting: smsActive,
      onlineBooking: bookingPage.data ? bookingLive : null,
      payouts: payoutComplete ? true : null,
    },
    serviceNames: services.map((s) => s.name).slice(0, 30),
    staffNames: staff.map((s) => s.name).slice(0, 20),
    unavailableScreens: unavailableScreens(can),
  });

  const openHelper = (question: string | null) => {
    setHelperOpen(true);
    if (question) chat.send(question, snapshot());
  };

  const openHelperScreen = (screen: string) => {
    const route = HELPER_DESTINATIONS[screen]?.route;
    setHelperOpen(false);
    if (route) router.push(route);
  };

  const message = (a: Appointment) => {
    if (a.clientPhone) Linking.openURL(`sms:${a.clientPhone}`).catch(() => {});
  };

  const day: DayProps = {
    upNext,
    rest,
    now,
    onOpen: (a) => router.push(`/appointments/${a.id}`),
    onMessage: message,
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.date, { color: theme.secondaryText }, theme.isEditorial ? styles.tracked : null]}>
                {formatHeaderDate(now, theme.isEditorial)}
              </Text>
              <Text numberOfLines={2} style={[theme.display(32), styles.greeting]}>
                {greeting(now)}, {firstName}
              </Text>
              {account?.businessName ? (
                <Text numberOfLines={1} style={[styles.business, { color: theme.secondaryText }]}>
                  {account.businessName}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Account menu"
              style={[styles.avatar, { backgroundColor: theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 22 }]}>
              <Text style={[styles.avatarText, { color: theme.accent }]}>{initials(displayName)}</Text>
            </Pressable>
          </View>

          <HelperEntryCard onOpen={openHelper} />

          {/* Today */}
          <View style={styles.section}>
            <ThemedSectionHeader
              title="Today"
              right={
                <Pressable onPress={() => router.push('/appointments')} hitSlop={8}>
                  <Text style={[styles.link, { color: theme.accent }]}>Calendar</Text>
                </Pressable>
              }
            />
            <DaySection {...day} />
          </View>

          {/* Channels */}
          <View style={styles.section}>
            <ThemedSectionHeader title="Channels" />
            <View style={theme.isEditorial ? null : theme.card}>
              <ListRow
                icon="globe"
                title="Online booking"
                subtitle={bookingLive ? 'Clients can book from your page' : 'Let clients book from your page'}
                trailing={<LivePill live={bookingLive} />}
                onPress={() => router.push('/online-booking')}
              />
              <Hairline inset />
              <ListRow
                icon="bubble.left.and.text.bubble.right.fill"
                title="AI texting"
                subtitle={smsActive ? 'Clients can text your number to book' : 'Let clients book by text'}
                trailing={<LivePill live={smsActive} />}
                onPress={() => router.push('/sms-setup')}
              />
            </View>
          </View>

          {/* Counts */}
          <View style={[styles.counts, theme.isEditorial ? null : theme.card]}>
            <Count label="Clients" value={clients.length} onPress={() => router.push('/clients')} />
            <View style={[styles.countRule, { backgroundColor: theme.divider }]} />
            <Count label="Services" value={services.length} onPress={() => router.push('/services')} />
            <View style={[styles.countRule, { backgroundColor: theme.divider }]} />
            <Count label="Team" value={staff.length} onPress={() => router.push('/staff')} />
          </View>

          {/* Main actions */}
          <View style={styles.actions}>
            <ThemedButton
              title="New appointment"
              icon="plus"
              kind="inverse"
              style={styles.flex}
              onPress={() => router.push('/appointments/create')}
            />
            <ThemedButton
              title="Create invoice"
              icon="doc.text.fill"
              kind="quiet"
              style={styles.flex}
              onPress={() => router.push('/accounting/create-invoice')}
            />
          </View>

          {/* Workspace */}
          <View style={styles.section}>
            <ThemedSectionHeader title="Workspace" />
            <View style={theme.isEditorial ? null : theme.card}>
              {WORKSPACE.filter((w) => allowed(w.permission)).map((w, i) => (
                <View key={w.title}>
                  {i > 0 ? <Hairline inset /> : null}
                  <ListRow icon={w.icon} title={w.title} onPress={() => router.push(w.route)} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <AccountMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          ...(allowed('manageSettings')
            ? [
                { icon: 'gearshape.fill' as SFSymbol, title: 'Settings', onPress: () => router.push('/settings') },
                { icon: 'building.2.fill' as SFSymbol, title: 'Payout setup', onPress: () => router.push('/payout') },
              ]
            : []),
          { icon: 'rectangle.portrait.and.arrow.right' as SFSymbol, title: 'Sign out', onPress: signOut, destructive: true },
        ]}
      />

      <HelperChatSheet
        visible={helperOpen}
        chat={chat}
        snapshot={snapshot}
        onClose={() => setHelperOpen(false)}
        onOpen={openHelperScreen}
      />
    </View>
  );
}

// MARK: - Day section (per look)

interface DayProps {
  upNext?: Appointment;
  rest: Appointment[];
  now: Date;
  onOpen: (a: Appointment) => void;
  onMessage: (a: Appointment) => void;
}

function DaySection(props: DayProps) {
  const theme = useAppTheme();
  const { upNext, rest, now, onOpen } = props;
  switch (theme.homeLayout) {
    case 'timeline':
      return (
        <>
          <WeekStrip now={now} />
          <View style={[theme.card, styles.cardPad]}>
            {upNext ? <UpNextBlock {...props} appt={upNext} /> : <EmptyDay />}
            {rest.map((a) => (
              <TimelineRow key={a.id} appt={a} onPress={() => onOpen(a)} />
            ))}
          </View>
        </>
      );
    case 'card':
      return (
        <>
          <WeekStrip now={now} chips />
          <View style={[theme.card, styles.cardPad]}>
            {upNext ? <UpNextBlock {...props} appt={upNext} /> : <EmptyDay />}
            {rest.length ? <Hairline /> : null}
            {rest.map((a) => (
              <ApptRow key={a.id} appt={a} onPress={() => onOpen(a)} />
            ))}
          </View>
        </>
      );
    case 'editorial':
      return (
        <View style={styles.editorialDay}>
          {upNext ? (
            <>
              <Text style={[styles.bigTime, { color: theme.primaryText }]}>{formatTime(upNext.startTime)}</Text>
              <UpNextBlock {...props} appt={upNext} hideTime />
            </>
          ) : (
            <EmptyDay />
          )}
          {rest.map((a) => (
            <View key={a.id}>
              <Hairline />
              <ApptRow appt={a} onPress={() => onOpen(a)} />
            </View>
          ))}
        </View>
      );
    case 'agenda':
      return (
        <>
          <WeekStrip now={now} />
          {upNext ? (
            <AgendaRow appt={upNext} onPress={() => onOpen(upNext)}>
              <UpNextBlock {...props} appt={upNext} hideTime />
            </AgendaRow>
          ) : (
            <View style={[theme.card, styles.cardPad]}>
              <EmptyDay />
            </View>
          )}
          {rest.map((a) => (
            <AgendaRow key={a.id} appt={a} onPress={() => onOpen(a)} />
          ))}
        </>
      );
    case 'hero':
    default:
      return (
        <>
          {upNext ? (
            <View
              style={[
                styles.heroCard,
                { backgroundColor: theme.hero, borderRadius: theme.cornerRadius, borderColor: theme.divider },
              ]}>
              <UpNextBlock {...props} appt={upNext} onHero />
            </View>
          ) : (
            <View style={[theme.card, styles.cardPad]}>
              <EmptyDay />
            </View>
          )}
          {rest.length ? (
            <View style={theme.card}>
              {rest.map((a, i) => (
                <View key={a.id}>
                  {i > 0 ? <Hairline inset /> : null}
                  <ApptRow appt={a} onPress={() => onOpen(a)} padded />
                </View>
              ))}
            </View>
          ) : null}
        </>
      );
  }
}

function UpNextBlock({
  appt,
  now,
  onOpen,
  onMessage,
  onHero = false,
  hideTime = false,
}: DayProps & { appt: Appointment; onHero?: boolean; hideTime?: boolean }) {
  const theme = useAppTheme();
  const fg = onHero ? theme.onHero : theme.primaryText;
  const muted = onHero ? theme.onHero : theme.secondaryText;
  const hasPhone = !!appt.clientPhone;
  return (
    <View style={styles.upNext}>
      <Text style={[styles.upNextLabel, styles.tracked, { color: muted }]}>
        UP NEXT · {countdown(appt, now).toUpperCase()}
      </Text>
      {hideTime ? null : (
        <Text style={[styles.upNextTime, { color: fg }]}>
          {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
        </Text>
      )}
      <Text numberOfLines={1} style={[styles.upNextClient, { color: fg }]}>
        {appt.clientName || 'Walk-in'}
      </Text>
      <Text numberOfLines={1} style={[styles.upNextService, { color: muted }]}>
        {appt.serviceName}
        {appt.staffMemberName ? ` · ${appt.staffMemberName}` : ''}
      </Text>
      <View style={styles.upNextActions}>
        <Pressable
          onPress={() => onOpen(appt)}
          style={({ pressed }) => [
            styles.smallButton,
            {
              backgroundColor: onHero ? theme.onHero : theme.inverse,
              borderRadius: theme.isEditorial ? 2 : 999,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <Text style={[styles.smallButtonText, { color: onHero ? theme.hero : theme.onInverse }]}>
            {theme.isEditorial ? 'DETAILS' : 'Details'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onMessage(appt)}
          disabled={!hasPhone}
          style={({ pressed }) => [
            styles.smallButton,
            {
              borderWidth: 1,
              borderColor: onHero ? theme.onHero : theme.divider,
              borderRadius: theme.isEditorial ? 2 : 999,
              opacity: !hasPhone ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}>
          <Text style={[styles.smallButtonText, { color: fg }]}>{theme.isEditorial ? 'MESSAGE' : 'Message'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ApptRow({ appt, onPress, padded = false }: { appt: Appointment; onPress: () => void; padded?: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.apptRow, padded ? styles.rowPad : null, pressed ? styles.pressed : null]}>
      <Text style={[styles.apptTime, { color: theme.secondaryText }]}>{formatTime(appt.startTime)}</Text>
      <View style={[styles.colorDot, { backgroundColor: appt.serviceColor || theme.accent }]} />
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.primaryText }]}>
          {appt.clientName || 'Walk-in'}
        </Text>
        <Text numberOfLines={1} style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
          {appt.serviceName}
        </Text>
      </View>
      <Icon name="chevron.right" size={12} color={theme.chevronTint} />
    </Pressable>
  );
}

function TimelineRow({ appt, onPress }: { appt: Appointment; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.timelineRow, pressed ? styles.pressed : null]}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { borderColor: theme.accent }]} />
        <View style={[styles.timelineLine, { backgroundColor: theme.divider }]} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
          {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
        </Text>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.primaryText }]}>
          {appt.clientName || 'Walk-in'} · {appt.serviceName}
        </Text>
      </View>
    </Pressable>
  );
}

function AgendaRow({ appt, onPress, children }: { appt: Appointment; onPress: () => void; children?: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.agendaRow}>
      <Text style={[styles.agendaTime, { color: theme.secondaryText }]}>{formatTime(appt.startTime)}</Text>
      <Pressable
        onPress={children ? undefined : onPress}
        style={({ pressed }) => [
          theme.card,
          styles.agendaCard,
          { borderLeftColor: appt.serviceColor || theme.accent },
          pressed && !children ? styles.pressed : null,
        ]}>
        {children ?? (
          <>
            <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.primaryText }]}>
              {appt.clientName || 'Walk-in'}
            </Text>
            <Text numberOfLines={1} style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
              {appt.serviceName} · until {formatTime(appt.endTime)}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function WeekStrip({ now, chips = false }: { now: Date; chips?: boolean }) {
  const theme = useAppTheme();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <View style={styles.week}>
      {days.map((d) => {
        const isToday = sameDay(d, now);
        return (
          <View
            key={d.toDateString()}
            style={[
              styles.weekDay,
              chips ? { borderWidth: 1, borderColor: theme.divider } : null,
              {
                backgroundColor: isToday ? theme.accent : chips ? theme.cardBackground : 'transparent',
                borderRadius: theme.isEditorial ? 2 : chips ? 999 : 14,
              },
            ]}>
            <Text style={[styles.weekLetter, { color: isToday ? theme.onAccent : theme.secondaryText }]}>
              {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </Text>
            <Text style={[styles.weekNum, { color: isToday ? theme.onAccent : theme.primaryText }]}>{d.getDate()}</Text>
          </View>
        );
      })}
    </View>
  );
}

function EmptyDay() {
  const theme = useAppTheme();
  return (
    <View style={styles.emptyDay}>
      <Text style={[styles.rowTitle, { color: theme.primaryText }]}>Nothing else today</Text>
      <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>New bookings will show up here.</Text>
    </View>
  );
}

// MARK: - Rows, counts, menu

function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: SFSymbol;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}>
      <ThemedIconTile name={icon} size={36} />
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.primaryText }]}>{title}</Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.rowSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
      <Icon name="chevron.right" size={12} color={theme.chevronTint} />
    </Pressable>
  );
}

function Count({ label, value, onPress }: { label: string; value: number; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.count, pressed ? styles.pressed : null]}>
      <Text style={[styles.countValue, { color: theme.primaryText }]}>{value}</Text>
      <Text style={[styles.countLabel, { color: theme.secondaryText }, theme.isEditorial ? styles.tracked : null]}>
        {theme.isEditorial ? label.toUpperCase() : label}
      </Text>
    </Pressable>
  );
}

function Hairline({ inset = false }: { inset?: boolean }) {
  const theme = useAppTheme();
  return <View style={[styles.hairline, { backgroundColor: theme.divider }, inset ? styles.inset : null]} />;
}

const DESTRUCTIVE = '#D93B30';

function AccountMenu({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: { icon: SFSymbol; title: string; onPress: () => void; destructive?: boolean }[];
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <SafeAreaView edges={['top']}>
          <View style={[theme.card, styles.menu]}>
            {items.map((item, i) => (
              <View key={item.title}>
                {i > 0 ? <Hairline /> : null}
                <Pressable
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                  style={({ pressed }) => [styles.menuRow, pressed ? styles.pressed : null]}>
                  <Icon name={item.icon} size={18} color={item.destructive ? DESTRUCTIVE : theme.accent} />
                  <Text style={[styles.rowTitle, { color: item.destructive ? DESTRUCTIVE : theme.primaryText }]}>
                    {item.title}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

// MARK: - Helpers

function resolveDisplayName(name?: string, email?: string): string {
  if (!name) return 'Business Owner';
  if (name.includes('@')) return displayNameFromEmail(name);
  if (email && email.toLowerCase().startsWith(`${name.toLowerCase()}@`)) {
    return displayNameFromEmail(email);
  }
  return name;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatHeaderDate(d: Date, upper: boolean): string {
  const s = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return upper ? s.toUpperCase() : s;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function countdown(a: Appointment, now: Date): string {
  const mins = Math.round((new Date(a.startTime).getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return 'Now';
  if (mins < 60) return `In ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `In ${h} hr ${m} min` : `In ${h} hr`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  content: { gap: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 6 },
  date: { fontSize: 13, fontWeight: '600' },
  tracked: { letterSpacing: 1.4 },
  greeting: { lineHeight: 38 },
  business: { fontSize: 15 },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  section: { gap: 12 },
  link: { fontSize: 15, fontWeight: '600' },
  cardPad: { padding: 16, gap: 12 },
  heroCard: { padding: 20, borderWidth: 1 },
  upNext: { gap: 6 },
  upNextLabel: { fontSize: 12, fontWeight: '700' },
  upNextTime: { fontFamily: DISPLAY_FONT, fontSize: 28 },
  upNextClient: { fontSize: 18, fontWeight: '600' },
  upNextService: { fontSize: 14 },
  upNextActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallButton: { paddingHorizontal: 18, paddingVertical: 10 },
  smallButtonText: { fontSize: 14, fontWeight: '600' },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowPad: { paddingHorizontal: 16 },
  apptTime: { width: 64, fontSize: 13, fontWeight: '500' },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSubtitle: { fontSize: 13 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { width: 12, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 4 },
  timelineLine: { flex: 1, width: 1, marginTop: 4 },
  agendaRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  agendaTime: { width: 60, fontSize: 13, fontWeight: '600', paddingTop: 14 },
  agendaCard: { flex: 1, padding: 14, gap: 2, borderLeftWidth: 4 },
  editorialDay: { gap: 10 },
  bigTime: { fontFamily: DISPLAY_FONT, fontSize: 56, lineHeight: 62 },
  week: { flexDirection: 'row', gap: 6 },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  weekLetter: { fontSize: 11, fontWeight: '600' },
  weekNum: { fontSize: 16, fontWeight: '600' },
  emptyDay: { gap: 4, paddingVertical: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  counts: { flexDirection: 'row', paddingVertical: 14 },
  count: { flex: 1, alignItems: 'center', gap: 2 },
  countValue: { fontFamily: DISPLAY_FONT, fontSize: 26 },
  countLabel: { fontSize: 12, fontWeight: '600' },
  countRule: { width: 1, marginVertical: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  hairline: { height: 1 },
  inset: { marginLeft: 62 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'flex-end' },
  menu: { marginTop: 64, marginRight: 16, minWidth: 220 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  pressed: { opacity: 0.75 },
});
