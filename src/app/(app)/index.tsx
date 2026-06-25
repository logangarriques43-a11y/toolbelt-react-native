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
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { DashboardStatCard } from '@/components/dashboard-stat-card';
import { Icon } from '@/components/icon';
import { useClients } from '@/context/clients-store';
import { useServices } from '@/context/services-store';
import { useSession } from '@/context/session';
import { displayNameFromEmail } from '@/lib/name';
import { Brand, Radius, cardShadow, iOSColors } from '@/theme/tokens';
import { useAppTheme, type AppTheme } from '@/theme/theme-context';

export default function Dashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { account, signOut } = useSession();
  const { clients } = useClients();
  const { services } = useServices();

  const displayName = resolveDisplayName(account?.name, account?.email);

  // TODO(phase 2+): these navigate to feature screens as they land.
  const todo = () => {};

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.welcome, { color: theme.secondaryText }]}>Welcome Back!</Text>
              <Text style={[styles.name, { color: theme.primaryText }]}>{displayName}</Text>
              {account?.businessName ? (
                <Text style={[styles.business, { color: iOSColors.blue }]}>
                  {account.businessName}
                </Text>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              {/* Payout setup (deferred — Phase 7). */}
              <Pressable onPress={todo} hitSlop={8}>
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
                onPress={todo}
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
                onPress={todo}
              />
            </View>
            <View style={styles.statRow}>
              <DashboardStatCard
                icon="storefront.fill"
                title="Vendor Marketplace"
                value="Vending"
                color={iOSColors.teal}
                onPress={todo}
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
      <Text style={[styles.quickTitle, { color: theme.primaryText }]}>{title}</Text>
      <View style={styles.quickSpacer} />
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
  quickTitle: { fontSize: 18, fontWeight: '500' },
  quickSpacer: { flex: 1 },
});
