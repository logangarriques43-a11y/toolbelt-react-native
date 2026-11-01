/**
 * Tattoo queries. Keys include the uid so one account never reads another's
 * cache. Anything holding a signed link uses SIGNED_LINK_QUERY: it isn't kept
 * once the screen closes, is refetched on open, and renews while it's open.
 */

import { useQuery } from '@tanstack/react-query';

import { getTattooSettings } from '@/api/tattoo';
import { useSession } from '@/context/session';
import { SIGNED_URL_REFRESH_MS } from '@/lib/tattoo';

export const tattooKeys = {
  settings: (uid: string | null) => ['tattoo', uid, 'settings'] as const,
  intakes: (uid: string | null) => ['tattoo', uid, 'intakes'] as const,
  intake: (uid: string | null, id: string) => ['tattoo', uid, 'intake', id] as const,
  portfolio: (uid: string | null, staffId: string) => ['tattoo', uid, 'portfolio', staffId] as const,
};

export const SIGNED_LINK_QUERY = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: 'always',
  refetchInterval: SIGNED_URL_REFRESH_MS,
} as const;

export function useTattooSettings() {
  const { uid } = useSession();
  return useQuery({
    queryKey: tattooKeys.settings(uid),
    queryFn: getTattooSettings,
    enabled: !!uid,
    // Off for almost everyone: don't retry a failure just to hide a row.
    retry: false,
  });
}

/** Whether to show the Tattoo Studio rows. An error hides them. */
export function useTattooEntry(): { visible: boolean; enabled: boolean } {
  const { data, isError } = useTattooSettings();
  const visible = !isError && data?.available === true;
  return { visible, enabled: visible && data?.enabled === true };
}
