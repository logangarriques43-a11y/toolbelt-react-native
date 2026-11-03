/**
 * Delta sync for the big lists (appointments, clients, invoices, ledger).
 *
 * The backend answers `GET /<list>?since=<ISO>` with only the rows changed
 * after the cursor, and `GET /<list>/deletions?since=<ISO>` with the ids
 * deleted since then. `deltaQueryFn` turns those into a React Query `queryFn`
 * that merges the changes into the cached list instead of re-downloading it.
 *
 * It falls back to a full pull when:
 *   - there is nothing cached yet, or no cursor for this cache entry (first
 *     sync, after sign-out wiped the cache, after the entry was dropped);
 *   - deletions answers `complete: false` (cursor too old, or the server
 *     couldn't vouch for its answer);
 *   - the last full pull is a day old (the backend's backstop for a missed
 *     tombstone).
 *
 * The cursor is the server's own `generatedAt` from the deletions call, taken
 * before the list read and backed off by CURSOR_OVERLAP_MS, so device clock
 * skew can't skip a change. Re-reading a few overlapping rows is harmless:
 * merging is by id.
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface Deletions {
  ids: string[];
  /** false → the answer can't be trusted; do a full pull. */
  complete: boolean;
  /** Server time the answer was computed at (ISO). */
  generatedAt: string | null;
}

export interface DeltaSource<T> {
  /** The list; `since` asks for only the rows changed after it. */
  list: (since?: string) => Promise<T[]>;
  /** Path of the list's deletions endpoint, e.g. '/invoices/deletions'. */
  deletionsPath: string;
}

const CURSOR_OVERLAP_MS = 60_000;
const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface Cursor {
  since: string;
  fullSyncAt: number;
}

// Keyed by the cache entry itself, so a cleared cache (sign-out) or a dropped
// entry can never pair an old cursor with new data.
const cursors = new WeakMap<object, Cursor>();

export async function getDeletions(path: string, since?: string): Promise<Deletions> {
  const res = await api.get<Partial<Deletions> | null>(path, { since });
  return {
    ids: Array.isArray(res?.ids) ? res.ids.filter((id): id is string => typeof id === 'string') : [],
    complete: res?.complete === true,
    generatedAt: typeof res?.generatedAt === 'string' ? res.generatedAt : null,
  };
}

function nextCursor(generatedAt: string | null, requestedAt: number): string {
  const server = generatedAt ? Date.parse(generatedAt) : NaN;
  const base = Number.isNaN(server) ? requestedAt : server;
  return new Date(base - CURSOR_OVERLAP_MS).toISOString();
}

/**
 * Merges changed rows and deletions into `prev`: changed rows replace their
 * old copy in place, new ones are appended, deleted ids are dropped, and any
 * duplicate id is collapsed. Rows the server doesn't know yet (optimistic
 * creates) are kept.
 */
export function mergeDelta<T extends { id: string }>(prev: T[], changed: T[], deletedIds: string[]): T[] {
  if (changed.length === 0 && deletedIds.length === 0) return prev;
  const gone = new Set(deletedIds);
  const changedById = new Map(changed.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of [...prev, ...changed]) {
    if (gone.has(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(changedById.get(row.id) ?? row);
  }
  return out;
}

/**
 * Swaps an optimistic row for its saved version. A delta sync that ran while
 * the create was in flight may already have added the saved row, so any other
 * copy with the same id is dropped.
 */
export function replaceOptimistic<T extends { id: string }>(list: T[], tempId: string, saved: T): T[] {
  return list.filter((row) => row.id !== saved.id).map((row) => (row.id === tempId ? saved : row));
}

/** A React Query `queryFn` for `key` that syncs incrementally. */
export function deltaQueryFn<T extends { id: string }>(
  qc: QueryClient,
  key: QueryKey,
  source: DeltaSource<T>,
): () => Promise<T[]> {
  return async () => {
    const query = qc.getQueryCache().find<T[]>({ queryKey: key, exact: true });
    const prev = query?.state.data;
    const cursor = query ? cursors.get(query) : undefined;
    const canDelta = !!prev && !!cursor && Date.now() - cursor.fullSyncAt < FULL_SYNC_INTERVAL_MS;

    const requestedAt = Date.now();
    // Asked even for a full pull: with no `since` it answers at once, and its
    // generatedAt is the server-clock cursor for the next sync.
    const deletions = await getDeletions(source.deletionsPath, canDelta ? cursor!.since : undefined);
    const since = nextCursor(deletions.generatedAt, requestedAt);

    if (!canDelta || !deletions.complete) {
      const all = await source.list();
      if (query) cursors.set(query, { since, fullSyncAt: Date.now() });
      return all;
    }

    const changed = await source.list(cursor!.since);
    if (query) cursors.set(query, { since, fullSyncAt: cursor!.fullSyncAt });
    // Read the cache again: optimistic writes may have landed while we waited.
    const latest = qc.getQueryData<T[]>(key) ?? prev!;
    return mergeDelta(latest, changed, deletions.ids);
  };
}
