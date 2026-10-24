import test from 'node:test';
import assert from 'node:assert/strict';
import { getPersonalRecords, newPersonalRecords } from './records.js';
import { createGuestApi } from './guest.js';

const set = (weight, reps, extra = {}) => ({ exerciseId: 1, exerciseName: 'Bench press', exerciseNumber: 1, setNumber: 1, weight, reps, ...extra });
const session = (id, day, sets) => ({ id, planName: 'Upper', completedAt: `2026-10-${day}T12:00:00Z`, sets });

test('records compare exact reps and retain the actual set and session identity', () => {
  const history = [session('b', 22, [set(70, 3), set(65, 5, { setNumber: 2 })]), session('a', 20, [set(62.5, 5), set(57.5, 8)])];
  const before = structuredClone(history);
  const records = getPersonalRecords(history, 'id:1');
  assert.equal(records.find(r => r.kind === 'heaviest').weight, 70);
  const five = records.find(r => r.kind === 'reps' && r.reps === 5);
  assert.equal(five.weight, 65); assert.equal(five.workoutId, 'b'); assert.equal(five.setNumber, 2);
  assert.equal(records.find(r => r.reps === 8).weight, 57.5);
  assert.deepEqual(history, before);
});
test('ties preserve earliest achievement regardless of input ordering', () => {
  const records = newPersonalRecords([session('a', 20, [set(65, 5)])], session('b', 21, [set(65, 5)]));
  assert.deepEqual(records, []);
});
test('a new rep benchmark differs from an improvement and multiple sets yield only final records', () => {
  const records = newPersonalRecords([session('a', 20, [set(62.5, 5)])], session('b', 21, [set(65, 5), set(67.5, 5, { setNumber: 2 }), set(55, 10)]));
  const five = records.find(r => r.kind === 'reps' && r.reps === 5);
  assert.equal(five.weight, 67.5); assert.equal(five.previous.weight, 62.5);
  assert.equal(records.find(r => r.reps === 10).previous, null);
  assert.equal(records.filter(r => r.kind === 'reps' && r.reps === 5).length, 1);
});
test('zero added weight is a valid benchmark; skipped and invalid sets do not produce records', () => {
  const history = [session('a', 20, [set(0, 8), set(-1, 5), set('', 5), set(null, 5), set(10, 1.5), set('invalid', 5)])];
  history[0].skippedExercises = [{ exerciseName: 'Squat', exerciseId: 2 }];
  assert.equal(getPersonalRecords(history).length, 2);
  assert.equal(getPersonalRecords(history)[0].weight, 0);
  assert.deepEqual(getPersonalRecords([session('bad', 'xx', [set(100, 5)])]), []);
});
test('catalog identities isolate same-named exercises and legacy names normalize', () => {
  const records = getPersonalRecords([session('a', 20, [set(60, 5), set(80, 5, { exerciseId: 2 }), set(20, 8, { exerciseId: null, exerciseName: ' Curl ' }), set(25, 8, { exerciseId: null, exerciseName: 'curl' })])]);
  assert.equal(records.filter(r => r.exerciseKey === 'curl').length, 2);
  assert.equal(records.find(r => r.exerciseKey === 'curl').weight, 25);
  assert.equal(records.find(r => r.exerciseKey === 'id:1').weight, 60);
});
test('edits and deletions immediately recalculate records; retry excludes the same workout', () => {
  const earlier = session('a', 20, [set(60, 5)]), later = session('b', 21, [set(65, 5)]);
  later.sets[0].weight = 55;
  assert.equal(getPersonalRecords([earlier, later])[0].workoutId, 'a');
  assert.equal(getPersonalRecords([later])[0].weight, 55);
  assert.equal(newPersonalRecords([earlier, session('b', 21, [set(65, 5)])], session('b', 21, [set(65, 5)]))[0].previous.weight, 60);
});
test('future sessions are excluded from a completion comparison', () => {
  const records = newPersonalRecords([session('future', 25, [set(100, 5)])], session('now', 21, [set(65, 5)]));
  assert.equal(records.length, 2); assert.equal(records[0].previous, null);
});
test('guest completed records reflect edited History and remain isolated between visits', async () => {
  const api = createGuestApi();
  const draft = { id: 'test-pr', planName: 'Upper', startedAt: '2026-10-24T10:00:00Z', exercises: [{ exerciseId: 1, name: 'Bench press', targetReps: 5, sets: [{ weight: '65', reps: '5' }] }] };
  await api.completeWorkout(draft);
  assert.equal(getPersonalRecords(await api.getWorkouts())[0].weight, 65);
  await api.updateWorkout({ ...draft, exercises: [{ ...draft.exercises[0], sets: [{ weight: '60', reps: '5' }] }] });
  assert.equal(getPersonalRecords(await api.getWorkouts())[0].weight, 60);
  assert.deepEqual(getPersonalRecords(await createGuestApi().getWorkouts()), []);
  await api.deleteWorkout(draft.id);
  assert.deepEqual(getPersonalRecords(await api.getWorkouts()), []);
});
