/**
 * Time-off store — RN counterpart to TimeOffManager.swift. In-memory.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { TimeOffEvent } from '@/models/time-off';

export interface TimeOffStore {
  events: TimeOffEvent[];
  addEvent: (e: Omit<TimeOffEvent, 'id'>) => void;
  updateEvent: (e: TimeOffEvent) => void;
  deleteEvent: (id: string) => void;
}

const TimeOffContext = createContext<TimeOffStore | null>(null);

export function TimeOffProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<TimeOffEvent[]>([]);

  const value = useMemo<TimeOffStore>(
    () => ({
      events,
      addEvent: (e) => setEvents((prev) => [...prev, { ...e, id: uuid() }]),
      updateEvent: (e) => setEvents((prev) => prev.map((it) => (it.id === e.id ? e : it))),
      deleteEvent: (id) => setEvents((prev) => prev.filter((it) => it.id !== id)),
    }),
    [events],
  );

  return <TimeOffContext.Provider value={value}>{children}</TimeOffContext.Provider>;
}

export function useTimeOff(): TimeOffStore {
  const ctx = useContext(TimeOffContext);
  if (!ctx) throw new Error('useTimeOff must be used within a TimeOffProvider');
  return ctx;
}
