/**
 * Schedule grid geometry + overlap layout — port of the SingleDay grid math in
 * SingleDayScheduleGrid.swift. The day grid is 48 half-hour slots tall at 2px
 * per minute (60px per slot).
 */

import type { Appointment } from '@/models/appointment';

export const PX_PER_MIN = 2;
export const SLOT_HEIGHT = 60;
export const TIME_COL_WIDTH = 60;
export const SLOT_COUNT = 48;
export const GRID_HEIGHT = SLOT_COUNT * SLOT_HEIGHT; // 2880

/** "12:00am", "12:30am", … 48 labels. */
export function timeSlotLabels(): string[] {
  const out: string[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const h24 = Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    const ampm = h24 < 12 ? 'am' : 'pm';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    out.push(`${h12}:${min}${ampm}`);
  }
  return out;
}

/** Pixel y-offset for a given instant (minutes from midnight × 2). */
export function offsetForTime(iso: string): number {
  const d = new Date(iso);
  return (d.getHours() * 60 + d.getMinutes()) * PX_PER_MIN;
}

export function blockHeight(a: Appointment): number {
  return (a.duration + a.processingTime + a.blockTime) * PX_PER_MIN;
}

export interface OverlapInfo {
  columnIndex: number;
  totalColumns: number;
}

function effectiveEnd(a: Appointment): number {
  return new Date(a.endTime).getTime() + (a.processingTime + a.blockTime) * 60000;
}

/**
 * Assigns each appointment a column among its overlapping neighbours so they sit
 * side-by-side. Port of calculateSingleDayOverlapLayout.
 */
export function calcOverlapLayout(appointments: Appointment[]): Record<string, OverlapInfo> {
  const info: Record<string, OverlapInfo> = {};
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const columns: number[] = []; // end-times per column
  for (const a of sorted) {
    const start = new Date(a.startTime).getTime();
    const end = effectiveEnd(a);
    let columnIndex = 0;
    let found = false;
    for (let i = 0; i < columns.length; i++) {
      if (start >= columns[i]) {
        columns[i] = end;
        columnIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      columnIndex = columns.length;
      columns.push(end);
    }
    info[a.id] = { columnIndex, totalColumns: 0 };
  }

  // Resolve totalColumns from the widest overlap cluster each appointment is in.
  for (const a of sorted) {
    const aStart = new Date(a.startTime).getTime();
    const aEnd = effectiveEnd(a);
    let maxColumn = info[a.id].columnIndex;
    for (const other of sorted) {
      const oStart = new Date(other.startTime).getTime();
      const oEnd = effectiveEnd(other);
      if (aStart < oEnd && aEnd > oStart) {
        maxColumn = Math.max(maxColumn, info[other.id].columnIndex);
      }
    }
    for (const other of sorted) {
      const oStart = new Date(other.startTime).getTime();
      const oEnd = effectiveEnd(other);
      if (aStart < oEnd && aEnd > oStart) {
        info[other.id] = {
          columnIndex: info[other.id].columnIndex,
          totalColumns: Math.max(info[other.id].totalColumns, maxColumn + 1),
        };
      }
    }
  }
  return info;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
