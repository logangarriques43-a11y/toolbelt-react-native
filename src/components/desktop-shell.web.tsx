/**
 * Browser frame for the signed-in screens.
 *
 * Wide windows (useIsDesktop) get a computer layout: a sidebar with every area
 * of the app, a "New appointment" button and the account, beside the screens.
 * The calendar and home use the full width; other screens, which are laid out
 * for a phone, sit in a readable centered column. Narrower windows keep the
 * phone layout untouched.
 *
 * Either way the area the screens are drawn in is measured and provided to
 * `useContentWidth`, so width-based grids (calendar columns) fit it.
 *
 * Only the web build imports this file.
 */

import { usePathname, useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type SFSymbol } from '@/components/icon';
import { usePermissions } from '@/context/permissions-store';
import { useSession } from '@/context/session';
import { useSMS } from '@/context/sms-store';
import { useTattooEntry } from '@/hooks/use-tattoo';
import { ContentWidthContext } from '@/lib/content-width';
import { initials, resolveDisplayName } from '@/lib/name';
import { useIsDesktop } from '@/lib/use-desktop';
import { WORKSPACE, type WorkspaceItem } from '@/lib/workspace-nav';
import { useAppTheme } from '@/theme/theme-context';

const SIDEBAR_WIDTH = 252;
/** Phone-designed screens are centered at this width on a computer. */
const COLUMN_MAX_WIDTH = 880;
/** Screens built to use the whole width (home, calendar). */
const FULL_WIDTH_ROUTES = new Set(['/', '/appointments']);

/** Measures the screen area and provides it to useContentWidth. */
function MeasuredArea({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState<number | null>(null);
  return (
    <View style={[styles.fill, style]} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      <ContentWidthContext.Provider value={width}>{children}</ContentWidthContext.Provider>
    </View>
  );
}

export function DesktopShell({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const desktop = useIsDesktop();
  const pathname = usePathname();

  if (!desktop) return <MeasuredArea>{children}</MeasuredArea>;

  const fullWidth = FULL_WIDTH_ROUTES.has(pathname);
  return (
    <View style={[styles.row, { backgroundColor: theme.background }]}>
      <Sidebar />
      <View style={styles.main}>
        <MeasuredArea style={fullWidth ? null : styles.column}>{children}</MeasuredArea>
      </View>
    </View>
  );
}

/**
 * Sign-in and pre-app screens on a computer: a centered phone-width column, so
 * the forms don't stretch across the window.
 */
export function CenteredFrame({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const desktop = useIsDesktop();
  if (!desktop) return <MeasuredArea>{children}</MeasuredArea>;
  return (
    <View style={[styles.main, { backgroundColor: theme.background }]}>
      <MeasuredArea style={styles.authColumn}>{children}</MeasuredArea>
    </View>
  );
}

// MARK: - Sidebar

interface NavItem {
  icon: SFSymbol;
  title: string;
  route: Href;
  /** Other path prefixes that belong to this item (highlighting only). */
  also?: string[];
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const pathOf = (route: Href) => (typeof route === 'string' ? route : route.pathname);

function Sidebar() {
  const theme = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { account, signOut } = useSession();
  const { can } = usePermissions();
  const { phoneNumber } = useSMS();
  const tattoo = useTattooEntry();

  const allowed = (w: WorkspaceItem) => !w.permission || can(w.permission);
  const workspace = WORKSPACE.filter(allowed);
  const pick = (route: string) => workspace.find((w) => pathOf(w.route) === route);
  const used = new Set<string>();
  const take = (...routes: string[]): NavItem[] =>
    routes.flatMap((r) => {
      const w = pick(r);
      if (!w) return [];
      used.add(r);
      return [{ icon: w.icon, title: w.title, route: w.route }];
    });

  const smsActive = phoneNumber?.isActive === true;
  const groups: NavGroup[] = [
    {
      items: [
        { icon: 'house.fill', title: 'Home', route: '/' },
        ...take('/appointments'),
        { icon: 'person.2.fill', title: 'Clients', route: '/clients' },
        {
          icon: 'bubble.left.and.text.bubble.right.fill',
          title: 'AI texting',
          // Once a number is live, the conversations are what owners come for.
          route: smsActive ? '/sms-conversations' : '/sms-setup',
          also: ['/sms-setup', '/sms-conversations', '/messages-settings'],
        },
        ...take('/accounting/invoices', '/payments'),
      ],
    },
    {
      title: 'Business',
      items: [
        { icon: 'scissors', title: 'Services', route: '/services' },
        { icon: 'person.3.fill', title: 'Team', route: '/staff' },
        ...take('/accounting', '/inventory', '/vending', '/analytics'),
      ],
    },
    {
      title: 'Grow',
      items: [
        { icon: 'globe', title: 'Online booking', route: '/online-booking' },
        ...(tattoo.visible
          ? [{ icon: 'paintbrush.fill' as SFSymbol, title: 'Tattoo Studio', route: '/tattoo' as Href }]
          : []),
        ...take('/marketing', '/custom-website', '/special-features'),
      ],
    },
  ];
  // Help and Settings sit at the bottom; anything else added to WORKSPACE later
  // still shows up, under "More", instead of silently missing from the sidebar.
  const bottom = take('/help', '/settings');
  const rest = workspace.filter((w) => !used.has(pathOf(w.route)));
  if (rest.length) groups.push({ title: 'More', items: rest.map(({ icon, title, route }) => ({ icon, title, route })) });

  // Highlight the item whose path is the longest prefix of the current one,
  // so /accounting/invoices lights up Invoices rather than Finances.
  const allItems = [...groups.flatMap((g) => g.items), ...bottom];
  const matches = (prefix: string) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`);
  let active: NavItem | undefined;
  let activeLen = -1;
  for (const item of allItems) {
    for (const p of [pathOf(item.route), ...(item.also ?? [])]) {
      if (matches(p) && p.length > activeLen) {
        active = item;
        activeLen = p.length;
      }
    }
  }

  // Sidebar links start a fresh trail from Home, so a screen's back button
  // leads home rather than through every page opened from the sidebar.
  // dismissTo('/') also covers a page opened by link or refresh, where Home
  // isn't in the trail yet: it then replaces the current page with Home.
  const go = (route: Href) => {
    if (pathOf(route) === pathname) return;
    if (pathname !== '/') router.dismissTo('/');
    if (pathOf(route) !== '/') router.push(route);
  };

  const displayName = resolveDisplayName(account?.name, account?.email);
  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You can sign back in any time with the same email.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <View
      role="navigation"
      aria-label="Main"
      style={[styles.sidebar, { backgroundColor: theme.cardBackground, borderRightColor: theme.divider }]}>
      <View style={styles.brand}>
        <Image source={{ uri: '/icons/icon-192.png' }} style={[styles.logo, { borderRadius: theme.isEditorial ? 2 : 9 }]} />
        <View style={styles.brandText}>
          <Text style={[theme.display(19), { color: theme.primaryText }]} numberOfLines={1}>
            ToolBelt
          </Text>
          {account?.businessName ? (
            <Text style={[styles.business, { color: theme.secondaryText }]} numberOfLines={1}>
              {account.businessName}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/appointments/create')}
        style={({ hovered }: { hovered?: boolean }) => [
          styles.newButton,
          {
            backgroundColor: theme.inverse,
            borderRadius: theme.isEditorial ? 2 : 999,
            opacity: hovered ? 0.9 : 1,
          },
        ]}>
        <Icon name="plus" size={16} weight="semibold" color={theme.onInverse} />
        <Text style={[styles.newButtonText, { color: theme.onInverse }]}>New appointment</Text>
      </Pressable>

      <ScrollView style={styles.fill} contentContainerStyle={styles.nav} showsVerticalScrollIndicator={false}>
        {groups.map((g, gi) =>
          g.items.length ? (
            <View key={g.title ?? gi} style={styles.group}>
              {g.title ? (
                <Text style={[styles.groupTitle, { color: theme.tertiaryText }, theme.isEditorial && styles.tracked]}>
                  {g.title.toUpperCase()}
                </Text>
              ) : null}
              {g.items.map((item) => (
                <SidebarLink key={item.title} item={item} active={item === active} onPress={() => go(item.route)} />
              ))}
            </View>
          ) : null,
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.divider }]}>
        {bottom.map((item) => (
          <SidebarLink key={item.title} item={item} active={item === active} onPress={() => go(item.route)} />
        ))}
        <View style={styles.account}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 16 }]}>
            <Text style={[styles.avatarText, { color: theme.accent }]}>{initials(displayName)}</Text>
          </View>
          <View style={styles.accountText}>
            <Text style={[styles.accountName, { color: theme.primaryText }]} numberOfLines={1}>
              {displayName}
            </Text>
            {account?.email ? (
              <Text style={[styles.accountEmail, { color: theme.tertiaryText }]} numberOfLines={1}>
                {account.email}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={confirmSignOut}
            accessibilityLabel="Sign out"
            style={({ hovered }: { hovered?: boolean }) => [
              styles.signOut,
              { borderRadius: theme.isEditorial ? 2 : 8 },
              hovered && { backgroundColor: theme.inputBackground },
            ]}>
            <Icon name="rectangle.portrait.and.arrow.right" size={17} color={theme.secondaryText} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SidebarLink({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      role="link"
      aria-current={active ? 'page' : undefined}
      style={({ hovered }: { hovered?: boolean }) => [
        styles.link,
        { borderRadius: theme.isEditorial ? 2 : 10 },
        active
          ? { backgroundColor: theme.accentSoft }
          : hovered
            ? { backgroundColor: theme.inputBackground }
            : null,
      ]}>
      <Icon name={item.icon} size={17} color={active ? theme.accent : theme.secondaryText} />
      <Text
        numberOfLines={1}
        style={[
          styles.linkText,
          { color: active ? theme.primaryText : theme.secondaryText },
          active && styles.linkTextActive,
        ]}>
        {item.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0 },
  column: { width: '100%', maxWidth: COLUMN_MAX_WIDTH, alignSelf: 'center' },
  authColumn: { width: '100%', maxWidth: 520, alignSelf: 'center' },

  sidebar: { width: SIDEBAR_WIDTH, borderRightWidth: StyleSheet.hairlineWidth, paddingTop: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 18 },
  logo: { width: 34, height: 34 },
  brandText: { flex: 1, minWidth: 0 },
  business: { fontSize: 12.5, marginTop: 1 },

  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 11,
  },
  newButtonText: { fontSize: 14.5, fontWeight: '600' },

  nav: { paddingHorizontal: 10, paddingBottom: 12, gap: 14 },
  group: { gap: 2 },
  groupTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 12, marginBottom: 4 },
  tracked: { letterSpacing: 1.6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8.5 },
  linkText: { fontSize: 14.5, fontWeight: '500', flex: 1 },
  linkTextActive: { fontWeight: '600' },

  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 14, gap: 2 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingTop: 10 },
  avatar: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12.5, fontWeight: '700' },
  accountText: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 13.5, fontWeight: '600' },
  accountEmail: { fontSize: 12 },
  signOut: { padding: 7 },
});
