/**
 * ScreenHeader — the standard "‹ Back · Title · right action" header used by
 * the list/detail screens across the app (Services, Clients, etc.).
 */

import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const back = onBack ?? (() => router.back());

  return (
    <View style={styles.row}>
      <Pressable onPress={back} hitSlop={8} style={styles.back}>
        <Icon name="chevron.left" size={16} weight="semibold" color={iOSColors.blue} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={[styles.title, { color: theme.primaryText }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 72 },
  backText: { color: iOSColors.blue, fontSize: 16, fontWeight: '600' },
  title: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '700' },
  right: { minWidth: 72, alignItems: 'flex-end' },
});
