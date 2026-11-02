/**
 * SignedPhoto — an image behind a short-lived signed link. Held in memory only,
 * so a client's photo never lands in the disk cache. A missing or failed link
 * shows "Photo unavailable".
 */

import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

export function SignedPhoto({ url, style }: { url: string | null | undefined; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!url || failedUrl === url) {
    return (
      <View style={[styles.frame, styles.missing, { backgroundColor: theme.inputBackground }, style]}>
        <Icon name="photo.fill" size={18} color={theme.tertiaryText} />
        <Text style={[styles.missingText, { color: theme.secondaryText }]}>Photo unavailable</Text>
      </View>
    );
  }
  return (
    <View style={[styles.frame, { backgroundColor: theme.inputBackground }, style]}>
      <Image
        source={{ uri: url }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory"
        accessibilityLabel="Photo"
        onError={() => setFailedUrl(url)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  missing: { alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 },
  missingText: { fontSize: 12, textAlign: 'center' },
});
