/**
 * HamburgerMenu — the schedule's left nav drawer. Port of HamburgerMenuView.swift.
 * Profile header + navigation list. Items whose screens land in later phases
 * (Messages, AI Texting, Online Booking, Waitlist, Import Data, Settings) are
 * "coming soon" stubs; the rest navigate. Logout signs out.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useSession } from '@/context/session';
import { withOpacity } from '@/lib/color';
import { FeatureFlags } from '@/lib/feature-flags';
import { displayNameFromEmail } from '@/lib/name';
import { clientInitials } from '@/models/client';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const PROFILE_BLUE = '#4285F5';

export function HamburgerMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { account, signOut } = useSession();

  const go = (path: '/appointments/search' | '/clients' | '/services' | '/staff' | '/import-data' | '/messages' | '/sms-conversations') => {
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
        <View style={[styles.panel, { backgroundColor: theme.cardBackground }]}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            {/* Profile header */}
            <LinearGradient colors={[theme.gradientTop, theme.gradientBottom]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.profile}>
              <View style={[styles.avatar, { backgroundColor: PROFILE_BLUE }]}>
                <Text style={styles.avatarText}>{clientInitials(name)}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.business, { color: PROFILE_BLUE }]} numberOfLines={1}>
                  {account?.businessName || 'Your Business'}
                </Text>
              </View>
            </LinearGradient>

            <View style={[styles.divider, { backgroundColor: withOpacity(iOSColors.gray, 0.3) }]} />

            <ScrollView contentContainerStyle={styles.list}>
              <Item icon="magnifyingglass" title="Search" color="#FFFFFF" gradient onPress={() => go('/appointments/search')} />
              <Item icon="house.fill" title="Dashboard" color={PROFILE_BLUE} onPress={dashboard} />
              <Item icon="person.3.fill" title="Clients" color="#4CBF80" onPress={() => go('/clients')} />
              <Item icon="list.clipboard.fill" title="Services" color="#9966E6" onPress={() => go('/services')} />
              <Item icon="message.fill" title="Messages" color="#F29933" onPress={() => go('/messages')} />
              <Item icon="bubble.left.and.text.bubble.right.fill" title="AI Texting" color="#3380FF" onPress={() => go('/sms-conversations')} />
              <Item icon="person.badge.key.fill" title="Staff" color="#F29933" onPress={() => go('/staff')} />
              <Item icon="globe" title="Online Booking" color="#66B3E6" onPress={() => stub('Online Booking')} />
              {/* Waitlist — hidden for v1.0 (see FeatureFlags). */}
              {FeatureFlags.waitlist ? <Item icon="list.number" title="Waitlist" color="#E68099" onPress={() => stub('Waitlist')} /> : null}
              <Item icon="square.and.arrow.down.on.square" title="Import Data" color="#33B399" onPress={() => go('/import-data')} />
              <View style={[styles.divider, { backgroundColor: withOpacity(iOSColors.gray, 0.3), marginVertical: 8 }]} />
              <Item icon="gearshape.fill" title="Settings" color={iOSColors.gray} onPress={() => stub('Settings')} />
              <Item icon="rectangle.portrait.and.arrow.right" title="Logout" color={iOSColors.red} onPress={logout} />
            </ScrollView>
          </SafeAreaView>
        </View>

        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

function Item({
  icon, title, color, gradient, onPress,
}: {
  icon: SFSymbol; title: string; color: string; gradient?: boolean; onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.item}>
      {gradient ? (
        <LinearGradient colors={['#4285F5', '#8C59F2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.itemIcon}>
          <Icon name={icon} size={20} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={[styles.itemIcon, { backgroundColor: withOpacity(color, 0.15) }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
      )}
      <Text style={[styles.itemTitle, { color: theme.primaryText }]}>{title}</Text>
      <Icon name="chevron.right" size={14} color={withOpacity(iOSColors.gray, 0.5)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  panel: { width: '85%', maxWidth: 320 },
  safe: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  profileText: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontWeight: '700' },
  business: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  list: { padding: 12, gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 12 },
  itemIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { flex: 1, fontSize: 18, fontWeight: '500' },
});
