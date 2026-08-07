/**
 * Working-hours API — maps the business-wide weekly schedule to/from the
 * backend `/working-hours` document (one doc per business).
 *
 * Wire shape (from workingHoursRoutes.js, mirrors WorkingHoursManager.swift):
 *   { weeklySchedule: { "1".."7": { isWorkingDay, intervals:[{startHour,startMinute,endHour,endMinute}] } },
 *     dateOverrides: [{ timestamp, schedule }] }
 *   weekday on the wire is 1=Sun … 7=Sat (Apple Calendar convention).
 *
 * The RN model keys weekdays 0=Sun … 6=Sat (JS Date.getDay), so we shift by 1.
 * Interval fields and `isWorkingDay` map 1:1. Date overrides are deferred in
 * the RN build — we always send an empty list.
 */

import { api } from '@/lib/api-client';
import type { DaySchedule, WorkingHoursInterval } from '@/models/working-hours';

interface WireDay {
  isWorkingDay?: boolean;
  intervals?: Partial<WorkingHoursInterval>[];
}

interface WorkingHoursDTO {
  weeklySchedule?: Record<string, WireDay>;
  dateOverrides?: unknown[];
}

/** Wire weekday 1-7 (1=Sun) → RN weekly schedule keyed 0-6 (0=Sun). */
export function weeklyFromDTO(dto: WorkingHoursDTO | null | undefined): Record<number, DaySchedule> {
  const out: Record<number, DaySchedule> = {};
  const weekly = dto?.weeklySchedule ?? {};
  for (const [key, day] of Object.entries(weekly)) {
    const wire = parseInt(key, 10);
    if (Number.isNaN(wire) || wire < 1 || wire > 7) continue;
    out[wire - 1] = {
      isWorkingDay: !!day?.isWorkingDay,
      intervals: Array.isArray(day?.intervals)
        ? day.intervals.map((i) => ({
            startHour: i.startHour ?? 0,
            startMinute: i.startMinute ?? 0,
            endHour: i.endHour ?? 0,
            endMinute: i.endMinute ?? 0,
          }))
        : [],
    };
  }
  return out;
}

/** RN weekly schedule (0-6, 0=Sun) → wire DTO (1-7, 1=Sun), all 7 days. */
export function weeklyToDTO(weekly: Record<number, DaySchedule>): WorkingHoursDTO {
  const wire: Record<string, WireDay> = {};
  for (let d = 0; d < 7; d++) {
    const day = weekly[d];
    if (!day) continue;
    wire[String(d + 1)] = {
      isWorkingDay: day.isWorkingDay,
      intervals: day.intervals.map((i) => ({
        startHour: i.startHour,
        startMinute: i.startMinute,
        endHour: i.endHour,
        endMinute: i.endMinute,
      })),
    };
  }
  return { weeklySchedule: wire, dateOverrides: [] };
}

/** GET the business weekly schedule. Empty object if hours were never set. */
export async function getWorkingHours(): Promise<Record<number, DaySchedule>> {
  const dto = await api.get<WorkingHoursDTO>('/working-hours');
  return weeklyFromDTO(dto);
}

/** PUT the whole weekly schedule (backend replaces the doc). Returns the saved value. */
export async function saveWorkingHours(
  weekly: Record<number, DaySchedule>,
): Promise<Record<number, DaySchedule>> {
  const dto = await api.put<WorkingHoursDTO>('/working-hours', weeklyToDTO(weekly));
  return weeklyFromDTO(dto);
}
