/**
 * Where a new owner signed up from, in the browser. `captureSignupSource()`
 * runs when the app loads (see `web-hosts.web.tsx`) and remembers the landing
 * link's `?ref=` / `utm_*` tags. It keeps the first link that had any (first
 * touch), so someone who clicks a rep's link today and signs up tomorrow is
 * still credited. Stored in localStorage until the signup is reported. Nothing
 * here is personal data: just the link's tags and the landing path.
 */

import type { SignupSource } from '@/api/onboarding';

const KEY = 'toolbelt.signupSource';

type Tags = Omit<SignupSource, 'platform'>;

/** Same shape the backend accepts: short, plain tokens only. */
function clean(v: string | null): string | undefined {
  const t = (v ?? '').trim().slice(0, 64);
  return /^[\w .@+-]+$/.test(t) ? t : undefined;
}

function read(): Tags {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tags) : {};
  } catch {
    return {};
  }
}

export function captureSignupSource(): void {
  try {
    const q = new URLSearchParams(window.location.search);
    const tags: Tags = {
      ref: clean(q.get('ref')),
      utmSource: clean(q.get('utm_source')) ?? clean(q.get('src')),
      utmMedium: clean(q.get('utm_medium')),
      utmCampaign: clean(q.get('utm_campaign')),
    };
    const hasTags = Object.values(tags).some(Boolean);
    const existing = read();
    if (Object.keys(existing).length > 0 && !hasTags) return; // keep first touch
    if (Object.keys(existing).length > 0 && existing.ref) return;
    const landingPath = window.location.pathname.slice(0, 64) || '/';
    window.localStorage.setItem(KEY, JSON.stringify({ ...tags, landingPath }));
  } catch {
    // Private mode / storage blocked: attribution is best-effort.
  }
}

export function getSignupSource(): SignupSource {
  const tags = read();
  const out: SignupSource = { platform: 'web' };
  for (const k of ['ref', 'utmSource', 'utmMedium', 'utmCampaign', 'landingPath'] as const) {
    if (typeof tags[k] === 'string' && tags[k]) out[k] = tags[k];
  }
  return out;
}

export function clearSignupSource(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
