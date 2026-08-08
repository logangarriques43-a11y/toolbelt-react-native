/**
 * Time-off store — RN counterpart to TimeOffManager.swift.
 * Backed by `/busy-blocks` (source "timeoff") via React Query.
 *
 * Every write site fires and navigates away (time-off form, schedule-grid
 * quick-actions, import), so the mutations here are OPTIMISTIC: they patch the
 * query cache immediately, roll back and Alert on failure. That keeps the
 * public API synchronous (`void`), matching the old in-memory store.
 *
 * Unlike appointments, the wire is lossy — colorHex, notes, location and
 * recurrence are NOT persisted server-side. So we NEVER invalidate/refetch
 * after a write and NEVER reconcile with the (blanked) server row: the
 * optimistic cache entry is the richest copy for the session. On create we
 * only graft the backend id onto the local row. These fields reset on a cold
 * reload, exactly as they do in the Swift app across devices.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createTimeOff,
  deleteTimeOff as deleteTimeOffApi,
  listTimeOff,
  updateTimeOff as updateTimeOffApi,
} from '@/api/time-off';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { TimeOffEvent } from '@/models/time-off';

export const TIME_OFF_QUERY_KEY = ['busy-blocks'] as const;

export interface TimeOffStore {
  events: TimeOffEvent[];
  addEvent: (e: Omit<TimeOffEvent, 'id'>) => void;
  updateEvent: (e: TimeOffEvent) => void;
  deleteEvent: (id: string) => void;
}

const TimeOffContext = createContext<TimeOffStore | null>(null);

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError
      ? err.message
      : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action} time off`, message);
}

export function TimeOffProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: TIME_OFF_QUERY_KEY, queryFn: listTimeOff });

  const read = () => qc.getQueryData<TimeOffEvent[]>(TIME_OFF_QUERY_KEY) ?? [];
  const write = (next: TimeOffEvent[]) => qc.setQueryData(TIME_OFF_QUERY_KEY, next);

  // CREATE — insert an optimistic row with a temp id, then graft the real
  // backend id onto that same row on success (keeping its local-only color /
  // notes / location, which the wire doesn't return). No invalidate, so an
  // import of N events doesn't trigger N refetches that would blank those.
  const createMutation = useMutation({
    mutationFn: (input: Omit<TimeOffEvent, 'id'>) => createTimeOff(input),
    onMutate: (input) => {
      const tempId = `optimistic-${uuid()}`;
      write([...read(), { ...input, id: tempId }]);
      return { tempId };
    },
    onError: (err, _input, ctx) => {
      if (ctx) write(read().filter((e) => e.id !== ctx.tempId));
      alertFailure('save', err);
    },
    onSuccess: (saved, _input, ctx) => {
      write(read().map((e) => (e.id === ctx?.tempId ? { ...e, id: saved.id } : e)));
    },
  });

  // UPDATE — optimistically replace in cache; roll back on error. We keep the
  // optimistic row on success rather than reconciling with the server row,
  // which would blank the local-only fields.
  const updateMutation = useMutation({
    mutationFn: (event: TimeOffEvent) => updateTimeOffApi(event),
    onMutate: (event) => {
      const prev = read();
      write(prev.map((e) => (e.id === event.id ? event : e)));
      return { prev };
    },
    onError: (err, _event, ctx) => {
      if (ctx) write(ctx.prev);
      alertFailure('update', err);
    },
  });

  // DELETE — optimistically remove, fire the real backend DELETE, roll back +
  // alert on failure. No invalidate (see file header).
  const deleteEvent = (id: string) => {
    const prev = read();
    write(prev.filter((e) => e.id !== id));
    deleteTimeOffApi(id).catch((err) => {
      write(prev);
      alertFailure('delete', err);
    });
  };

  const events = query.data ?? [];

  const value = useMemo<TimeOffStore>(
    () => ({
      events,
      addEvent: (e) => createMutation.mutate(e),
      updateEvent: (e) => updateMutation.mutate(e),
      deleteEvent,
    }),
    // mutation objects are stable; re-derive when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events],
  );

  return <TimeOffContext.Provider value={value}>{children}</TimeOffContext.Provider>;
}

export function useTimeOff(): TimeOffStore {
  const ctx = useContext(TimeOffContext);
  if (!ctx) throw new Error('useTimeOff must be used within a TimeOffProvider');
  return ctx;
}
