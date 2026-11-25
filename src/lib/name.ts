/**
 * Derives a human display name from an email local-part — port of the
 * name-cleanup logic repeated across LoginView / ContentView / dashboard
 * ("john.doe@x.com" → "John Doe"). Strips a trailing number run, splits on
 * ./_/-, and title-cases each word.
 */
export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const stripped = local.replace(/\d+$/, '');
  const base = stripped || local;
  const cleaned = base
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return cleaned || 'Business Owner';
}

/**
 * The name to greet the signed-in person by: their saved name, unless it is
 * missing or just their email (or its local part), in which case one derived
 * from the email.
 */
export function resolveDisplayName(name?: string, email?: string): string {
  if (!name) return 'Business Owner';
  if (name.includes('@')) return displayNameFromEmail(name);
  if (email && email.toLowerCase().startsWith(`${name.toLowerCase()}@`)) {
    return displayNameFromEmail(email);
  }
  return name;
}

/** Up to two initials for an avatar ("Jordan Lee" → "JL"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
