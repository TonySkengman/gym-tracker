import test from 'node:test';
import assert from 'node:assert/strict';
import { exerciseKey, getExerciseOptions, getExerciseProgress, localDateKey } from './progress.js';

const set = (name, weight, reps, exerciseNumber = 1) => ({ exerciseName: name, weight, reps, exerciseNumber });
const workout = (id, date, sets) => ({ id, completedAt: date, planName: `Plan ${id}`, sets });
const localTime = (day, hour = 12) => new Date(2026, 9, day, hour).toISOString();

test('exercise selection combines case and whitespace variants across plans and history', () => {
  const options = getExerciseOptions([workout('a', localTime(10), [set(' Bench   press ', 10, 8), set('bench PRESS', 12, 8)])], [{ exercises: [{ name: 'Squat' }, { name: 'Bench press' }] }]);
  assert.deepEqual(options.map(option => option.key), ['bench press', 'squat']);
  assert.equal(exerciseKey('  BENCH\tPress  '), 'bench press');
});
test('progress sums all matching sets and repeated exercise groups once per session', () => {
  const data = getExerciseProgress([workout('a', localTime(10), [set('Press', 10, 8), set('Press', 12.5, 6), set('PRESS', 15, 5, 2), set('Squat', 100, 10)])], 'press');
  assert.equal(data.length, 1);
  assert.equal(data[0].heaviestWeight, 15);
  assert.equal(data[0].volume, 230);
  assert.equal(data[0].setCount, 3);
});
test('orders sessions chronologically while keeping same-day sessions separate', () => {
  const data = getExerciseProgress([
    workout('late', localTime(11, 18), [set('Press', 20, 5)]),
    workout('early', localTime(11, 8), [set('Press', 10, 5)]),
    workout('previous', localTime(10), [set('Press', 5, 5)]),
  ], 'press');
  assert.deepEqual(data.map(point => point.id), ['previous', 'early', 'late']);
});
test('filters include complete local boundary days and support open date ranges', () => {
  const workouts = [
    workout('before', localTime(9, 23), [set('Press', 10, 8)]),
    workout('start', localTime(10, 0), [set('Press', 10, 8)]),
    workout('end', localTime(11, 23), [set('Press', 10, 8)]),
    workout('after', localTime(12, 0), [set('Press', 10, 8)]),
  ];
  assert.deepEqual(getExerciseProgress(workouts, 'press', '2026-10-10', '2026-10-11').map(point => point.id), ['start', 'end']);
  assert.equal(getExerciseProgress(workouts, 'press', '2026-10-10').length, 3);
  assert.equal(getExerciseProgress(workouts, 'press', '', '2026-10-11').length, 3);
  assert.equal(localDateKey(localTime(10, 0)), '2026-10-10');
});
test('keeps zero-weight sessions and rounds decimal volume without floating point noise', () => {
  const data = getExerciseProgress([
    workout('bodyweight', localTime(10), [set('Press', 0, 10)]),
    workout('fractional', localTime(11), [set('Press', 0.1, 3), set('Press', 0.2, 3)]),
  ], 'press');
  assert.equal(data[0].heaviestWeight, 0); assert.equal(data[0].volume, 0);
  assert.equal(data[1].volume, 0.9);
});
test('returns no chart points for missing exercises, invalid ranges or invalid dates', () => {
  const workouts = [workout('a', localTime(10), [set('Press', 10, 8)]), workout('bad', 'invalid', [set('Press', 20, 8)])];
  assert.deepEqual(getExerciseProgress(workouts, 'squat'), []);
  assert.deepEqual(getExerciseProgress(workouts, undefined), []);
  assert.deepEqual(getExerciseProgress(workouts, 'press', '2026-10-11', '2026-10-10'), []);
  assert.equal(getExerciseProgress(workouts, 'press').length, 1);
});

test('catalog IDs keep histories linked despite snapshot name changes', () => {
  const workouts = [workout('a', localTime(10), [{ ...set('Old name', 10, 8), exerciseId: 7 }]), workout('b', localTime(11), [{ ...set('Canonical name', 20, 8), exerciseId: 7 }])];
  const options = getExerciseOptions(workouts, [], [{ id: 7, name: 'Canonical name' }]);
  assert.deepEqual(options, [{ key: 'id:7', name: 'Canonical name' }]);
  assert.equal(getExerciseProgress(workouts, 'id:7').length, 2);
  assert.deepEqual(getExerciseProgress(workouts, 'old name'), []);
});
test('skipped exercises do not add data points or fabricated zero volume', () => {
  const sessions = [ { ...workout('skipped', localTime(10), []), skippedExercises: [{ exerciseId: 7, exerciseName: 'Press' }] }, workout('logged', localTime(11), [{ ...set('Press', 10, 8), exerciseId: 7 }]) ];
  assert.deepEqual(getExerciseProgress(sessions, 'id:7').map(point => point.id), ['logged']);
});
