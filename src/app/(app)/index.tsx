/**
 * Business dashboard hub — port of BusinessDashboardView.swift.
 *
 * The grid hub the whole app hangs off of. Stat-card grid, a clients/services/
 * staff triple button, and a Quick Actions list. Feature destinations are built
 * in later phases, so their buttons are TODO-seamed no-ops for now; sign-out and
 * the (deferred) payout entry point are wired to the session.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { DashboardStatCard } from '@/components/dashboard-stat-card';
import { Icon } from '@/components/icon';
import { useClients } from '@/context/clients-store';
import { useServices } from '@/context/services-store';
import { useSession } from '@/context/session';
import { useSMS } from '@/context/sms-store';
import { withOpacity } from '@/lib/color';
import { displayNameFromEmail } from '@/lib/name';
import { Brand, Radius, cardShadow, iOSColors } from '@/theme/tokens';
import { useAppTheme, type AppTheme } from '@/theme/theme-context';

export default function Dashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { account, signOut } = useSession();
  const { clients } = useClients();
  const { services } = useServices();
  const { phoneNumber } = useSMS();

  const displayName = resolveDisplayName(account?.name, account?.email);
  const smsActive = phoneNumber?.isActive === true;
  const smsStatus = smsActive ? 'Existing customers can text your number' : 'Tap to set up AI texting';

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text allowFontScaling={false} style={[styles.welcome, { color: theme.secondaryText }]}>Welcome Back!</Text>
              <Text numberOfLines={1} allowFontScaling={false} style={[styles.name, { color: theme.primaryText }]}>{displayName}</Text>
              {account?.businessName ? (
                <Text numberOfLines={1} style={[styles.business, { color: iOSColors.blue }]}>
                  {account.businessName}
                </Text>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              {/* Payout setup (Stripe Connect — Phase 7, webview-stubbed). */}
              <Pressable onPress={() => router.push('/payout')} hitSlop={8}>
                <Icon name="wrench.and.screwdriver.fill" size={22} color={Brand.accent} />
              </Pressable>
              <Pressable onPress={signOut} hitSlop={8} accessibilityRole="button">
                <Icon
                  name="rectangle.portrait.and.arrow.right"
                  size={24}
                  color={iOSColors.blue}
                />
              </Pressable>
            </View>
          </View>

          {/* Customer Channels — at-a-glance status for how clients can book. */}
          <View style={styles.channels}>
            <View style={styles.channelsHead}>
              <Icon name="antenna.radiowaves.left.and.right" size={14} color={theme.secondaryText} />
              <Text style={[styles.channelsLabel, { color: theme.secondaryText }]}>CUSTOMER CHANNELS</Text>
            </View>
            <View style={[styles.channelsCard, { backgroundColor: theme.cardBackground }, cardShadow(theme)]}>
              <ChannelRow
                icon="globe"
                iconColor={iOSColors.indigo}
                title="Online Booking"
                status="Tap to set up your booking page"
                isLive={false}
                onPress={() => Alert.alert('Coming soon', 'Online Booking arrives in a later phase.')}
              />
              <View style={[styles.channelDivider, { backgroundColor: theme.divider }]} />
              <ChannelRow
                icon="bubble.left.and.text.bubble.right.fill"
                iconColor={iOSColors.teal}
                title="AI Texting"
                status={smsStatus}
                isLive={smsActive}
                onPress={() => router.push('/sms-setup')}
              />
            </View>
          </View>

          {/* Stat grid */}
          <View style={styles.grid}>
            <View style={styles.statRow}>
              <DashboardStatCard
                icon="calendar.badge.clock"
                title="Book Appointments"
                value="Calendar"
                color={iOSColors.blue}
                onPress={() => router.push('/appointments')}
              />
              <DashboardStatCard
                icon="creditcard.fill"
                title="Payments"
                value="Payments"
                color={iOSColors.purple}
                onPress={() => router.push('/payments')}
              />
            </View>
            <View style={styles.statRow}>
              <DashboardStatCard
                icon="dollarsign.circle.fill"
                title="Financial Reports"
                value="Finances"
                color={iOSColors.green}
                onPress={() => router.push('/accounting')}
              />
              <DashboardStatCard
                icon="shippingbox.fill"
                title="Stock Managment"
                value="Inventory"
                color={iOSColors.indigo}
                onPress={() => router.push('/inventory')}
              />
            </View>
            <View style={styles.statRow}>
              <DashboardStatCard
                icon="storefront.fill"
                title="Vendor Marketplace"
                value="Vending"
                color={iOSColors.teal}
                onPress={() => router.push('/vending')}
              />
              <DashboardStatCard
                icon="megaphone.fill"
                title="Grow Your Brand"
                value="Marketing"
                color={iOSColors.orange}
                onPress={() => router.push('/marketing')}
              />
            </View>

            {/* Clients / Services / Staff */}
            <View
              style={[
                styles.tripleRow,
                { backgroundColor: theme.cardBackground },
                cardShadow(theme),
              ]}>
              <TripleButton icon="person.2.fill" title="Clients" count={String(clients.length)} color="#4CBF80" onPress={() => router.push('/clients')} />
              <View style={[styles.tripleDivider, { backgroundColor: theme.divider }]} />
              <TripleButton icon="list.clipboard.fill" title="Services" count={String(services.length)} color="#9966E6" onPress={() => router.push('/services')} />
              <View style={[styles.tripleDivider, { backgroundColor: theme.divider }]} />
              <TripleButton icon="person.badge.key.fill" title="Staff" count="Manage" color="#F29933" onPress={() => router.push('/staff')} />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Quick Actions</Text>
            <View style={styles.quickList}>
              <QuickAction icon="doc.text.fill" title="Create Invoice" color={iOSColors.green} onPress={() => router.push('/accounting/create-invoice')} />
              <QuickAction icon="sparkles" title="Our Special Features" color={iOSColors.orange} onPress={() => router.push('/special-features')} />
              <QuickAction icon="paintbrush.fill" title="Custom Website Design" color={iOSColors.blue} onPress={() => router.push('/custom-website')} />
              <QuickAction icon="questionmark.circle.fill" title="Help" color={iOSColors.green} onPress={() => router.push('/help')} />
              <QuickAction icon="chart.bar.fill" title="View Analytics" color={iOSColors.purple} onPress={() => router.push('/analytics')} />
              <QuickAction icon="gearshape.fill" title="Settings" color={iOSColors.gray} onPress={() => router.push('/settings')} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function resolveDisplayName(name?: string, email?: string): string {
  if (!name) return 'Business Owner';
  if (name.includes('@')) return displayNameFromEmail(name);
  if (email && email.toLowerCase().startsWith(`${name.toLowerCase()}@`)) {
    return displayNameFromEmail(email);
  }
  return name;
}

interface TripleButtonProps {
  icon: SFSymbol;
  title: string;
  count: string;
  color: string;
  onPress: () => void;
}

function TripleButton({ icon, title, count, color, onPress }: TripleButtonProps) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.tripleButton}>
      <View style={styles.tripleInner}>
        <View style={[styles.tripleIcon, { backgroundColor: theme.iconBackground(color) }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.tripleTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.tripleCount, { color: theme.secondaryText }]}>{count}</Text>
      </View>
    </Pressable>
  );
}

interface ChannelRowProps {
  icon: SFSymbol;
  iconColor: string;
  title: string;
  status: string;
  isLive: boolean;
  onPress: () => void;
}

/** One row of the Customer Channels card — port of customerChannelRow. */
function ChannelRow({ icon, iconColor, title, status, isLive, onPress }: ChannelRowProps) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.channelRow}>
      <View style={[styles.channelIcon, { backgroundColor: theme.iconBackground(iconColor) }]}>
        <Icon name={icon} size={14} color={iconColor} />
      </View>
      <View style={styles.channelText}>
        <Text numberOfLines={1} style={[styles.channelTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.channelStatus, { color: theme.secondaryText }]}>{status}</Text>
      </View>
      {isLive ? (
        <View style={[styles.livePill, { backgroundColor: withOpacity(iOSColors.green, 0.12) }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      ) : null}
      <Icon name="chevron.right" size={12} color={theme.chevronTint} />
    </Pressable>
  );
}

interface QuickActionProps {
  icon: SFSymbol;
  title: string;
  color: string;
  onPress: () => void;
}

function QuickAction({ icon, title, color, onPress }: QuickActionProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickItem,
        { backgroundColor: theme.cardBackground },
        quickShadow(theme),
      ]}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="#FFFFFF" />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.quickTitle, { color: theme.primaryText }]}>
        {title}
      </Text>
      <Icon name="chevron.right" size={16} color={theme.chevronTint} />
    </Pressable>
  );
}

/** QuickActionButton uses the lighter `shadowLight` elevation. */
function quickShadow(theme: AppTheme) {
  return {
    shadowColor: theme.shadowColor,
    shadowOpacity: theme.shadowLightOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 32, paddingTop: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'flex-start' },
  headerText: { flex: 1, gap: 8 },
  welcome: { fontSize: 16 },
  name: { fontSize: 32, fontWeight: '700' },
  business: { fontSize: 18 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  channels: { gap: 12, paddingHorizontal: 20 },
  channelsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  channelsLabel: { fontSize: 14, fontWeight: '600' },
  channelsCard: { borderRadius: 14 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  channelIcon: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  channelText: { flex: 1, gap: 1 },
  channelTitle: { fontSize: 15, fontWeight: '500' },
  channelStatus: { fontSize: 11 },
  channelDivider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: iOSColors.green },
  liveText: { fontSize: 11, fontWeight: '600', color: iOSColors.green },
  grid: { gap: 20, paddingHorizontal: 20 },
  statRow: { flexDirection: 'row', gap: 16 },
  tripleRow: { flexDirection: 'row', borderRadius: Radius.card, overflow: 'hidden' },
  tripleDivider: { width: 1, marginVertical: 16 },
  tripleButton: { flex: 1 },
  tripleInner: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  tripleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tripleTitle: { fontSize: 14, fontWeight: '600' },
  tripleCount: { fontSize: 12, fontWeight: '500' },
  quickActions: { gap: 16 },
  sectionTitle: { fontSize: 24, fontWeight: '700', paddingHorizontal: 20 },
  quickList: { gap: 12, paddingHorizontal: 20 },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
  },
  quickIcon: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // flex:1 gives the label a bounded width (was a trailing spacer) so
  // adjustsFontSizeToFit can shrink a long label ("Our Special Features") to fit.
  quickTitle: { flex: 1, fontSize: 18, fontWeight: '500' },
});
