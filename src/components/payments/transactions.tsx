/**
 * Payment Transactions — port of PaymentTransactionsView.swift + the cards in
 * PaymentTransactionCards.swift. The hub's Transactions section: a Today/Upcoming/
 * Sales summary, filter tabs (All/Upcoming/Today/Sales/Past), a date-grouped list
 * unifying calendar appointments with checkout sales, and a detail sheet.
 * Backend webhook sync (Stripe invoice payments → sales) is omitted.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { BRAND_BLUE, BRAND_PURPLE } from '@/components/payments/checkout';
import { useAppointments } from '@/context/appointments-store';
import { useSales } from '@/context/sales-store';
import { withOpacity } from '@/lib/color';
import { formattedDateFull } from '@/lib/appointment-time';
import { appointmentTimeRange, type Appointment } from '@/models/appointment';
import { saleItemSubtotal, type SaleItem, type SaleTransaction } from '@/models/sale';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const GREEN = '#33C773';
const SALES_ORANGE = '#E68C33';

type Filter = 'All' | 'Upcoming' | 'Today' | 'Sales' | 'Past';
const FILTERS: Filter[] = ['All', 'Upcoming', 'Today', 'Sales', 'Past'];

type Unified =
  | { kind: 'appointment'; appt: Appointment }
  | { kind: 'sale'; sale: SaleTransaction };

const uniId = (u: Unified) => (u.kind === 'appointment' ? u.appt.id : u.sale.id);
const uniMs = (u: Unified) => new Date(u.kind === 'appointment' ? u.appt.startTime : u.sale.date).getTime();
const uniAmount = (u: Unified) => (u.kind === 'appointment' ? u.appt.price : u.sale.totalAmount);

// ── Date helpers ──────────────────────────────────────────────────────

const DAY = 86_400_000;
const startOfDayMs = (d: Date | number) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const longFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

function groupKey(ms: number): string {
  const today = startOfDayMs(Date.now());
  const days = Math.round((startOfDayMs(ms) - today) / DAY);
  if (days === 0) return 'Today';
  if (days === -1) return 'Yesterday';
  if (days === 1) return 'Tomorrow';
  return Math.abs(days) < 7 ? weekdayFmt.format(ms) : longFmt.format(ms);
}

const isToday = (iso: string) => startOfDayMs(new Date(iso)) === startOfDayMs(Date.now());
const money0 = (n: number) => `$${n.toFixed(0)}`;
const money2 = (n: number) => `$${n.toFixed(2)}`;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Main section ──────────────────────────────────────────────────────

export function PaymentTransactions() {
  const theme = useAppTheme();
  const { appointments } = useAppointments();
  const sales = useSales();
  const [filter, setFilter] = useState<Filter>('All');
  const [detail, setDetail] = useState<Unified | null>(null);

  const now = Date.now();
  const upcomingAppts = appointments
    .filter((a) => new Date(a.startTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const todayAppts = appointments.filter((a) => isToday(a.startTime));
  const pastAppts = appointments.filter((a) => new Date(a.endTime).getTime() < now && !isToday(a.startTime));
  const todaySales = sales.salesFor('Today');

  const filtered: Unified[] = (() => {
    switch (filter) {
      case 'Upcoming':
        return upcomingAppts.map((appt) => ({ kind: 'appointment' as const, appt }));
      case 'Today':
        return [
          ...todayAppts.map((appt) => ({ kind: 'appointment' as const, appt })),
          ...todaySales.map((sale) => ({ kind: 'sale' as const, sale })),
        ];
      case 'Sales':
        return sales.sales.map((sale) => ({ kind: 'sale' as const, sale }));
      case 'Past':
        return [
          ...pastAppts.map((appt) => ({ kind: 'appointment' as const, appt })),
          ...sales.sales.filter((s) => !isToday(s.date)).map((sale) => ({ kind: 'sale' as const, sale })),
        ];
      case 'All':
      default:
        return [
          ...appointments.map((appt) => ({ kind: 'appointment' as const, appt })),
          ...sales.sales.map((sale) => ({ kind: 'sale' as const, sale })),
        ];
    }
  })();

  // Group by date key.
  const map = new Map<string, { ms: number; items: Unified[] }>();
  for (const u of filtered) {
    const key = groupKey(uniMs(u));
    if (!map.has(key)) map.set(key, { ms: startOfDayMs(uniMs(u)), items: [] });
    map.get(key)!.items.push(u);
  }
  const groups = [...map.entries()]
    .map(([key, v]) => ({ key, ms: v.ms, items: v.items.sort((a, b) => uniMs(a) - uniMs(b)) }))
    .sort((a, b) => (filter === 'Upcoming' ? a.ms - b.ms : b.ms - a.ms));

  const todayRevenue =
    todayAppts.reduce((s, a) => s + a.price, 0) + todaySales.reduce((s, x) => s + x.totalAmount, 0);
  const upcomingRevenue = upcomingAppts.reduce((s, a) => s + a.price, 0);
  const salesRevenue = sales.revenue('Lifetime');

  const sectionColor =
    filter === 'Upcoming' ? GREEN : filter === 'Past' ? BRAND_PURPLE : filter === 'Sales' ? SALES_ORANGE : BRAND_BLUE;

  return (
    <View style={styles.flex}>
      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: theme.cardBackground }]}>
        <SummaryPill label="Today" amount={todayRevenue} count={todayAppts.length + todaySales.length} color={BRAND_BLUE} />
        <View style={[styles.summaryDiv, { backgroundColor: theme.divider }]} />
        <SummaryPill label="Upcoming" amount={upcomingRevenue} count={upcomingAppts.length} color={GREEN} />
        <View style={[styles.summaryDiv, { backgroundColor: theme.divider }]} />
        <SummaryPill label="Sales" amount={salesRevenue} count={sales.sales.length} color={BRAND_PURPLE} />
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)}>
              {active ? (
                <LinearGradient colors={[BRAND_BLUE, BRAND_PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tab}>
                  <Text style={[styles.tabText, { color: '#FFFFFF', fontWeight: '700' }]}>{f}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.tab, { backgroundColor: withOpacity(iOSColors.gray, 0.1) }]}>
                  <Text style={[styles.tabText, { color: iOSColors.gray }]}>{f}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ScrollView contentContainerStyle={styles.listPad}>
          {groups.map((g) => (
            <View key={g.key}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: sectionColor }]} />
                <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{g.key}</Text>
                <View style={[styles.sectionTotal, { backgroundColor: withOpacity(sectionColor, 0.12) }]}>
                  <Text style={[styles.sectionTotalText, { color: sectionColor }]}>
                    {money0(g.items.reduce((s, u) => s + uniAmount(u), 0))}
                  </Text>
                </View>
                <View style={[styles.sectionRule, { backgroundColor: theme.divider }]} />
              </View>
              <View style={styles.cards}>
                {g.items.map((u) => (
                  <Pressable key={uniId(u)} onPress={() => setDetail(u)}>
                    {u.kind === 'appointment' ? (
                      <AppointmentCard appt={u.appt} isPast={new Date(u.appt.endTime).getTime() < now && !isToday(u.appt.startTime)} />
                    ) : (
                      <SaleCard sale={u.sale} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <TransactionDetailSheet txn={detail} onClose={() => setDetail(null)} />
    </View>
  );
}

function SummaryPill({ label, amount, count, color }: { label: string; amount: number; count: number; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillAmount, { color }]}>{money0(amount)}</Text>
      <View style={styles.pillSub}>
        <Text style={[styles.pillLabel, { color: theme.secondaryText }]}>{label}</Text>
        <Text style={[styles.pillCount, { color: withOpacity(iOSColors.gray, 0.6) }]}>({count})</Text>
      </View>
    </View>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────

function AppointmentCard({ appt, isPast }: { appt: Appointment; isPast: boolean }) {
  const theme = useAppTheme();
  const color = appt.serviceColor;
  const priceColor = isPast ? GREEN : BRAND_BLUE;
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, opacity: isPast ? 0.7 : 1 }]}>
      <View style={[styles.accent, { backgroundColor: withOpacity(color, isPast ? 0.5 : 1) }]} />
      <View style={styles.cardBody}>
        <View style={[styles.cardAvatar, { backgroundColor: withOpacity(color, 0.15) }]}>
          <Text style={[styles.cardAvatarText, { color: withOpacity(color, isPast ? 0.6 : 1) }]}>{initials(appt.clientName)}</Text>
        </View>
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, { color: isPast ? theme.secondaryText : theme.primaryText }]} numberOfLines={1}>
              {appt.clientName}
            </Text>
            <Badge text="Appt" color={color} tint={withOpacity(color, 0.12)} />
          </View>
          <Text style={[styles.cardSub, { color: theme.secondaryText }]} numberOfLines={1}>{appt.serviceName}</Text>
          <View style={styles.metaRow}>
            <Meta icon="clock" text={appointmentTimeRange(appt)} />
            <Meta icon="hourglass" text={durationText(appt.duration)} />
          </View>
        </View>
        <View style={styles.priceCol}>
          <Text style={[styles.priceText, { color: priceColor }]}>{money0(appt.price)}</Text>
          <Text style={[styles.priceStatus, { color: withOpacity(priceColor, 0.7) }]}>{isPast ? 'Paid' : 'Pending'}</Text>
        </View>
      </View>
    </View>
  );
}

function SaleCard({ sale }: { sale: SaleTransaction }) {
  const theme = useAppTheme();
  const lead = sale.isKeypadSale ? iOSColors.orange : sale.items[0]?.colorHex ?? BRAND_PURPLE;
  const itemSummary = sale.isKeypadSale
    ? 'Custom amount'
    : `${sale.items.reduce((s, i) => s + i.quantity, 0)} item${sale.items.reduce((s, i) => s + i.quantity, 0) === 1 ? '' : 's'}`;
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.accent, { backgroundColor: lead }]} />
      <View style={styles.cardBody}>
        <View style={[styles.cardAvatar, { backgroundColor: withOpacity(lead, 0.15) }]}>
          <Icon name={sale.isKeypadSale ? 'number.square.fill' : 'bag.fill'} size={18} color={lead} />
        </View>
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, { color: theme.primaryText }]} numberOfLines={1}>{sale.clientName ?? 'Walk-in'}</Text>
            <Badge text="Sale" color="#FFFFFF" tint={BRAND_PURPLE} />
            {!sale.clientId && <Icon name="person.slash" size={10} color={withOpacity(iOSColors.orange, 0.7)} />}
          </View>
          <Text style={[styles.cardSub, { color: theme.secondaryText }]}>{itemSummary}</Text>
          <View style={styles.metaRow}>
            <Meta icon="clock" text={timeFmt.format(new Date(sale.date))} />
            <Meta icon={paymentIcon(sale.paymentMethod)} text={sale.paymentMethod} />
            {sale.notes.length > 0 && <Icon name="note.text" size={10} color={withOpacity(iOSColors.orange, 0.6)} />}
          </View>
        </View>
        <View style={styles.priceCol}>
          <Text style={[styles.priceText, { color: GREEN }]}>{money2(sale.totalAmount)}</Text>
          <Text style={[styles.priceStatus, { color: withOpacity(GREEN, 0.7) }]}>Paid</Text>
        </View>
      </View>
    </View>
  );
}

function paymentIcon(method: string): SFSymbol {
  switch (method.toLowerCase()) {
    case 'card':
      return 'creditcard.fill';
    case 'cash':
      return 'banknote.fill';
    case 'digital':
      return 'iphone';
    default:
      return 'dollarsign.circle.fill';
  }
}

function durationText(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

function Badge({ text, color, tint }: { text: string; color: string; tint: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: tint }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

function Meta({ icon, text }: { icon: SFSymbol; text: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={10} color={theme.secondaryText} />
      <Text style={[styles.metaText, { color: theme.secondaryText }]}>{text}</Text>
    </View>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const theme = useAppTheme();
  const map: Record<Filter, { icon: SFSymbol; title: string; sub: string }> = {
    Upcoming: { icon: 'calendar.badge.clock', title: 'No Upcoming Appointments', sub: 'Schedule appointments from your calendar to see them here.' },
    Today: { icon: 'sun.max', title: 'No Transactions Today', sub: 'Completed sales and appointments will appear here.' },
    Past: { icon: 'clock.arrow.circlepath', title: 'No Past Transactions', sub: 'Completed transactions will appear here as history.' },
    Sales: { icon: 'cart', title: 'No Sales Yet', sub: 'Complete a sale from checkout to see it here.' },
    All: { icon: 'tray', title: 'No Transactions Yet', sub: 'Appointments and sales will sync here automatically.' },
  };
  const c = map[filter];
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyCircle, { backgroundColor: withOpacity(iOSColors.gray, 0.08) }]}>
        <Icon name={c.icon} size={32} color={withOpacity(iOSColors.gray, 0.4)} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>{c.title}</Text>
      <Text style={[styles.emptySub, { color: theme.secondaryText }]}>{c.sub}</Text>
    </View>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────

function TransactionDetailSheet({ txn, onClose }: { txn: Unified | null; onClose: () => void }) {
  const theme = useAppTheme();
  return (
    <Modal visible={txn != null} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={[styles.detailHeader, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={onClose} style={[styles.roundBtn, { backgroundColor: theme.cardBackground }]}>
              <Icon name="xmark" size={16} color={theme.secondaryText} weight="medium" />
            </Pressable>
            <Text style={[styles.detailTitle, { color: theme.primaryText }]}>Transaction Details</Text>
            <View style={styles.roundBtn} />
          </View>
          <ScrollView contentContainerStyle={styles.detailBody}>
            {txn?.kind === 'appointment' && <AppointmentDetail appt={txn.appt} />}
            {txn?.kind === 'sale' && <SaleDetail sale={txn.sale} />}
          </ScrollView>
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detailCardWrap}>
      <Text style={[styles.detailCardTitle, { color: theme.secondaryText }]}>{title}</Text>
      <View style={[styles.detailCard, { backgroundColor: theme.cardBackground }]}>{children}</View>
    </View>
  );
}

function AppointmentDetail({ appt }: { appt: Appointment }) {
  const theme = useAppTheme();
  const isPast = new Date(appt.endTime).getTime() < Date.now();
  const status = isPast ? GREEN : BRAND_BLUE;
  return (
    <View style={styles.detailContent}>
      <View style={styles.amountHeader}>
        <View style={[styles.statusBadge, { backgroundColor: withOpacity(status, 0.1) }]}>
          <Text style={[styles.statusText, { color: status }]}>{isPast ? 'Paid' : 'Pending'}</Text>
        </View>
        <Text style={[styles.bigAmount, { color: theme.primaryText }]}>{money0(appt.price)}</Text>
      </View>
      <View style={styles.typeLabel}>
        <Icon name="calendar" size={13} color={theme.secondaryText} />
        <Text style={[styles.typeText, { color: theme.secondaryText }]}>Scheduled Appointment</Text>
      </View>
      <DetailCard title="Client">
        <View style={styles.detailRow}>
          <View style={[styles.detailAvatar, { backgroundColor: withOpacity(appt.serviceColor, 0.15) }]}>
            <Text style={[styles.detailAvatarText, { color: appt.serviceColor }]}>{initials(appt.clientName)}</Text>
          </View>
          <Text style={[styles.detailName, { color: theme.primaryText }]}>{appt.clientName}</Text>
        </View>
      </DetailCard>
      <DetailCard title="Service">
        <View style={styles.detailRow}>
          <View style={[styles.detailAccent, { backgroundColor: appt.serviceColor }]} />
          <View style={styles.flex}>
            <Text style={[styles.detailName, { color: theme.primaryText }]}>{appt.serviceName}</Text>
            <Text style={[styles.detailMeta, { color: theme.secondaryText }]}>{appointmentTimeRange(appt)}</Text>
          </View>
          <Text style={[styles.detailMeta, { color: theme.secondaryText }]}>{appt.duration}m</Text>
        </View>
      </DetailCard>
      <DetailCard title="Date & Time">
        <Text style={[styles.detailName, { color: theme.primaryText }]}>{formattedDateFull(appt.startTime)}</Text>
        <Text style={[styles.detailMeta, { color: theme.secondaryText }]}>{appointmentTimeRange(appt)}</Text>
      </DetailCard>
    </View>
  );
}

function SaleDetail({ sale }: { sale: SaleTransaction }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detailContent}>
      <View style={styles.amountHeader}>
        <View style={[styles.statusBadge, { backgroundColor: withOpacity(GREEN, 0.1) }]}>
          <Text style={[styles.statusText, { color: GREEN }]}>Paid</Text>
        </View>
        <Text style={[styles.bigAmount, { color: theme.primaryText }]}>{money2(sale.totalAmount)}</Text>
      </View>
      <View style={styles.typeLabel}>
        <Icon name={sale.isKeypadSale ? 'number.square.fill' : 'bag.fill'} size={13} color={theme.secondaryText} />
        <Text style={[styles.typeText, { color: theme.secondaryText }]}>{sale.isKeypadSale ? 'Keypad Sale' : 'Service Sale'}</Text>
        <Text style={[styles.typeText, { color: withOpacity(iOSColors.gray, 0.4) }]}>•</Text>
        <Text style={[styles.typeText, { color: theme.secondaryText }]}>{sale.paymentMethod}</Text>
      </View>
      <DetailCard title="Client">
        {sale.clientName ? (
          <View style={styles.detailRow}>
            <View style={[styles.detailAvatar, { backgroundColor: withOpacity(iOSColors.blue, 0.15) }]}>
              <Text style={[styles.detailAvatarText, { color: iOSColors.blue }]}>{initials(sale.clientName)}</Text>
            </View>
            <Text style={[styles.detailName, { color: theme.primaryText }]}>{sale.clientName}</Text>
          </View>
        ) : (
          <View style={styles.detailRow}>
            <Icon name="person.slash" size={18} color={iOSColors.orange} />
            <Text style={[styles.detailMeta, { color: theme.secondaryText }]}>No client attached</Text>
          </View>
        )}
      </DetailCard>
      {sale.items.length > 0 && (
        <DetailCard title="Items">
          {sale.items.map((item, i) => (
            <View key={item.id}>
              <SaleItemRow item={item} />
              {i < sale.items.length - 1 && <View style={[styles.itemDivider, { backgroundColor: theme.divider }]} />}
            </View>
          ))}
        </DetailCard>
      )}
      <DetailCard title="Notes">
        {sale.notes.length > 0 ? (
          <View style={styles.notesRow}>
            <Icon name="note.text" size={16} color={iOSColors.orange} />
            <Text style={[styles.detailName, styles.flex, { color: theme.primaryText }]}>{sale.notes}</Text>
          </View>
        ) : (
          <View style={styles.notesRow}>
            <Icon name="note.text" size={16} color={withOpacity(iOSColors.gray, 0.4)} />
            <Text style={[styles.detailMeta, { color: withOpacity(iOSColors.gray, 0.5) }]}>No notes added</Text>
          </View>
        )}
      </DetailCard>
      <DetailCard title="Date & Time">
        <Text style={[styles.detailName, { color: theme.primaryText }]}>{formattedDateFull(sale.date)}</Text>
        <Text style={[styles.detailMeta, { color: theme.secondaryText }]}>{timeFmt.format(new Date(sale.date))}</Text>
      </DetailCard>
    </View>
  );
}

function SaleItemRow({ item }: { item: SaleItem }) {
  const theme = useAppTheme();
  return (
    <View style={styles.saleItemRow}>
      <View style={[styles.saleItemAvatar, { backgroundColor: item.colorHex }]}>
        <Text style={styles.saleItemAvatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.detailName, { color: theme.primaryText }]}>{item.name}</Text>
        <Text style={[styles.detailMeta, { color: theme.secondaryText }]}>
          Qty: {item.quantity} × {money0(item.price)}
        </Text>
      </View>
      <Text style={[styles.detailName, { color: theme.primaryText }]}>{money2(saleItemSubtotal(item))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Summary
  summary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, marginHorizontal: 16, marginTop: 16, borderRadius: 14 },
  summaryDiv: { width: 1, height: 44 },
  pill: { flex: 1, alignItems: 'center', gap: 4 },
  pillAmount: { fontSize: 18, fontWeight: '700' },
  pillSub: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pillLabel: { fontSize: 11, fontWeight: '500' },
  pillCount: { fontSize: 11, fontWeight: '600' },
  // Tabs
  tabs: { gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '500' },
  // List
  listPad: { paddingBottom: 80 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
  sectionTotal: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sectionTotalText: { fontSize: 12, fontWeight: '700' },
  sectionRule: { flex: 1, height: 1 },
  cards: { gap: 8, paddingHorizontal: 16 },
  // Card
  card: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', ...elevation() },
  accent: { width: 5, alignSelf: 'stretch', marginVertical: 6, borderRadius: 3 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontSize: 15, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  cardSub: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  priceCol: { alignItems: 'flex-end', gap: 2 },
  priceText: { fontSize: 17, fontWeight: '700' },
  priceStatus: { fontSize: 11, fontWeight: '500' },
  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySub: { fontSize: 14, textAlign: 'center' },
  // Detail
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  detailTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  roundBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  detailBody: { paddingTop: 16, paddingBottom: 40 },
  detailContent: { gap: 20 },
  amountHeader: { alignItems: 'center', gap: 6, paddingTop: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '600' },
  bigAmount: { fontSize: 48, fontWeight: '700' },
  typeLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeText: { fontSize: 14, fontWeight: '500' },
  detailCardWrap: { gap: 10 },
  detailCardTitle: { fontSize: 13, fontWeight: '500', paddingHorizontal: 20 },
  detailCard: { padding: 14, borderRadius: 12, marginHorizontal: 16, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { fontSize: 15, fontWeight: '700' },
  detailAccent: { width: 6, height: 40, borderRadius: 4 },
  detailName: { fontSize: 16, fontWeight: '500' },
  detailMeta: { fontSize: 13 },
  itemDivider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  saleItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  saleItemAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  saleItemAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});

function elevation() {
  return {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  };
}
