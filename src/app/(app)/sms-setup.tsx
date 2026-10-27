/**
 * AI Texting setup — port of SMSSetupView.swift.
 * intro → area code → provisioning → success / already-set-up. Provisions a (fake)
 * business number into the stub store; real Twilio provisioning is deferred.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsentQRCard } from '@/components/sms/consent-qr-card';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';
import { useSMS } from '@/context/sms-store';
import { formatPhone, POPULAR_AREA_CODES } from '@/models/sms';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Step = 'intro' | 'areaCode' | 'provisioning' | 'success' | 'alreadySetUp';

export default function SMSSetup() {
  const theme = useAppTheme();
  const router = useRouter();
  const sms = useSMS();
  const { account } = useSession();
  const [step, setStep] = useState<Step>(sms.phoneNumber ? 'alreadySetUp' : 'intro');
  const [areaCode, setAreaCode] = useState('');

  useEffect(() => {
    if (sms.phoneNumber && step === 'intro') setStep('alreadySetUp');
  }, [sms.phoneNumber, step]);

  const provision = () => {
    setStep('provisioning');
    setTimeout(() => {
      sms.provision(areaCode || undefined, account?.businessName);
      setStep('success');
    }, 900);
  };

  const formatted = sms.phoneNumber ? formatPhone(sms.phoneNumber.phoneNumber) : '';

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Icon name="chevron.left" size={16} color={theme.accent} weight="semibold" />
            <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, theme.display(24)]}>AI Texting</Text>
          <View style={styles.back} />
        </View>

        <KeyboardAwareForm contentContainerStyle={styles.body}>
          {step === 'intro' && (
            <View style={styles.center}>
              <ThemedIconTile name="bubble.left.and.text.bubble.right.fill" size={72} filled style={styles.hero} />
              <Text style={[styles.title, theme.display(24)]}>AI-Powered Texting</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                Get a dedicated business phone number. An AI assistant will text your clients to handle bookings, rescheduling, and cancellations automatically.
              </Text>
              <View style={[styles.featureCard, theme.card]}>
                <Feature icon="phone.fill" title="Your Own Business Number" subtitle="Clients text this number to book" />
                <Divider />
                <Feature icon="brain" title="AI Handles Conversations" subtitle="Books, reschedules, and cancels automatically" />
                <Divider />
                <Feature icon="calendar.badge.plus" title="Auto-Adds to Calendar" subtitle="Appointments appear in your schedule" />
                <Divider />
                <Feature icon="eye.fill" title="You See Everything" subtitle="View all conversations and take over anytime" />
              </View>
              <ThemedButton title="Get Started" onPress={() => setStep('areaCode')} style={styles.btn} />
            </View>
          )}

          {step === 'areaCode' && (
            <View style={styles.center}>
              <Text style={[styles.title, theme.display(24)]}>Choose Your Area Code</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Pick an area code so your business number looks local to your clients.</Text>
              <View style={[styles.search, { backgroundColor: theme.inputBackground }]}>
                <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
                <TextInput
                  value={areaCode}
                  onChangeText={(t) => setAreaCode(t.replace(/[^0-9]/g, '').slice(0, 3))}
                  placeholder="Area code (e.g. 310)"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="number-pad"
                  style={[styles.searchInput, { color: theme.primaryText }]}
                />
                {areaCode.length > 0 && (
                  <Pressable onPress={() => setAreaCode('')} hitSlop={8}>
                    <Icon name="xmark.circle.fill" size={16} color={theme.secondaryText} />
                  </Pressable>
                )}
              </View>
              <Text style={[styles.orText, { color: theme.secondaryText }]}>Or pick a popular one:</Text>
              <View style={styles.codeGrid}>
                {POPULAR_AREA_CODES.map((ac) => {
                  const active = areaCode === ac.code;
                  return (
                    <Pressable
                      key={ac.code}
                      onPress={() => setAreaCode(ac.code)}
                      style={[styles.codeCard, { backgroundColor: active ? theme.accentSoft : theme.cardBackground, borderColor: active ? theme.accent : theme.divider, borderRadius: theme.isEditorial ? 2 : 12 }]}>
                      <Text style={[styles.codeNum, { color: active ? theme.accent : theme.primaryText }]}>{ac.code}</Text>
                      <Text style={[styles.codeCity, { color: theme.secondaryText }]} numberOfLines={1}>{ac.city}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedButton title={areaCode ? `Get a ${areaCode} Number` : 'Get Any Available Number'} onPress={provision} style={styles.btn} />
              <Pressable onPress={() => setStep('intro')}>
                <Text style={[styles.goBack, { color: theme.secondaryText }]}>Go Back</Text>
              </Pressable>
            </View>
          )}

          {step === 'provisioning' && (
            <View style={[styles.center, styles.provisioning]}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.title, theme.display(24)]}>Setting up your number...</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>This usually takes a few seconds</Text>
            </View>
          )}

          {(step === 'success' || step === 'alreadySetUp') && (
            <View style={styles.center}>
              <View style={[styles.hero, styles.successHero, { backgroundColor: theme.liveSoft, borderRadius: theme.isEditorial ? 2 : 22 }]}>
                <Icon name={step === 'success' ? 'checkmark.circle.fill' : 'checkmark.seal.fill'} size={step === 'success' ? 40 : 32} color={theme.live} />
              </View>
              <Text style={[styles.title, theme.display(24)]}>{step === 'success' ? "You're All Set!" : 'AI Texting Active'}</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{step === 'success' ? 'Your business AI texting number is:' : 'Your business number:'}</Text>
              <View style={[styles.numberCard, theme.card]}>
                <Text style={[styles.number, theme.display(30, '500')]}>{formatted}</Text>
              </View>
              {step === 'success' && (
                <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                  Clients can text this number to book appointments. The AI will handle conversations and add bookings to your calendar.
                </Text>
              )}
              {/* In-person opt-in QR (placeholder until Online Booking supplies the consent URL). */}
              <ConsentQRCard />
              <ThemedButton title="View Conversations" onPress={() => router.replace('/sms-conversations')} style={styles.btn} />
              {step === 'alreadySetUp' && (
                <Pressable onPress={() => { sms.release(); setStep('intro'); }}>
                  <Text style={[styles.deactivate, { color: iOSColors.red }]}>Deactivate AI Texting</Text>
                </Pressable>
              )}
            </View>
          )}
        </KeyboardAwareForm>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Feature({ icon, title, subtitle }: { icon: SFSymbol; title: string; subtitle: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.feature}>
      <ThemedIconTile name={icon} size={44} />
      <View style={styles.flex}>
        <Text style={[styles.featureTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.featureSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.featureDivider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center' },
  body: { padding: 16, paddingBottom: 40 },
  center: { alignItems: 'center', gap: 16 },
  provisioning: { paddingTop: 80, gap: 20 },
  hero: { marginTop: 12 },
  successHero: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 8, lineHeight: 22 },
  featureCard: { alignSelf: 'stretch', paddingVertical: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  featureTitle: { fontSize: 16, fontWeight: '600' },
  featureSub: { fontSize: 13, marginTop: 2 },
  featureDivider: { height: StyleSheet.hairlineWidth, marginLeft: 74 },
  btn: { alignSelf: 'stretch', marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, alignSelf: 'stretch' },
  searchInput: { flex: 1, fontSize: 16 },
  orText: { fontSize: 14 },
  codeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignSelf: 'stretch', justifyContent: 'space-between' },
  codeCard: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1.5 },
  codeNum: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  codeCity: { fontSize: 12, flexShrink: 1 },
  goBack: { fontSize: 16, marginTop: 4 },
  numberCard: { paddingVertical: 20, paddingHorizontal: 32 },
  number: { fontVariant: ['tabular-nums'] },
  deactivate: { fontSize: 14, marginTop: 4 },
});
