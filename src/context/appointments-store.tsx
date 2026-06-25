/**
 * Appointments store — RN counterpart to AppointmentManager.swift.
 * In-memory CRUD + day/upcoming queries; backend sync deferred.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { Appointment } from '@/models/appointment';

export interface AppointmentsStore {
  appointments: Appointment[];
  addAppointment: (a: Omit<Appointment, 'id'>) => void;
  updateAppointment: (a: Appointment) => void;
  deleteAppointment: (id: string) => void;
  getAppointments: (date: Date) => Appointment[];
  getUpcoming: (limit?: number) => Appointment[];
}

const AppointmentsContext = createContext<AppointmentsStore | null>(null);

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const value = useMemo<AppointmentsStore>(
    () => ({
      appointments,
      addAppointment: (a) => setAppointments((prev) => [...prev, { ...a, id: uuid() }]),
      updateAppointment: (a) =>
        setAppointments((prev) => prev.map((it) => (it.id === a.id ? a : it))),
      deleteAppointment: (id) => setAppointments((prev) => prev.filter((it) => it.id !== id)),
      getAppointments: (date) =>
        appointments.filter((a) => sameDay(new Date(a.startTime), date)),
      getUpcoming: (limit = 5) => {
        const now = Date.now();
        return appointments
          .filter((a) => new Date(a.startTime).getTime() > now)
          .sort((x, y) => new Date(x.startTime).getTime() - new Date(y.startTime).getTime())
          .slice(0, limit);
      },
    }),
    [appointments],
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
