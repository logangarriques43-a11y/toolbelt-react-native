/**
 * AI Texting setup — port of SMSSetupView.swift.
 * intro → area code → provisioning → success / already-set-up. Provisions a (fake)
 * business number into the stub store; real Twilio provisioning is deferred.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { useSession } from '@/context/session';
import { useSMS } from '@/context/sms-store';
import { withOpacity } from '@/lib/color';
import { formatPhone, POPULAR_AREA_CODES } from '@/models/sms';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = '#4285F5';
const PURPLE = '#9966E6';
const GREEN = '#4CBF80';
const AMBER = '#F29933';

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
            <Icon name="chevron.left" size={16} color={BLUE} weight="semibold" />
            <Text style={[styles.backText, { color: BLUE }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>AI Texting</Text>
          <View style={styles.back} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {step === 'intro' && (
            <View style={styles.center}>
              <View style={[styles.hero, { backgroundColor: withOpacity(BLUE, 0.15) }]}>
                <Icon name="bubble.left.and.text.bubble.right.fill" size={44} color={BLUE} />
              </View>
              <Text style={[styles.title, { color: theme.primaryText }]}>AI-Powered Texting</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                Get a dedicated business phone number. An AI assistant will text your clients to handle bookings, rescheduling, and cancellations automatically.
              </Text>
              <View style={[styles.featureCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <Feature icon="phone.fill" title="Your Own Business Number" subtitle="Clients text this number to book" color={BLUE} />
                <Divider />
                <Feature icon="brain" title="AI Handles Conversations" subtitle="Books, reschedules, and cancels automatically" color={PURPLE} />
                <Divider />
                <Feature icon="calendar.badge.plus" title="Auto-Adds to Calendar" subtitle="Appointments appear in your schedule" color={GREEN} />
                <Divider />
                <Feature icon="eye.fill" title="You See Everything" subtitle="View all conversations and take over anytime" color={AMBER} />
              </View>
              <GradientButton label="Get Started" onPress={() => setStep('areaCode')} />
            </View>
          )}

          {step === 'areaCode' && (
            <View style={styles.center}>
              <Text style={[styles.title, { color: theme.primaryText }]}>Choose Your Area Code</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Pick an area code so your business number looks local to your clients.</Text>
              <View style={[styles.search, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
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
                      style={[styles.codeCard, { backgroundColor: active ? withOpacity(BLUE, 0.1) : theme.cardBackground, borderColor: active ? BLUE : 'transparent' }, lightShadow(theme)]}>
                      <Text style={[styles.codeNum, { color: active ? BLUE : theme.primaryText }]}>{ac.code}</Text>
                      <Text style={[styles.codeCity, { color: theme.secondaryText }]} numberOfLines={1}>{ac.city}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <GradientButton label={areaCode ? `Get a ${areaCode} Number` : 'Get Any Available Number'} onPress={provision} />
              <Pressable onPress={() => setStep('intro')}>
                <Text style={[styles.goBack, { color: theme.secondaryText }]}>Go Back</Text>
              </Pressable>
            </View>
          )}

          {step === 'provisioning' && (
            <View style={[styles.center, styles.provisioning]}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={[styles.title, { color: theme.primaryText }]}>Setting up your number...</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>This usually takes a few seconds</Text>
            </View>
          )}

          {(step === 'success' || step === 'alreadySetUp') && (
            <View style={styles.center}>
              <View style={[styles.hero, { backgroundColor: withOpacity(GREEN, 0.15) }]}>
                <Icon name={step === 'success' ? 'checkmark.circle.fill' : 'checkmark.seal.fill'} size={step === 'success' ? 56 : 40} color={GREEN} />
              </View>
              <Text style={[styles.title, { color: theme.primaryText }]}>{step === 'success' ? "You're All Set!" : 'AI Texting Active'}</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{step === 'success' ? 'Your business AI texting number is:' : 'Your business number:'}</Text>
              <View style={[styles.numberCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <Text style={[styles.number, { color: theme.primaryText }]}>{formatted}</Text>
              </View>
              {step === 'success' && (
                <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                  Clients can text this number to book appointments. The AI will handle conversations and add bookings to your calendar.
                </Text>
              )}
              <GradientButton label="View Conversations" onPress={() => router.replace('/sms-conversations')} />
              {step === 'alreadySetUp' && (
                <Pressable onPress={() => { sms.release(); setStep('intro'); }}>
                  <Text style={[styles.deactivate, { color: iOSColors.red }]}>Deactivate AI Texting</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Feature({ icon, title, subtitle, color }: { icon: SFSymbol; title: string; subtitle: string; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: withOpacity(color, 0.15) }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
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

function GradientButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.btnWrap}>
      <LinearGradient colors={[BLUE, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
        <Text style={styles.btnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 40 },
  center: { alignItems: 'center', gap: 16 },
  provisioning: { paddingTop: 80, gap: 20 },
  hero: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 8, lineHeight: 22 },
  featureCard: { alignSelf: 'stretch', borderRadius: 16, paddingVertical: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  featureIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '600' },
  featureSub: { fontSize: 13, marginTop: 2 },
  featureDivider: { height: StyleSheet.hairlineWidth, marginLeft: 74 },
  btnWrap: { alignSelf: 'stretch', marginTop: 8 },
  btn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, alignSelf: 'stretch' },
  searchInput: { flex: 1, fontSize: 16 },
  orText: { fontSize: 14 },
  codeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignSelf: 'stretch', justifyContent: 'space-between' },
  codeCard: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1.5 },
  codeNum: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  codeCity: { fontSize: 12, flexShrink: 1 },
  goBack: { fontSize: 16, marginTop: 4 },
  numberCard: { paddingVertical: 20, paddingHorizontal: 32, borderRadius: 16 },
  number: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  deactivate: { fontSize: 14, marginTop: 4 },
});
