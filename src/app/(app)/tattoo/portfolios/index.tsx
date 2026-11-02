/** Portfolios — pick an artist. Lists the active team. */

import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useStaff } from '@/context/staff-store';
import { errorMessage } from '@/lib/api-client';
import { staffInitials } from '@/models/staff';
import { useAppTheme } from '@/theme/theme-context';

export default function TattooPortfolios() {
  const theme = useAppTheme();
  const router = useRouter();
  const { staff, isLoading, error } = useStaff();
  const artists = staff.filter((s) => s.isActive);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Portfolios" />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error && artists.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: theme.secondaryText }]}>
              {errorMessage(error, "Couldn't load your team.")}
            </Text>
          </View>
        ) : artists.length === 0 ? (
          <View style={styles.center}>
            <Text style={theme.display(22)}>No artists yet</Text>
            <Text style={[styles.message, { color: theme.secondaryText }]}>Add your team under Staff first.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {artists.map((artist) => (
              <Pressable
                key={artist.id}
                onPress={() => router.push(`/tattoo/portfolios/${artist.id}`)}
                style={[styles.row, theme.card]}>
                <View style={[styles.avatar, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 22 }]}>
                  <Text style={[styles.avatarText, { color: theme.onAccent }]}>{staffInitials(artist.name)}</Text>
                </View>
                <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={1}>{artist.name}</Text>
                <Icon name="chevron.right" size={12} color={theme.chevronTint} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { fontSize: 15, textAlign: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
});
