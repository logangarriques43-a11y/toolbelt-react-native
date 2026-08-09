/**
 * Messages — port of MessagesView.swift.
 * Reminders / Follow-ups / Contacts over the local clients + appointments stores,
 * with a compose sheet and a "sent" toast. Actual SMS delivery is Twilio-backed
 * (deferred) so Send is local UI state; the device-contacts source needs the
 * native Contacts framework and is stubbed. Messaging settings live in 6c-ii.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { withOpacity } from '@/lib/color';
import type { Appointment } from '@/models/appointment';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = '#6680F2';
const PURPLE = '#8C59F2';
const GREEN = '#4CBF80';
const PINK = '#FF2D55';
const AMBER = '#F2B333';

type Tab = 'Reminders' | 'Follow-ups' | 'Contacts';
type Filter = 'Past' | 'Today' | 'Future';

const TAB_ICON: Record<Tab, SFSymbol> = {
  Reminders: 'bell.fill',
  'Follow-ups': 'arrow.turn.up.right',
  Contacts: 'person.crop.circle',
};

interface MessageContact {
  name: string;
  phone: string;
  email?: string;
}

const FOLLOWUP_TEMPLATES = [
  'Thanks for coming in! Hope you enjoyed your visit.',
  'Just checking in — how are you feeling after your appointment?',
  "We'd love to see you again! Ready to book your next visit?",
  'Thanks for choosing us! Let us know if you have any questions.',
];

const startOfDay = (d: Date | string) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
const isToday = (iso: string) => startOfDay(iso) === startOfDay(new Date());
const timeFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const headerFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

export default function Messages() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appointments } = useAppointments();
  const { clients } = useClients();

  const [tab, setTab] = useState<Tab>('Reminders');
  const [filter, setFilter] = useState<Filter>('Today');
  const [compose, setCompose] = useState<{ open: boolean; contact?: MessageContact }>({ open: false });
  const [toast, setToast] = useState<string | null>(null);

  const sent = (clientName: string) => {
    setToast(clientName);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Icon name="chevron.left" size={16} color={BLUE} weight="semibold" />
          <Text style={[styles.backText, { color: BLUE }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Messages</Text>
        <Pressable onPress={() => router.push('/messages-settings')} hitSlop={8} style={styles.gear}>
          <Icon name="gearshape.fill" size={20} color={BLUE} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.cardBackground }]}>
        {(['Reminders', 'Follow-ups', 'Contacts'] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
              <View style={styles.tabLabel}>
                <Icon name={TAB_ICON[t]} size={12} color={active ? BLUE : iOSColors.gray} />
                <Text style={[styles.tabText, { color: active ? BLUE : iOSColors.gray }]}>{t}</Text>
              </View>
              <View style={[styles.tabRule, { backgroundColor: active ? BLUE : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.flex}>
        {tab === 'Reminders' && <RemindersTab appointments={appointments} filter={filter} onFilter={setFilter} />}
        {tab === 'Follow-ups' && <FollowUpsTab appointments={appointments} onSend={sent} />}
        {tab === 'Contacts' && (
          <ContactsTab clients={clients} onCompose={(contact) => setCompose({ open: true, contact })} />
        )}
      </View>

      {/* Compose FAB */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={() => setCompose({ open: true })}>
        <LinearGradient colors={[BLUE, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabFill}>
          <Icon name="square.and.pencil" size={22} color="#FFFFFF" weight="semibold" />
        </LinearGradient>
      </Pressable>

      {/* Toast */}
      {toast && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={[styles.toast, { backgroundColor: GREEN }]}>
            <Icon name="checkmark.circle.fill" size={20} color="#FFFFFF" />
            <Text style={styles.toastText}>Follow-up sent to {toast}</Text>
          </View>
        </View>
      )}

      <ComposeSheet
        open={compose.open}
        contact={compose.contact}
        onClose={() => setCompose({ open: false })}
        onSend={(name) => {
          setCompose({ open: false });
          sent(name);
        }}
      />
    </SafeAreaView>
  );
}

// ── Reminders ─────────────────────────────────────────────────────────

function RemindersTab({ appointments, filter, onFilter }: { appointments: Appointment[]; filter: Filter; onFilter: (f: Filter) => void }) {
  const theme = useAppTheme();
  const today = startOfDay(new Date());
  const matches = appointments.filter((a) => {
    const d = startOfDay(a.startTime);
    return filter === 'Past' ? d < today : filter === 'Future' ? d > today : isToday(a.startTime);
  });

  const groups = new Map<number, Appointment[]>();
  for (const a of matches) {
    const key = startOfDay(a.startTime);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(a);
  }
  const keys = [...groups.keys()].sort((a, b) => (filter === 'Past' ? b - a : a - b));

  const headerLabel = (ms: number) => {
    const days = Math.round((ms - today) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === -1) return `Yesterday, ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(ms)}`;
    if (days === 1) return `Tomorrow, ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(ms)}`;
    return headerFmt.format(ms);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        {(['Past', 'Today', 'Future'] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} onPress={() => onFilter(f)} style={[styles.pill, { backgroundColor: active ? BLUE : theme.cardBackground }, !active && lightShadow(theme)]}>
              <Text style={[styles.pillText, { color: active ? '#FFFFFF' : iOSColors.gray }]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.listBody}>
        {keys.length === 0 ? (
          <EmptyState icon="bell.slash.fill" title="No Reminders" subtitle="Reminders will appear here when you have appointments." />
        ) : (
          keys.map((k) => (
            <View key={k} style={styles.group}>
              <Text style={[styles.groupHeader, { color: theme.primaryText }]}>{headerLabel(k)}</Text>
              {groups.get(k)!.map((appt) => (
                <ReminderCard key={appt.id} appointment={appt} filter={filter} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ReminderCard({ appointment, filter }: { appointment: Appointment; filter: Filter }) {
  const theme = useAppTheme();
  const [messageSent, setMessageSent] = useState(false);
  const accent = filter === 'Past' ? PINK : filter === 'Today' ? AMBER : BLUE;
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.cardTag}>
            <Icon name="bell.fill" size={13} color={BLUE} />
            <Text style={[styles.cardTagText, { color: BLUE }]}>Reminder</Text>
          </View>
          {filter === 'Past' ? (
            <View style={styles.statusRow}>
              <Icon name="exclamationmark.circle.fill" size={11} color={PINK} />
              <Text style={[styles.statusText, { color: PINK }]}>Not Sent</Text>
            </View>
          ) : messageSent ? (
            <View style={styles.statusRow}>
              <Icon name="checkmark.circle.fill" size={11} color={GREEN} />
              <Text style={[styles.statusText, { color: GREEN }]}>Sent</Text>
            </View>
          ) : (
            <Pressable onPress={() => setMessageSent(true)} style={[styles.sendPill, { backgroundColor: BLUE }]}>
              <Icon name="paperplane.fill" size={11} color="#FFFFFF" />
              <Text style={styles.sendPillText}>Send</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.clientRow}>
          <LinearGradient colors={[withOpacity(iOSColors.blue, 0.6), withOpacity(iOSColors.purple, 0.6)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(appointment.clientName)}</Text>
          </LinearGradient>
          <View>
            <Text style={[styles.clientName, { color: theme.primaryText }]}>{appointment.clientName}</Text>
            <Text style={[styles.clientMeta, { color: theme.secondaryText }]}>{timeFmt.format(new Date(appointment.startTime))}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Follow-ups ────────────────────────────────────────────────────────

function FollowUpsTab({ appointments, onSend }: { appointments: Appointment[]; onSend: (name: string) => void }) {
  const theme = useAppTheme();
  const today = startOfDay(new Date());
  const sevenAgo = today - 7 * 86_400_000;
  const recent = appointments
    .filter((a) => {
      const d = startOfDay(a.startTime);
      return d < today && d >= sevenAgo;
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <ScrollView contentContainerStyle={styles.followBody}>
      <View style={[styles.infoBanner, { backgroundColor: withOpacity(AMBER, 0.1) }]}>
        <Icon name="lightbulb.fill" size={20} color={AMBER} />
        <View style={styles.flex}>
          <Text style={[styles.infoTitle, { color: theme.primaryText }]}>Automated Follow-ups</Text>
          <Text style={[styles.infoSub, { color: theme.secondaryText }]}>Send follow-up messages to clients after their appointments to keep them engaged.</Text>
        </View>
      </View>
      {recent.length === 0 ? (
        <EmptyState icon="arrow.turn.up.right" title="No Follow-ups Needed" subtitle="Completed appointments will appear here for follow-up messaging." />
      ) : (
        <View style={styles.followList}>
          <Text style={[styles.followHeader, { color: theme.primaryText }]}>Recent Appointments</Text>
          {recent.map((appt) => (
            <FollowUpCard key={appt.id} appointment={appt} onSend={() => onSend(appt.clientName)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function FollowUpCard({ appointment, onSend }: { appointment: Appointment; onSend: () => void }) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [sentState, setSentState] = useState(false);
  const [template, setTemplate] = useState(0);
  const [message, setMessage] = useState(FOLLOWUP_TEMPLATES[0]);

  const daysAgo = () => {
    const d = Math.round((startOfDay(new Date()) - startOfDay(appointment.startTime)) / 86_400_000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    return `${d} days ago`;
  };

  return (
    <View style={[styles.card, styles.followCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Pressable style={styles.followHead} onPress={() => !sentState && setExpanded((v) => !v)}>
        <LinearGradient colors={[withOpacity(iOSColors.blue, 0.6), withOpacity(iOSColors.purple, 0.6)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarLg}>
          <Text style={styles.avatarText}>{initials(appointment.clientName)}</Text>
        </LinearGradient>
        <View style={styles.flex}>
          <Text style={[styles.clientName, { color: theme.primaryText }]}>{appointment.clientName}</Text>
          <Text style={[styles.clientMeta, { color: theme.secondaryText }]}>
            {daysAgo()}  <Text style={{ color: BLUE }}>{appointment.serviceName}</Text>
          </Text>
        </View>
        {sentState ? (
          <Icon name="checkmark.circle.fill" size={22} color={GREEN} />
        ) : (
          <Icon name={expanded ? 'chevron.up' : 'chevron.down'} size={14} color={theme.secondaryText} />
        )}
      </Pressable>
      {expanded && !sentState && (
        <View style={styles.followCompose}>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <Text style={[styles.composeLabel, { color: theme.secondaryText }]}>Quick Messages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
            {FOLLOWUP_TEMPLATES.map((t, i) => {
              const active = template === i;
              return (
                <Pressable key={i} onPress={() => { setTemplate(i); setMessage(t); }} style={[styles.templatePill, { backgroundColor: active ? BLUE : withOpacity(BLUE, 0.1) }]}>
                  <Text numberOfLines={1} style={[styles.templateText, { color: active ? '#FFFFFF' : BLUE }]}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.composeRow}>
            <TextInput value={message} onChangeText={setMessage} placeholder="Type a custom message..." placeholderTextColor={theme.secondaryText} style={[styles.composeInput, { backgroundColor: theme.background, color: theme.primaryText }]} />
            <Pressable onPress={() => { setSentState(true); setExpanded(false); onSend(); }} style={[styles.sendCircle, { backgroundColor: BLUE }]}>
              <Icon name="paperplane.fill" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────

function ContactsTab({ clients, onCompose }: { clients: import('@/models/client').Client[]; onCompose: (c: MessageContact) => void }) {
  const theme = useAppTheme();
  const [source, setSource] = useState<'My Clients' | 'Phone Contacts'>('My Clients');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const filtered = q ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.phoneNumber.includes(search)) : clients;

  return (
    <View style={styles.flex}>
      <View style={styles.sourceRow}>
        {(['My Clients', 'Phone Contacts'] as const).map((s) => {
          const active = source === s;
          return (
            <Pressable key={s} onPress={() => setSource(s)} style={[styles.pill, { backgroundColor: active ? BLUE : theme.cardBackground }, !active && lightShadow(theme)]}>
              <Text style={[styles.pillText, { color: active ? '#FFFFFF' : iOSColors.gray }]}>{s}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.search, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
        <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search contacts..." placeholderTextColor={theme.secondaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
      </View>
      <ScrollView contentContainerStyle={styles.listBody}>
        {source === 'Phone Contacts' ? (
          <View style={styles.phoneStub}>
            <Icon name="person.crop.circle.badge.xmark" size={48} color={withOpacity(iOSColors.gray, 0.4)} />
            <Text style={[styles.phoneStubTitle, { color: theme.primaryText }]}>Phone Contacts</Text>
            <Text style={[styles.phoneStubSub, { color: theme.secondaryText }]}>Importing device contacts needs the native build (Contacts permission). For now, message your clients below.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState icon="person.3.fill" title="No Clients" subtitle="Add clients to send them messages." />
        ) : (
          <View style={[styles.contactCard, { backgroundColor: theme.cardBackground }]}>
            {filtered.map((c, i) => (
              <View key={c.id}>
                <View style={styles.contactRow}>
                  <LinearGradient colors={[withOpacity(iOSColors.blue, 0.5), withOpacity(iOSColors.purple, 0.5)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.contactAvatar}>
                    <Text style={styles.avatarText}>{initials(c.name)}</Text>
                  </LinearGradient>
                  <View style={styles.flex}>
                    <Text style={[styles.clientName, { color: theme.primaryText }]}>{c.name}</Text>
                    <Text style={[styles.clientMeta, { color: theme.secondaryText }]}>{c.phoneNumber}</Text>
                  </View>
                  <Pressable onPress={() => onCompose({ name: c.name, phone: c.phoneNumber, email: c.email })} style={[styles.msgBtn, { backgroundColor: withOpacity(BLUE, 0.1) }]}>
                    <Icon name="message.fill" size={16} color={BLUE} />
                  </Pressable>
                </View>
                {i < filtered.length - 1 && <View style={[styles.contactDivider, { backgroundColor: theme.divider }]} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Compose sheet ─────────────────────────────────────────────────────

const COMPOSE_TEMPLATES: { label: string; icon: SFSymbol; body: string }[] = [
  { label: 'Follow-up', icon: 'arrow.turn.up.right', body: 'Thanks for your visit! We hope to see you again soon.' },
  { label: 'Reminder', icon: 'bell.fill', body: 'Just a reminder about your upcoming appointment with us.' },
  { label: 'Thank You', icon: 'heart.fill', body: 'Thank you for being a valued client! We appreciate your business.' },
  { label: 'Rebook', icon: 'calendar.badge.clock', body: "It's been a while since your last visit. Ready to schedule your next appointment?" },
];

function ComposeSheet({ open, contact, onClose, onSend }: { open: boolean; contact?: MessageContact; onClose: () => void; onSend: (name: string) => void }) {
  const theme = useAppTheme();
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [template, setTemplate] = useState<number | null>(null);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} onShow={() => { setRecipient(''); setMessage(''); setTemplate(null); }}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={[styles.composeHeader, { borderBottomColor: theme.divider }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: BLUE }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>New Message</Text>
          <Text style={[styles.cancel, styles.hidden]}>Cancel</Text>
        </View>
        <KeyboardAwareForm contentContainerStyle={styles.composeBody}>
          <Text style={[styles.composeLabel, { color: theme.secondaryText }]}>To:</Text>
          {contact ? (
            <View style={[styles.recipientCard, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.recipientAvatar, { backgroundColor: withOpacity(BLUE, 0.15) }]}>
                <Text style={[styles.recipientInit, { color: BLUE }]}>{initials(contact.name)}</Text>
              </View>
              <View>
                <Text style={[styles.clientName, { color: theme.primaryText }]}>{contact.name}</Text>
                <Text style={[styles.clientMeta, { color: theme.secondaryText }]}>{contact.phone}</Text>
              </View>
            </View>
          ) : (
            <TextInput value={recipient} onChangeText={setRecipient} placeholder="Client name or phone number" placeholderTextColor={theme.secondaryText} style={[styles.recipientInput, { backgroundColor: theme.cardBackground, color: theme.primaryText }]} />
          )}

          <Text style={[styles.composeLabel, { color: theme.secondaryText }]}>Quick Messages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
            {COMPOSE_TEMPLATES.map((t, i) => {
              const active = template === i;
              return (
                <Pressable key={i} onPress={() => { setTemplate(i); setMessage(t.body); }} style={[styles.composeTemplate, { backgroundColor: active ? BLUE : withOpacity(BLUE, 0.1) }]}>
                  <Icon name={t.icon} size={11} color={active ? '#FFFFFF' : BLUE} />
                  <Text style={[styles.composeTemplateText, { color: active ? '#FFFFFF' : BLUE }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.composeLabel, { color: theme.secondaryText }]}>Message:</Text>
          <TextInput value={message} onChangeText={setMessage} placeholder="Type your message here..." placeholderTextColor={withOpacity(iOSColors.gray, 0.4)} multiline style={[styles.messageInput, { backgroundColor: theme.cardBackground, color: theme.primaryText }]} />
        </KeyboardAwareForm>
        <View style={styles.composeFooter}>
          <Pressable
            disabled={!message.trim()}
            onPress={() => onSend(contact?.name ?? recipient ?? 'client')}
            style={[styles.sendBtn, { backgroundColor: message.trim() ? BLUE : withOpacity(iOSColors.gray, 0.4) }]}>
            <Icon name="paperplane.fill" size={16} color="#FFFFFF" />
            <Text style={styles.sendBtnText}>Send Message</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: SFSymbol; title: string; subtitle: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={44} color={theme.tertiaryText} />
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: theme.secondaryText }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hidden: { opacity: 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700' },
  gear: { minWidth: 70, alignItems: 'flex-end' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center', gap: 6 },
  tabLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabRule: { height: 3, alignSelf: 'stretch', borderRadius: 1.5 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  sourceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  pillText: { fontSize: 13, fontWeight: '600' },
  listBody: { paddingHorizontal: 20, paddingBottom: 100, gap: 14 },
  group: { gap: 10 },
  groupHeader: { fontSize: 15, fontWeight: '700', paddingHorizontal: 4 },
  card: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, gap: 8, paddingVertical: 14, paddingRight: 14, paddingLeft: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTagText: { fontSize: 14, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  sendPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  sendPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarLg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  clientName: { fontSize: 15, fontWeight: '600' },
  clientMeta: { fontSize: 13, marginTop: 2 },
  followBody: { paddingBottom: 100, gap: 16, paddingTop: 14 },
  infoBanner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, marginHorizontal: 20 },
  infoTitle: { fontSize: 14, fontWeight: '700' },
  infoSub: { fontSize: 13, marginTop: 2 },
  followList: { gap: 12 },
  followHeader: { fontSize: 15, fontWeight: '700', paddingHorizontal: 24 },
  followCard: { flexDirection: 'column', marginHorizontal: 20 },
  followHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  followCompose: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  divider: { height: StyleSheet.hairlineWidth },
  composeLabel: { fontSize: 13, fontWeight: '600' },
  templateRow: { gap: 8 },
  templatePill: { maxWidth: 220, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  templateText: { fontSize: 12, fontWeight: '500' },
  composeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  composeInput: { flex: 1, padding: 12, borderRadius: 10, fontSize: 15 },
  sendCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginHorizontal: 20, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  contactCard: { borderRadius: 14, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  contactAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  msgBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  contactDivider: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  phoneStub: { alignItems: 'center', gap: 12, paddingTop: 40, paddingHorizontal: 30 },
  phoneStubTitle: { fontSize: 18, fontWeight: '700' },
  phoneStubSub: { fontSize: 14, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, overflow: 'hidden', shadowColor: BLUE, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999 },
  toastText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  composeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  cancel: { fontSize: 16 },
  composeBody: { padding: 20, gap: 10 },
  recipientCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  recipientAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  recipientInit: { fontSize: 13, fontWeight: '700' },
  recipientInput: { padding: 12, borderRadius: 12, fontSize: 16 },
  composeTemplate: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  composeTemplateText: { fontSize: 13, fontWeight: '500' },
  messageInput: { minHeight: 120, padding: 12, borderRadius: 12, fontSize: 15, textAlignVertical: 'top' },
  composeFooter: { paddingHorizontal: 20, paddingVertical: 16 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 14, paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center' },
});
