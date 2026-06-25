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
