/**
 * Working-hours store — RN counterpart to WorkingHoursManager.swift (weekly
 * schedule only). Provides the schedule lookups the schedule grids use for
 * shading and the appointment forms use for the outside-hours warning.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { defaultWeeklySchedule, type DaySchedule } from '@/models/working-hours';

export interface WorkingHoursStore {
  weeklySchedule: Record<number, DaySchedule>;
  getSchedule: (date: Date) => DaySchedule;
  isWorkingTime: (date: Date, hour: number, minute: number) => boolean;
  setWeekday: (weekday: number, schedule: DaySchedule) => void;
}

const WorkingHoursContext = createContext<WorkingHoursStore | null>(null);

const OFF: DaySchedule = { isWorkingDay: false, intervals: [] };

export function WorkingHoursProvider({ children }: { children: ReactNode }) {
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, DaySchedule>>(
    defaultWeeklySchedule,
  );

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
      setWeekday: (weekday, schedule) =>
        setWeeklySchedule((prev) => ({ ...prev, [weekday]: schedule })),
    };
  }, [weeklySchedule]);

  return <WorkingHoursContext.Provider value={value}>{children}</WorkingHoursContext.Provider>;
}

export function useWorkingHours(): WorkingHoursStore {
  const ctx = useContext(WorkingHoursContext);
  if (!ctx) throw new Error('useWorkingHours must be used within a WorkingHoursProvider');
  return ctx;
}
