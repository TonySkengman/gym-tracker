import test from 'node:test';
import assert from 'node:assert/strict';
import { moveScheduledWorkout, nextScheduledWorkouts, saveScheduledWorkout } from './schedule.js';
import { createGuestApi } from './guest.js';

const entries = [
  { id: 1, planId: 7, planName: 'Upper', date: '2026-10-24', planAvailable: true, completedWorkoutId: null },
  { id: 2, planId: 7, planName: 'Upper', date: '2026-10-26', planAvailable: true },
  { id: 3, planId: 8, planName: 'Lower', date: '2026-10-26', planAvailable: true },
];
test('moving preserves booking identity, plan and input state while updating upcoming selection', () => {
  const before = structuredClone(entries);
  const moved = moveScheduledWorkout(entries, 1, '2026-10-25');
  assert.deepEqual(moved, { ...entries[0], date: '2026-10-25' });
  assert.deepEqual(entries, before);
  const updated = entries.map(entry => entry.id === moved.id ? moved : entry);
  assert.equal(nextScheduledWorkouts(updated, '2026-10-24')[0].date, '2026-10-25');
  assert.equal(moveScheduledWorkout(entries, 1, '2026-10-24'), null);
});
test('invalid moves reject completed, deleted, missing and duplicate bookings', () => {
  assert.throws(() => moveScheduledWorkout(entries, 99, '2026-10-25'), /no longer/);
  assert.throws(() => moveScheduledWorkout(entries, 1, '2026-10-26'), /already scheduled/);
  assert.throws(() => moveScheduledWorkout([{ ...entries[0], completedWorkoutId: 'saved' }], 1, '2026-10-25'), /Completed/);
  assert.throws(() => moveScheduledWorkout([{ ...entries[0], planAvailable: false }], 1, '2026-10-25'), /deleted/);
  for (const date of ['2026-02-30', '2026-1-2', '1899-12-31', '10000-01-01', 'bad'])
    assert.throws(() => moveScheduledWorkout(entries, 1, date), /valid date/);
});
test('date-only moves preserve leap days, DST boundaries and adjacent month/year dates', () => {
  for (const date of ['2028-02-29', '2026-10-25', '2026-11-01', '2027-01-01', '1900-01-01', '9999-12-31'])
    assert.equal(moveScheduledWorkout(entries, 1, date).date, date);
});
test('guest calendar retains a moved booking when reloaded without creating a second entry', async () => {
  const api = createGuestApi();
  const plan = await api.savePlan({ name: 'Upper', exercises: [{ name: 'Bench press', targetSets: 3, targetReps: 8 }] });
  const entry = await api.saveScheduledWorkout({ planId: plan.id, date: '2026-10-24' });
  await api.saveScheduledWorkout(moveScheduledWorkout(await api.getSchedule(), entry.id, '2026-11-01'));
  const reloaded = await api.getSchedule();
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].id, entry.id);
  assert.equal(reloaded[0].date, '2026-11-01');
});
test('account moves use PUT with a date-only payload and surface failed saves without mutating entries', async () => {
  const original = globalThis.fetch;
  const before = structuredClone(entries); let request;
  try {
    globalThis.fetch = async (url, options) => {
      if (url === '/api/auth/csrf') return { ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) };
      request = { url, ...options };
      return { ok: false, status: 409, json: async () => ({ detail: 'This plan is already scheduled for that date.' }) };
    };
    await assert.rejects(saveScheduledWorkout(moveScheduledWorkout(entries, 1, '2026-11-01')), /already scheduled/);
    assert.equal(request.method, 'PUT');
    assert.equal(request.url, '/api/schedule/1');
    assert.deepEqual(JSON.parse(request.body), { planId: 7, date: '2026-11-01' });
    assert.deepEqual(entries, before);
  } finally { globalThis.fetch = original; }
});
