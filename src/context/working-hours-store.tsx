/**
 * Working-hours store — RN counterpart to WorkingHoursManager.swift (weekly
 * schedule only). Provides the schedule lookups the schedule grids use for
 * shading and the appointment forms use for the outside-hours warning.
 *
 * Backed by `GET`/`PUT /working-hours` (one doc per business) via React Query.
 * The editor applies changes live (no Save button — the time stepper fires on
 * every tick), so `setWeekday` stays synchronous and updates a local copy
 * instantly; the whole-object PUT is debounced so a burst of edits collapses
 * into one write. Reads always come from the local copy for a live feel.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getWorkingHours, saveWorkingHours } from '@/api/working-hours';
import { defaultWeeklySchedule, type DaySchedule } from '@/models/working-hours';

export const WORKING_HOURS_QUERY_KEY = ['working-hours'] as const;

const SAVE_DEBOUNCE_MS = 700;

export interface WorkingHoursStore {
  weeklySchedule: Record<number, DaySchedule>;
  getSchedule: (date: Date) => DaySchedule;
  isWorkingTime: (date: Date, hour: number, minute: number) => boolean;
  setWeekday: (weekday: number, schedule: DaySchedule) => void;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
}

const WorkingHoursContext = createContext<WorkingHoursStore | null>(null);

const OFF: DaySchedule = { isWorkingDay: false, intervals: [] };

/**
 * Fill in all 7 weekdays. When the business has never configured hours the
 * backend returns an empty object — seed the sensible Mon–Fri 9–5 default so
 * the grids render and editing starts from a familiar base. Otherwise honor
 * the stored schedule exactly, filling any absent day as closed (never invent
 * hours the owner didn't set).
 */
function hydrate(server: Record<number, DaySchedule>): Record<number, DaySchedule> {
  if (Object.keys(server).length === 0) return defaultWeeklySchedule();
  const out: Record<number, DaySchedule> = {};
  for (let d = 0; d < 7; d++) out[d] = server[d] ?? OFF;
  return out;
}

export function WorkingHoursProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: WORKING_HOURS_QUERY_KEY, queryFn: getWorkingHours });

  // Local editable copy, seeded from the server. `dirty` guards against a
  // background refetch clobbering in-flight edits and against saving the
  // freshly-hydrated value back to the server.
  const [local, setLocal] = useState<Record<number, DaySchedule> | null>(null);
  const dirtyRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (weekly: Record<number, DaySchedule>) => saveWorkingHours(weekly),
    onSuccess: (saved) => {
      dirtyRef.current = false;
      qc.setQueryData(WORKING_HOURS_QUERY_KEY, saved);
    },
  });

  // Hydrate the local copy from the server, but never over user edits.
  useEffect(() => {
    if (query.data && !dirtyRef.current) setLocal(hydrate(query.data));
  }, [query.data]);

  // Debounced persistence: PUT the whole schedule once edits settle.
  useEffect(() => {
    if (!dirtyRef.current || !local) return;
    const t = setTimeout(() => mutation.mutate(local), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // mutation.mutate is stable; re-run only when the local schedule changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const weeklySchedule = local ?? defaultWeeklySchedule();

  const value = useMemo<WorkingHoursStore>(() => {
    const getSchedule = (date: Date) => weeklySchedule[date.getDay()] ?? OFF;
    return {
      weeklySchedule,
      getSchedule,
      isWorkingTime: (date, hour, minute) => {
        const schedule = getSchedule(date);
        if (!schedule.isWorkingDay) return false;
        const t = hour * 60 + minute;
        return schedule.intervals.some(
          (i) => t >= i.startHour * 60 + i.startMinute && t < i.endHour * 60 + i.endMinute,
        );
      },
      setWeekday: (weekday, schedule) => {
        dirtyRef.current = true;
        setLocal((prev) => ({ ...(prev ?? defaultWeeklySchedule()), [weekday]: schedule }));
      },
      isLoading: query.isLoading,
      isSaving: mutation.isPending,
      error: (query.error as Error | null) ?? (mutation.error as Error | null) ?? null,
    };
  }, [weeklySchedule, query.isLoading, query.error, mutation.isPending, mutation.error]);

  return <WorkingHoursContext.Provider value={value}>{children}</WorkingHoursContext.Provider>;
}

export function useWorkingHours(): WorkingHoursStore {
  const ctx = useContext(WorkingHoursContext);
  if (!ctx) throw new Error('useWorkingHours must be used within a WorkingHoursProvider');
  return ctx;
}
