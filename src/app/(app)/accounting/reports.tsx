/**
 * Reports — port of ReportsView.swift (placeholder; "Reports coming soon").
 */

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { ScreenHeader } from '@/components/screen-header';
import { useAppTheme } from '@/theme/theme-context';

export default function Reports() {
  const theme = useAppTheme();
  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Reports" />
        <View style={styles.center}>
          <Text style={[styles.text, { color: theme.secondaryText }]}>Reports coming soon.</Text>
        </View>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15 },
});
