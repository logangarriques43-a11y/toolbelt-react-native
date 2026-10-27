/**
 * HamburgerMenu — the schedule's left nav drawer. Port of HamburgerMenuView.swift.
 * Profile header + navigation list. Items whose screens land in later phases
 * (Messages, AI Texting, Online Booking, Waitlist, Import Data, Settings) are
 * "coming soon" stubs; the rest navigate. Logout signs out.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';
import { FeatureFlags } from '@/lib/feature-flags';
import { displayNameFromEmail } from '@/lib/name';
import { clientInitials } from '@/models/client';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function HamburgerMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { account, signOut } = useSession();

  const go = (path: '/appointments/search' | '/clients' | '/services' | '/staff' | '/import-data' | '/messages' | '/sms-conversations' | '/settings' | '/online-booking') => {
    onClose();
    router.push(path);
  };
  const stub = (what: string) => { onClose(); Alert.alert('Coming soon', `${what} arrives in a later phase.`); };
  const dashboard = () => { onClose(); router.dismissAll(); };
  const logout = () => { onClose(); signOut(); };

  const name = account?.name && !account.name.includes('@') ? account.name : displayNameFromEmail(account?.email ?? '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.row}>
        <View style={[styles.panel, { backgroundColor: theme.background }]}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            {/* Profile header */}
            <View style={[styles.profile, { backgroundColor: theme.background }]}>
              <View style={[styles.avatar, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 30 }]}>
                <Text style={[styles.avatarText, { color: theme.onAccent }]}>{clientInitials(name)}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={theme.display(22)} numberOfLines={1}>{account?.businessName || 'Your Business'}</Text>
                <Text style={[styles.business, { color: theme.secondaryText }]} numberOfLines={1}>{name}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.divider }]} />

            <ScrollView contentContainerStyle={styles.list}>
              <Item icon="magnifyingglass" title="Search" filled onPress={() => go('/appointments/search')} />
              <Item icon="house.fill" title="Dashboard" onPress={dashboard} />
              <Item icon="person.3.fill" title="Clients" onPress={() => go('/clients')} />
              <Item icon="list.clipboard.fill" title="Services" onPress={() => go('/services')} />
              <Item icon="message.fill" title="Messages" onPress={() => go('/messages')} />
              <Item icon="bubble.left.and.text.bubble.right.fill" title="AI Texting" onPress={() => go('/sms-conversations')} />
              <Item icon="person.badge.key.fill" title="Staff" onPress={() => go('/staff')} />
              <Item icon="globe" title="Online Booking" onPress={() => go('/online-booking')} />
              {/* Waitlist — hidden for v1.0 (see FeatureFlags). */}
              {FeatureFlags.waitlist ? <Item icon="list.number" title="Waitlist" onPress={() => stub('Waitlist')} /> : null}
              <Item icon="square.and.arrow.down.on.square" title="Import Data" onPress={() => go('/import-data')} />
              <View style={[styles.divider, { backgroundColor: theme.divider, marginVertical: 8 }]} />
              <Item icon="gearshape.fill" title="Settings" onPress={() => go('/settings')} />
              <Item icon="rectangle.portrait.and.arrow.right" title="Logout" destructive onPress={logout} />
            </ScrollView>
          </SafeAreaView>
        </View>

        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

function Item({
  icon, title, filled, destructive, onPress,
}: {
  icon: SFSymbol; title: string; filled?: boolean; destructive?: boolean; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View>
      <Pressable onPress={onPress} style={styles.item}>
        <ThemedIconTile name={icon} size={44} filled={filled} />
        <Text style={[styles.itemTitle, { color: destructive ? iOSColors.red : theme.primaryText }]}>{title}</Text>
        <Icon name="chevron.right" size={14} color={theme.chevronTint} />
      </Pressable>
      <View style={[styles.divider, styles.itemDivider, { backgroundColor: theme.divider }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  panel: { width: '85%', maxWidth: 320 },
  safe: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  avatar: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '600' },
  profileText: { flex: 1, gap: 4 },
  business: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  itemDivider: { marginLeft: 72 },
  list: { padding: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10, paddingHorizontal: 12 },
  itemTitle: { flex: 1, fontSize: 17, fontWeight: '500' },
});
