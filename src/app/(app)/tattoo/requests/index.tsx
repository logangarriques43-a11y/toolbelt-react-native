/**
 * Tattoo requests — newest first. The API has no client name on a request, so
 * it comes from the SMS conversation with the same id.
 */

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listTattooIntakes } from '@/api/tattoo';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { IntakeStatusPill } from '@/components/tattoo/intake-status-pill';
import { ThemedButton } from '@/components/themed';
import { useSession } from '@/context/session';
import { useSMS } from '@/context/sms-store';
import { tattooKeys } from '@/hooks/use-tattoo';
import { errorMessage } from '@/lib/api-client';
import { reviewReasonText } from '@/lib/tattoo';
import { conversationDisplayName } from '@/models/sms';
import type { TattooIntake } from '@/models/tattoo';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export default function TattooRequests() {
  const theme = useAppTheme();
  const { uid } = useSession();
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: tattooKeys.intakes(uid),
    queryFn: listTattooIntakes,
    enabled: !!uid,
  });

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Requests" />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error || !data ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: theme.secondaryText }]}>
              {errorMessage(error, "Couldn't load requests.")}
            </Text>
            <ThemedButton title="Try again" kind="quiet" onPress={() => refetch()} />
          </View>
        ) : data.length === 0 ? (
          <View style={styles.center}>
            <Text style={theme.display(22)}>No requests yet</Text>
            <Text style={[styles.message, { color: theme.secondaryText }]}>
              Requests show up here when a client texts a photo.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.accent} />}>
            {data.map((intake) => (
              <RequestRow key={intake.id} intake={intake} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

function RequestRow({ intake }: { intake: TattooIntake }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { conversationById } = useSMS();
  const conversation = conversationById(intake.conversationId);
  const date = intake.updatedAt ?? intake.createdAt;
  const summary = [intake.placement, intake.size].filter(Boolean).join(', ');

  return (
    <Pressable onPress={() => router.push(`/tattoo/requests/${intake.id}`)} style={[styles.row, theme.card]}>
      <View style={styles.rowTop}>
        <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={1}>
          {conversation ? conversationDisplayName(conversation) : 'Text request'}
        </Text>
        <IntakeStatusPill status={intake.status} />
        <Icon name="chevron.right" size={12} color={theme.chevronTint} />
      </View>
      {intake.status === 'needs_review' ? (
        <Text style={[styles.reason, { color: iOSColors.orange }]}>{reviewReasonText(intake.reviewReason)}</Text>
      ) : null}
      <Text style={[styles.meta, { color: theme.secondaryText }]} numberOfLines={1}>
        {[summary, date ? dateFmt.format(new Date(date)) : null].filter(Boolean).join(' · ')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { fontSize: 15, textAlign: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  row: { padding: 14, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  reason: { fontSize: 13, fontWeight: '500' },
  meta: { fontSize: 13 },
});
