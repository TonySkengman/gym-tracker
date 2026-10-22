import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDays, deleteScheduledWorkout, getSchedule, nextScheduledWorkouts, nextScheduledWorkout, saveScheduledWorkout, scheduleDate } from './schedule.js';
import { localDateKey } from './progress.js';
import { createWorkoutDraft, workoutPayload } from './workouts.js';

test('calendar has 42 Monday-first days including adjacent months', () => {
  const days = calendarDays(2026, 9);
  assert.equal(days.length, 42);
  assert.equal(days[0].key, '2026-09-28'); assert.equal(days[41].key, '2026-11-08');
  assert.equal(scheduleDate(days[0].key).getDay(), 1);
  assert.equal(days.filter(day => day.inMonth).length, 31);
  assert.equal(new Set(days.map(day => day.key)).size, 42);
});
test('calendar handles leap years and year boundaries', () => {
  assert.equal(calendarDays(2028, 1).filter(day => day.inMonth).length, 29);
  assert.equal(calendarDays(2027, 1).filter(day => day.inMonth).length, 28);
  const december = calendarDays(2026, 11);
  assert.ok(december.some(day => day.key === '2027-01-01' && !day.inMonth));
});
test('date-only parsing keeps calendar days across DST boundaries', () => {
  for (const key of ['2026-03-29', '2026-10-25', '2026-01-01', '2026-12-31']) {
    assert.equal(localDateKey(scheduleDate(key)), key);
    assert.equal(scheduleDate(key).getHours(), 12);
  }
});
test('upcoming includes today, excludes completed/deleted/past entries, and keeps input unchanged', () => {
  const entries = [
    { id: 9, date: '2026-10-23', planAvailable: true },
    { id: 2, date: '2026-10-22', completedWorkoutId: 'done' },
    { id: 3, date: '2026-10-22', planAvailable: false },
    { id: 4, date: '2026-10-21' },
    { id: 7, date: '2026-10-22' }, { id: 6, date: '2026-10-22' },
  ];
  const copy = structuredClone(entries);
  assert.equal(nextScheduledWorkout(entries, '2026-10-22').id, 6);
  assert.equal(nextScheduledWorkout(entries, '2026-10-23').id, 9);
  assert.equal(nextScheduledWorkout(entries, '2026-10-24'), null);
  assert.equal(nextScheduledWorkout([], '2026-10-22'), null);
  assert.deepEqual(entries, copy);
});
test('schedule API creates, reschedules and removes entries without shifting the date', async () => {
  const original = globalThis.fetch; const calls = [];
  try {
    globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return { ok: true, status: options.method === 'DELETE' ? 204 : 200, json: async () => ({ id: 7 }) }; };
    await getSchedule(); await saveScheduledWorkout({ planId: '12', date: '2026-10-25' });
    await saveScheduledWorkout({ id: 7, planId: 12, date: '2026-10-26' }); await deleteScheduledWorkout(7);
    assert.equal(calls[0].url, '/api/schedule');
    assert.deepEqual(JSON.parse(calls[1].body), { planId: 12, date: '2026-10-25' });
    assert.equal(calls[2].method, 'PUT'); assert.equal(calls[2].url, '/api/schedule/7');
    assert.equal(calls[3].method, 'DELETE');
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ detail: 'This plan is already scheduled for that date.' }) });
    await assert.rejects(saveScheduledWorkout({ planId: 12, date: '2026-10-25' }), /already scheduled/);
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(getSchedule(), /Cannot reach/);
  } finally { globalThis.fetch = original; }
});
test('a resumed scheduled workout keeps its schedule link in the save payload', () => {
  const draft = { ...createWorkoutDraft({ id: 12, name: 'Upper', exercises: [{ name: 'Press', targetSets: 1, targetReps: 8 }] }), scheduleId: 7 };
  draft.exercises[0].sets[0] = { weight: '20', reps: '8' };
  const restored = JSON.parse(JSON.stringify(draft));
  assert.equal(workoutPayload(restored).scheduleId, 7);
});

test('next workouts includes every pending plan on the earliest day and advances when completed', () => {
  const entries = [
    { id: 4, date: '2026-10-23' },
    { id: 3, date: '2026-10-22' },
    { id: 1, date: '2026-10-22', completedWorkoutId: 'done' },
    { id: 2, date: '2026-10-22' },
    { id: 5, date: '2026-10-22', planAvailable: false },
    { id: 6, date: '2026-10-21' },
  ];
  const copy = structuredClone(entries);
  assert.deepEqual(nextScheduledWorkouts(entries, '2026-10-22').map(entry => entry.id), [2, 3]);
  assert.deepEqual(entries, copy);
  entries[1].completedWorkoutId = 'done';
  assert.deepEqual(nextScheduledWorkouts(entries, '2026-10-22').map(entry => entry.id), [2]);
  entries[3].completedWorkoutId = 'done';
  assert.deepEqual(nextScheduledWorkouts(entries, '2026-10-22').map(entry => entry.id), [4]);
  assert.deepEqual(nextScheduledWorkouts(entries, '2026-10-24'), []);
  assert.deepEqual(nextScheduledWorkouts([], '2026-10-22'), []);
});
