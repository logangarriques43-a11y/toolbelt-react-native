/**
 * Tattoo request detail. Photo links are signed for 15 minutes, so this query
 * refetches on open, renews while open, and isn't kept after the screen closes.
 * Owners can decline the request or change the suggested artist.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTattooIntake, updateTattooIntake } from '@/api/tattoo';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { SignedPhoto } from '@/components/signed-photo';
import { IntakeStatusPill } from '@/components/tattoo/intake-status-pill';
import { ThemedButton } from '@/components/themed';
import { usePermissions } from '@/context/permissions-store';
import { useSession } from '@/context/session';
import { useSMS } from '@/context/sms-store';
import { useStaff } from '@/context/staff-store';
import { SIGNED_LINK_QUERY, tattooKeys, useTattooSettings } from '@/hooks/use-tattoo';
import { errorMessage } from '@/lib/api-client';
import { withOpacity } from '@/lib/color';
import { canDecline, canMarkReviewed, declineWarning, depositStatusLabel, reviewReasonText, styleLabel } from '@/lib/tattoo';
import { conversationDisplayName, formatPhone } from '@/models/sms';
import type { TattooIntake, TattooIntakePhoto, TattooIntakeUpdate } from '@/models/tattoo';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function TattooRequestDetail() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { uid } = useSession();
  const { data, isLoading, error, refetch } = useQuery({
    ...SIGNED_LINK_QUERY,
    queryKey: tattooKeys.intake(uid, id),
    queryFn: () => getTattooIntake(id),
    enabled: !!uid && !!id,
  });

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Request" />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : !data ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: theme.secondaryText }]}>
              {errorMessage(error, "Couldn't load this request.")}
            </Text>
            <ThemedButton title="Try again" kind="quiet" onPress={() => refetch()} />
          </View>
        ) : (
          <RequestContent intake={data} />
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

function RequestContent({ intake }: { intake: TattooIntake }) {
  const theme = useAppTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { uid } = useSession();
  const { role, can } = usePermissions();
  const { staff } = useStaff();
  const { conversationById } = useSMS();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  const isOwner = role === 'owner';
  const conversation = conversationById(intake.conversationId);
  const artist = intake.suggestedStaffId ? staff.find((s) => s.id === intake.suggestedStaffId) : undefined;
  const artistName = !intake.suggestedStaffId ? 'None yet' : (artist?.name ?? 'Unknown artist');
  const artistOptions = staff.filter((s) => s.isActive).map((s) => ({ label: s.name, value: s.id }));
  // The conversation list only holds recent threads, so the request's own name
  // comes next. Its phone number is the one the server limits to owners.
  const clientName = conversation ? conversationDisplayName(conversation) : (intake.customerName ?? 'Text request');

  const update = async (changes: TattooIntakeUpdate, failureTitle: string) => {
    setBusy(true);
    try {
      const next = await updateTattooIntake(intake.id, changes);
      qc.setQueryData(tattooKeys.intake(uid, intake.id), next);
      await qc.invalidateQueries({ queryKey: tattooKeys.intakes(uid) });
    } catch (e) {
      Alert.alert(failureTitle, errorMessage(e, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDecline = () =>
    Alert.alert('Mark as declined?', declineWarning(intake), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark declined',
        style: 'destructive',
        onPress: () => update({ status: 'declined' }, "Couldn't decline this request"),
      },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={[styles.card, theme.card]}>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={1}>
              {clientName}
            </Text>
            {intake.customerPhone ? (
              <Text style={[styles.sub, { color: theme.secondaryText }]}>{formatPhone(intake.customerPhone)}</Text>
            ) : null}
          </View>
          <IntakeStatusPill status={intake.status} />
        </View>
        {conversation && can('viewMessages') ? (
          <Pressable onPress={() => router.push(`/sms-conversations/${conversation.id}`)} style={styles.link} hitSlop={8}>
            <Text style={[styles.linkText, { color: theme.accent }]}>Open conversation</Text>
            <Icon name="chevron.right" size={12} color={theme.accent} />
          </Pressable>
        ) : null}
      </View>

      {intake.status === 'needs_review' ? (
        <View style={[styles.review, { backgroundColor: withOpacity(iOSColors.orange, 0.12), borderRadius: theme.isEditorial ? 2 : 12 }]}>
          <Icon name="exclamationmark.triangle.fill" size={18} color={iOSColors.orange} />
          <View style={styles.flex}>
            <Text style={[styles.reviewTitle, { color: iOSColors.orange }]}>Needs review</Text>
            <Text style={[styles.reviewText, { color: theme.primaryText }]}>{reviewReasonText(intake.reviewReason)}</Text>
          </View>
        </View>
      ) : null}

      {intake.photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}

      <View style={[styles.card, theme.card]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Details</Text>
        <Detail label="Placement" value={intake.placement} />
        <Detail label="Size" value={intake.size} />
        <Detail label="Color" value={intake.colorMode} />
        <Detail label="Budget" value={intake.budget} />
        <Detail label="Timeframe" value={intake.timeframe} />
        {intake.notes ? <Detail label="Notes" value={intake.notes} /> : null}
      </View>

      <View style={[styles.card, theme.card]}>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text style={[styles.sub, { color: theme.secondaryText }]}>Suggested artist</Text>
            <Text style={[styles.value, { color: theme.primaryText }]}>{artistName}</Text>
          </View>
          {isOwner && artistOptions.length > 0 ? (
            <Pressable onPress={() => setPicking(true)} disabled={busy} hitSlop={8}>
              <Text style={[styles.linkText, { color: theme.accent }]}>Change</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={[styles.rule, { backgroundColor: theme.divider }]} />
        <Detail label="Deposit" value={depositStatusLabel(intake.depositStatus)} />
      </View>

      {isOwner && canMarkReviewed(intake) ? (
        <ThemedButton
          title="Mark reviewed"
          loading={busy}
          onPress={() => update({ status: 'collecting' }, "Couldn't clear this review")}
        />
      ) : null}

      {isOwner && canDecline(intake) ? (
        <ThemedButton title="Mark declined" kind="quiet" loading={busy} onPress={confirmDecline} />
      ) : null}

      <OptionSheet
        visible={picking}
        title="Suggested artist"
        options={artistOptions}
        selected={intake.suggestedStaffId ?? ''}
        onClose={() => setPicking(false)}
        onSelect={(staffId) => {
          if (staffId !== intake.suggestedStaffId) {
            update({ suggestedStaffId: staffId }, "Couldn't change the artist");
          }
        }}
      />
    </ScrollView>
  );
}

function PhotoCard({ photo }: { photo: TattooIntakePhoto }) {
  const theme = useAppTheme();
  const { data: settings } = useTattooSettings();
  const analysis = photo.analysis;
  const labels = analysis?.styles ?? [];

  return (
    <View style={[styles.card, theme.card]}>
      <SignedPhoto url={photo.url} style={[styles.photo, { borderRadius: theme.isEditorial ? 2 : 10 }]} />
      {analysis ? (
        <>
          {labels.length > 0 ? (
            <View style={styles.tags}>
              {labels.map((style) => (
                <View key={style.name} style={[styles.tag, { backgroundColor: theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 999 }]}>
                  <Text style={[styles.tagText, { color: theme.accent }]}>{styleLabel(style.name, settings?.styles)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {analysis.artistNote ? <Text style={[styles.note, { color: theme.primaryText }]}>{analysis.artistNote}</Text> : null}
        </>
      ) : (
        <Text style={[styles.sub, { color: theme.secondaryText }]}>The AI didn&apos;t read this photo.</Text>
      )}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detail}>
      <Text style={[styles.sub, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.value, { color: value ? theme.primaryText : theme.tertiaryText }]}>{value ?? 'Not given yet'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { fontSize: 15, textAlign: 'center' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { padding: 16, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 18, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13 },
  value: { fontSize: 15, fontWeight: '500' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 15, fontWeight: '600' },
  review: { flexDirection: 'row', gap: 12, padding: 14 },
  reviewTitle: { fontSize: 15, fontWeight: '700' },
  reviewText: { fontSize: 14, marginTop: 2 },
  photo: { width: '100%', aspectRatio: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '600' },
  note: { fontSize: 14, lineHeight: 20 },
  detail: { gap: 2 },
  rule: { height: StyleSheet.hairlineWidth },
});
