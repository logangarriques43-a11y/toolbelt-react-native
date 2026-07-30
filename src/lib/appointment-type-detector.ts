/**
 * Smart appointment-type detection for the import flow — port of
 * AppointmentTypeDetector.swift.
 *
 * Calendar exports usually encode the service in the event title alongside the
 * client ("Joe Smith - Massage", "Massage - Joe Smith", "Haircut with Ann
 * Lee"). This splits those titles, decides which side is the service (existing
 * service match, then corpus frequency, then service vocabulary, then
 * person-name heuristic), groups appointments by a canonical service key, and
 * proposes a default resolution per group. The review sheet then lets the owner
 * confirm or correct each one.
 */

import { uuid } from '@/lib/id';
import type { Service } from '@/models/service';
import type { StaffMember } from '@/models/staff';
import type { DetectedServiceGroup, ParsedAppointment, Resolution } from '@/models/import-data';

// Separators seen between client and service in a title. Earliest match wins.
const SEPARATORS = [' - ', ' – ', ' — ', ' | ', ': ', ' w/ ', ' with ', ' for '];

// Common service vocabulary — a tie-breaker when frequency/existing services
// don't identify the service side.
const SERVICE_WORDS = new Set([
  'massage', 'haircut', 'cut', 'color', 'colour', 'highlights', 'blowout',
  'styling', 'style', 'trim', 'shave', 'beard', 'manicure', 'pedicure',
  'nails', 'nail', 'gel', 'acrylic', 'facial', 'wax', 'waxing', 'lash',
  'lashes', 'brow', 'brows', 'tan', 'tanning', 'therapy', 'treatment',
  'consultation', 'consult', 'session', 'appointment', 'service',
  'cleaning', 'clean', 'repair', 'install', 'installation', 'detail',
  'detailing', 'grooming', 'training', 'lesson', 'class', 'tattoo',
  'piercing', 'botox', 'filler', 'peel', 'extension', 'extensions',
  'balayage', 'perm', 'keratin', 'tune-up', 'checkup', 'check-up',
  'exam', 'fitting', 'photoshoot', 'shoot', 'reading', 'coaching',
]);

// Titles that mark a PERSONAL calendar event (matched whole-word from the
// start). Deliberately conservative — a missed personal event is minor cleanup;
// a real appointment auto-converted to time off would be lost data.
const PERSONAL_EVENT_PREFIXES = [
  'lunch', 'break', 'busy', 'blocked', 'ooo', 'out of office',
  'vacation', 'holiday', 'day off', 'personal', 'errand', 'errands',
  'dentist', 'doctor', 'dr appt', 'dr appointment', 'gym', 'workout',
  'unavailable', 'do not book', 'no clients',
];

// Tokens that don't distinguish one service from another.
const NOISE_TOKENS = new Set([
  'min', 'mins', 'minute', 'minutes', 'hr', 'hrs', 'hour', 'hours',
  'appt', 'appts', 'appointment', 'appointments', 'session', 'sessions',
  'service', 'services', 'booking', 'the', 'a', 'an', 'w',
]);

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/ {2}/g, ' ');
}

/** Split a title on the first separator. Returns null if none / a side empty. */
function split(title: string): [string, string] | null {
  const lower = title.toLowerCase();
  let best: { index: number; sep: string } | null = null;
  for (const sep of SEPARATORS) {
    const i = lower.indexOf(sep);
    if (i >= 0 && (best === null || i < best.index)) best = { index: i, sep };
  }
  if (!best) return null;
  const a = title.slice(0, best.index).trim();
  const b = title.slice(best.index + best.sep.length).trim();
  if (!a || !b) return null;
  return [a, b];
}

function containsServiceWord(s: string): boolean {
  return s
    .toLowerCase()
    .split(/[^a-z-]+/i)
    .some((tok) => SERVICE_WORDS.has(tok));
}

/** "Joe Smith" / "Mary Jo Baker" — 2-3 capitalized letter-only words. */
function looksLikePersonName(s: string): boolean {
  const words = s.split(' ').filter(Boolean);
  if (words.length < 2 || words.length > 3) return false;
  return words.every((w) => {
    const first = w[0];
    return first !== undefined && first === first.toUpperCase() && first !== first.toLowerCase() && /^[A-Za-z'-]+$/.test(w);
  });
}

/**
 * Match a label against existing services: exact normalized equality, then
 * containment (either direction, ≥4 chars) preferring the longest name.
 */
function bestServiceMatch(label: string, services: Service[]): Service | null {
  const n = normalize(label);
  if (n.length < 2) return null;
  const exact = services.find((s) => normalize(s.name) === n);
  if (exact) return exact;
  const candidates = services.filter((svc) => {
    const sn = normalize(svc.name);
    if (sn.length < 4) return false;
    return n.includes(sn) || sn.includes(n);
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((longest, s) => (s.name.length > longest.name.length ? s : longest));
}

/** Decide which side of a split title is the service. */
function pickServiceSide(a: string, b: string, frequency: Map<string, number>, services: Service[]): string {
  const aMatches = bestServiceMatch(a, services) != null;
  const bMatches = bestServiceMatch(b, services) != null;
  if (aMatches !== bMatches) return aMatches ? a : b;

  const fa = frequency.get(normalize(a)) ?? 0;
  const fb = frequency.get(normalize(b)) ?? 0;
  if (fa !== fb) return fa > fb ? a : b;

  const aService = containsServiceWord(a);
  const bService = containsServiceWord(b);
  if (aService !== bService) return aService ? a : b;

  const aPerson = looksLikePersonName(a);
  const bPerson = looksLikePersonName(b);
  if (aPerson !== bPerson) return aPerson ? b : a;

  // "Client - Service" is the most common export form → right side.
  return b;
}

/**
 * Order-insensitive canonical key: lowercase, punctuation stripped, noise/number
 * tokens dropped, simple plurals singularized, tokens sorted.
 */
export function canonicalKey(s: string): string {
  const cleaned = [...s.toLowerCase()].map((c) => (/[a-z0-9]/i.test(c) ? c : ' ')).join('');
  let tokens = cleaned.split(' ').filter(Boolean);
  tokens = tokens.filter((tok) => !NOISE_TOKENS.has(tok) && !/^\d+$/.test(tok));
  tokens = tokens.map((tok) => (tok.length > 3 && tok.endsWith('s') && !tok.endsWith('ss') ? tok.slice(0, -1) : tok));
  if (tokens.length === 0) return normalize(s);
  return tokens.sort().join(' ');
}

/** Classic DP edit distance (inputs are short canonical keys). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const aa = [...a];
  const bb = [...b];
  if (aa.length === 0) return bb.length;
  if (bb.length === 0) return aa.length;
  let prev = Array.from({ length: bb.length + 1 }, (_, i) => i);
  let curr = new Array<number>(bb.length + 1).fill(0);
  for (let i = 1; i <= aa.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= bb.length; j++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bb.length];
}

export function isPersonalEventLabel(label: string): boolean {
  const s = label.trim().toLowerCase();
  if (!s) return false;
  return PERSONAL_EVENT_PREFIXES.some((p) => s === p || s.startsWith(`${p} `) || s.startsWith(`${p}:`) || s.startsWith(`${p}-`));
}

/**
 * The staff member to auto-assign for a service — only when EXACTLY one active
 * staff member provides it, so multi-provider businesses aren't guessed at.
 */
export function uniqueProvider(serviceId: string, staff: StaffMember[]): StaffMember | null {
  const providers = staff.filter((s) => s.isActive && s.assignedServiceIds.includes(serviceId));
  return providers.length === 1 ? providers[0] : null;
}

interface RowResult {
  apptId: string;
  rawTitle: string;
  serviceLabel: string;
  clientName: string | null;
}

/**
 * Analyze parsed appointments and group them by detected service type. Returns
 * [] when nothing useful was detected (the import then behaves as before).
 */
export function detect(appointments: ParsedAppointment[], existingServices: Service[]): DetectedServiceGroup[] {
  const usable = appointments.filter(
    (a) => a.serviceName && a.serviceName !== 'Imported Service' && a.serviceName !== 'Imported Appointment',
  );
  if (usable.length === 0) return [];

  // Corpus frequency of every side of every split — the repeating side is
  // almost always the service.
  const frequency = new Map<string, number>();
  const bump = (k: string) => frequency.set(k, (frequency.get(k) ?? 0) + 1);
  for (const appt of usable) {
    const pair = split(appt.serviceName);
    if (pair) {
      bump(normalize(pair[0]));
      bump(normalize(pair[1]));
    } else {
      bump(normalize(appt.serviceName));
    }
  }

  const rows: RowResult[] = usable.map((appt) => {
    const pair = split(appt.serviceName);
    if (pair) {
      const [a, b] = pair;
      const serviceSide = pickServiceSide(a, b, frequency, existingServices);
      const clientSide = serviceSide === a ? b : a;
      return { apptId: appt.id, rawTitle: appt.serviceName, serviceLabel: serviceSide, clientName: clientSide };
    }
    return { apptId: appt.id, rawTitle: appt.serviceName, serviceLabel: appt.serviceName.trim(), clientName: null };
  });

  // Group by canonical key so the same service worded differently lands together.
  const byLabel = new Map<string, RowResult[]>();
  for (const row of rows) {
    const key = canonicalKey(row.serviceLabel);
    (byLabel.get(key) ?? byLabel.set(key, []).get(key)!).push(row);
  }

  // Second pass: fold near-identical keys (edit distance ≤ 1 on keys ≥5 chars).
  const sortedKeys = [...byLabel.keys()].sort((x, y) => byLabel.get(y)!.length - byLabel.get(x)!.length);
  const canonicalFor = new Map<string, string>();
  const representatives: string[] = [];
  for (const key of sortedKeys) {
    const rep = representatives.find((r) => Math.min(r.length, key.length) >= 5 && levenshtein(r, key) <= 1);
    if (rep) {
      canonicalFor.set(key, rep);
    } else {
      representatives.push(key);
      canonicalFor.set(key, key);
    }
  }
  const mergedByKey = new Map<string, RowResult[]>();
  for (const [key, members] of byLabel) {
    const target = canonicalFor.get(key) ?? key;
    (mergedByKey.get(target) ?? mergedByKey.set(target, []).get(target)!).push(...members);
  }

  const groups: DetectedServiceGroup[] = [];
  for (const members of mergedByKey.values()) {
    // Most common original casing as the display label.
    const labelCounts = new Map<string, number>();
    for (const m of members) labelCounts.set(m.serviceLabel, (labelCounts.get(m.serviceLabel) ?? 0) + 1);
    let label = members[0].serviceLabel;
    let bestCount = -1;
    for (const [lbl, c] of labelCounts) {
      if (c > bestCount) { bestCount = c; label = lbl; }
    }

    const refined: Record<string, string> = {};
    for (const m of members) {
      if (m.clientName && m.clientName.length > 0) refined[m.apptId] = m.clientName;
    }

    const match = bestServiceMatch(label, existingServices);

    // Personal calendar events default to TIME OFF (only when no client name
    // was split out and no existing service carries the name).
    let resolution: Resolution;
    if (Object.keys(refined).length === 0 && match == null && isPersonalEventLabel(label)) {
      resolution = { kind: 'convertToTimeOff' };
    } else {
      resolution = match ? { kind: 'assignExisting', serviceId: match.id } : { kind: 'createNew' };
    }

    groups.push({
      id: uuid(),
      label,
      appointmentIds: members.map((m) => m.apptId),
      refinedClientNames: refined,
      sampleTitle: members[0].rawTitle,
      matchedServiceId: match?.id,
      resolution,
      assignedStaffId: undefined,
    });
  }

  // Biggest groups first.
  groups.sort((x, y) => y.appointmentIds.length - x.appointmentIds.length);

  // Detection only earns its UI when it found real structure.
  const foundStructure = groups.some(
    (g) => g.matchedServiceId != null || Object.keys(g.refinedClientNames).length > 0 || g.appointmentIds.length > 1,
  );
  return foundStructure ? groups : [];
}
