// Run with `npm test` (node:test + --experimental-strip-types; no extra deps).
// schedule-layout.ts only has type-only imports, so Node can load it directly.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  blockHeight,
  calcOverlapLayout,
  gridAppointmentsForDay,
} from '../schedule-layout.ts';

/** Local-time ISO for Nov 13 2026 at h:m (the device zone, like the app). */
function at(h, m = 0, day = 13) {
  return new Date(2026, 10, day, h, m).toISOString();
}

function appt(id, startH, minutes, extra = {}) {
  const start = at(startH);
  return {
    id,
    startTime: start,
    endTime: new Date(new Date(start).getTime() + minutes * 60_000).toISOString(),
    duration: minutes,
    processingTime: 0,
    blockTime: 0,
    status: 'scheduled',
    ...extra,
  };
}

const NOV_13 = new Date(2026, 10, 13);

test('a cancelled booking is not drawn on the day grid', () => {
  const live = appt('live', 9, 60);
  const cancelled = appt('cancelled', 8, 330, { status: 'cancelled' });
  assert.deepEqual(gridAppointmentsForDay([live, cancelled], NOV_13).map((a) => a.id), ['live']);
});

test('no-show and completed bookings still show (same as iOS)', () => {
  const rows = [
    appt('noShow', 9, 60, { status: 'noShow' }),
    appt('done', 10, 60, { status: 'completed' }),
  ];
  assert.deepEqual(gridAppointmentsForDay(rows, NOV_13).map((a) => a.id), ['noShow', 'done']);
});

test('only bookings that start on that local day are returned', () => {
  const rows = [appt('today', 9, 60), { ...appt('tomorrow', 9, 60), startTime: at(9, 0, 14) }];
  assert.deepEqual(gridAppointmentsForDay(rows, NOV_13).map((a) => a.id), ['today']);
});

test('a cancelled long booking no longer pushes live ones into side columns', () => {
  const rows = [
    appt('cancelled-a', 8, 330, { status: 'cancelled' }),
    appt('cancelled-b', 8, 300, { status: 'cancelled' }),
    appt('live', 10, 60),
  ];
  const layout = calcOverlapLayout(gridAppointmentsForDay(rows, NOV_13));
  assert.deepEqual(layout.live, { columnIndex: 0, totalColumns: 1 });
});

test('block height is 2px per minute of the booking', () => {
  assert.equal(blockHeight(appt('hour', 9, 60)), 120);
  assert.equal(blockHeight(appt('half', 9, 30)), 60);
});

test('block height stops at midnight', () => {
  // 10pm start, 1440 min (an imported all-day event): only 2 hours fit.
  assert.equal(blockHeight(appt('allDay', 22, 1440)), 240);
});
