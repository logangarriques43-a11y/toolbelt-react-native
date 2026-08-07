/**
 * Appointments store — RN counterpart to AppointmentManager.swift.
 * Backed by `/appointments` (GET list, POST/PUT/DELETE) via React Query.
 *
 * Every write site in the app is fire-and-forget then navigates away
 * (create/edit forms, detail quick-actions, delete, bulk import), so the
 * mutations here are OPTIMISTIC: they patch the query cache immediately, roll
 * back and surface an Alert on failure, and reconcile with the server result.
 * That keeps the public API synchronous (`void`) — exactly the shape the old
 * in-memory store exposed — so no consumer changes are needed.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  createAppointment,
  deleteAppointment as deleteAppointmentApi,
  listAppointments,
  updateAppointment as updateAppointmentApi,
} from '@/api/appointments';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import type { Appointment } from '@/models/appointment';

export const APPOINTMENTS_QUERY_KEY = ['appointments'] as const;

export interface AppointmentsStore {
  appointments: Appointment[];
  addAppointment: (a: Omit<Appointment, 'id'>) => void;
  updateAppointment: (a: Appointment) => void;
  deleteAppointment: (id: string) => void;
  getAppointments: (date: Date) => Appointment[];
  getUpcoming: (limit?: number) => Appointment[];
  isLoading: boolean;
  error: Error | null;
}

const AppointmentsContext = createContext<AppointmentsStore | null>(null);

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function alertFailure(action: string, err: unknown) {
  const message =
    err instanceof ApiError
      ? err.message
      : 'Please check your connection and try again.';
  Alert.alert(`Couldn't ${action} appointment`, message);
}

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: APPOINTMENTS_QUERY_KEY, queryFn: listAppointments });

  const read = () => qc.getQueryData<Appointment[]>(APPOINTMENTS_QUERY_KEY) ?? [];
  const write = (next: Appointment[]) => qc.setQueryData(APPOINTMENTS_QUERY_KEY, next);

  // CREATE — insert an optimistic row with a temp id, then swap in the saved
  // row (with its real backend id) on success. No invalidation, so a bulk
  // import of N rows doesn't trigger N refetches.
  const createMutation = useMutation({
    mutationFn: (input: Omit<Appointment, 'id'>) => createAppointment(input),
    onMutate: (input) => {
      const tempId = `optimistic-${uuid()}`;
      write([...read(), { ...input, id: tempId }]);
      return { tempId };
    },
    onError: (err, _input, ctx) => {
      if (ctx) write(read().filter((a) => a.id !== ctx.tempId));
      alertFailure('save', err);
    },
    onSuccess: (saved, _input, ctx) => {
      write(read().map((a) => (a.id === ctx?.tempId ? saved : a)));
    },
  });

  // UPDATE — optimistically replace in cache; roll back on error; reconcile
  // with the server row on success (detail-screen quick-actions rely on the
  // change being visible immediately).
  const updateMutation = useMutation({
    mutationFn: (appt: Appointment) => updateAppointmentApi(appt),
    onMutate: (appt) => {
      const prev = read();
      write(prev.map((a) => (a.id === appt.id ? appt : a)));
      return { prev };
    },
    onError: (err, _appt, ctx) => {
      if (ctx) write(ctx.prev);
      alertFailure('update', err);
    },
    onSuccess: (saved) => {
      write(read().map((a) => (a.id === saved.id ? saved : a)));
    },
  });

  // DELETE — optimistically remove, fire the real backend DELETE (auth token
  // attached by api-client), then invalidate so the list reconciles against
  // the server. A direct awaited call (rather than useMutation.mutate) leaves
  // no doubt the request actually goes out even though the caller navigates
  // away in the same tick. Roll back + alert if the DELETE fails.
  const deleteAppointment = (id: string) => {
    const prev = read();
    write(prev.filter((a) => a.id !== id));
    deleteAppointmentApi(id)
      .then(() => {
        qc.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
      })
      .catch((err) => {
        write(prev);
        alertFailure('delete', err);
      });
  };

  const appointments = query.data ?? [];

  const value = useMemo<AppointmentsStore>(
    () => ({
      appointments,
      addAppointment: (a) => createMutation.mutate(a),
      updateAppointment: (a) => updateMutation.mutate(a),
      deleteAppointment,
      getAppointments: (date) =>
        appointments.filter((a) => sameDay(new Date(a.startTime), date)),
      getUpcoming: (limit = 5) => {
        const now = Date.now();
        return appointments
          .filter((a) => new Date(a.startTime).getTime() > now)
          .sort((x, y) => new Date(x.startTime).getTime() - new Date(y.startTime).getTime())
          .slice(0, limit);
      },
      isLoading: query.isLoading,
      error: (query.error as Error | null) ?? null,
    }),
    // mutation objects are stable; re-derive when the list or load state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointments, query.isLoading, query.error],
  );

  return (
    <AppointmentsContext.Provider value={value}>{children}</AppointmentsContext.Provider>
  );
}

export function useAppointments(): AppointmentsStore {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error('useAppointments must be used within an AppointmentsProvider');
  return ctx;
}
