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

      <Text
        style={[styles.title, { color: theme.primaryText }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        allowFontScaling={false}>
        {title}
      </Text>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64 },
  backText: { color: iOSColors.blue, fontSize: 16, fontWeight: '600' },
  // Base 20 (down from 24) fits most titles; adjustsFontSizeToFit shrinks the
  // longest ("Our Special Features") to one line. marginHorizontal keeps a gap
  // so the title never touches the Back button / right action on Android.
  title: { flex: 1, textAlign: 'center', marginHorizontal: 10, fontSize: 20, fontWeight: '700' },
  right: { minWidth: 64, alignItems: 'flex-end' },
});
