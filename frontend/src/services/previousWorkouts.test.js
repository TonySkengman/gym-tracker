import test from 'node:test';
import assert from 'node:assert/strict';
import { previousExerciseSessions } from './workouts.js';

const recorded = (exerciseNumber, weight, reps, exerciseId = 7, exerciseName = 'Bench press', setNumber = 1) => ({ exerciseNumber, exerciseId, exerciseName, setNumber, weight, reps });
const session = (id, completedAt, sets, planName = 'Upper') => ({ id, completedAt, sets, planName });
const draft = { id: 'active', startedAt: '2026-10-23T12:00:00Z', exercises: [{ name: 'Bench press', exerciseId: 7 }] };

test('finds most recent completed exercise across plans, regardless of input order or renamed catalog label', () => {
  const history = [
    session('old', '2026-10-19T10:00:00Z', [recorded(1, 50, 10)]),
    session('new', '2026-10-22T10:00:00Z', [recorded(1, 60, 8, 7, 'Previous press name', 2), recorded(1, 62.5, 7, 7, 'Previous press name', 1)], 'Push day'),
  ];
  const before = structuredClone({ draft, history });
  const [last] = previousExerciseSessions(draft, history);
  assert.equal(last.workoutId, 'new');
  assert.equal(last.planName, 'Push day');
  assert.deepEqual(last.sets, [{ weight: 62.5, reps: 7, setNumber: 1 }, { weight: 60, reps: 8, setNumber: 2 }]);
  assert.deepEqual({ draft, history }, before);
});
test('excludes the current workout, later sessions, invalid timestamps and skipped exercises', () => {
  const history = [
    session('active', '2026-10-22T10:00:00Z', [recorded(1, 200, 1)]),
    session('future', '2026-10-24T10:00:00Z', [recorded(1, 200, 1)]),
    session('bad', 'invalid', [recorded(1, 200, 1)]),
    { ...session('skipped', '2026-10-22T10:00:00Z', []), skippedExercises: [{ exerciseId: 7 }] },
    session('performed', '2026-10-21T10:00:00Z', [recorded(1, 60, 8)]),
  ];
  assert.equal(previousExerciseSessions(draft, history)[0].workoutId, 'performed');
  assert.deepEqual(previousExerciseSessions(draft, []), [null]);
});
test('legacy names ignore whitespace/case while distinct catalog IDs stay separate', () => {
  const legacy = session('legacy', '2026-10-21T10:00:00Z', [recorded(1, 0, 12, null, ' BENCH   PRESS ')]);
  assert.equal(previousExerciseSessions(draft, [legacy])[0].sets[0].weight, 0);
  const another = session('other', '2026-10-22T10:00:00Z', [recorded(1, 80, 8, 99)]);
  assert.equal(previousExerciseSessions(draft, [another])[0], null);
  assert.equal(previousExerciseSessions(draft, [another, legacy])[0].workoutId, 'legacy');
});
test('keeps repeated exercise blocks separate, with no fabricated sets for added occurrences', () => {
  const repeated = { ...draft, exercises: [draft.exercises[0], draft.exercises[0], draft.exercises[0]] };
  const last = session('last', '2026-10-22T10:00:00Z', [recorded(3, 40, 10), recorded(1, 60, 8)]);
  const values = previousExerciseSessions(repeated, [last]);
  assert.equal(values[0].sets[0].weight, 60);
  assert.equal(values[1].sets[0].weight, 40);
  assert.equal(values[2], null);
  assert.equal(values[0].sets[1], undefined);
});
test('ignores invalid saved set values rather than showing them as previous bodyweight sets', () => {
  const invalid = session('invalid', '2026-10-22T10:00:00Z', [recorded(1, null, 8), recorded(1, '', 8), recorded(1, -1, 8), recorded(1, 20, 0)]);
  assert.equal(previousExerciseSessions(draft, [invalid])[0], null);
});
