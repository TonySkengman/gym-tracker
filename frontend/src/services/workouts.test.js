import test from 'node:test';
import assert from 'node:assert/strict';
import { completeWorkout, createWorkoutDraft, DRAFT_KEY, getWorkouts, groupWorkoutSets, readWorkoutDraft } from './workouts.js';

test('draft copies plan targets without sharing mutable set inputs', () => {
  const plan = { id: 7, name: 'Upper', exercises: [{ name: 'Press', targetSets: 2, targetReps: 8 }] };
  const draft = createWorkoutDraft(plan);
  assert.equal(draft.planId, 7);
  assert.equal(draft.exercises[0].sets.length, 2);
  draft.exercises[0].sets[0].reps = '6';
  assert.equal(draft.exercises[0].sets[1].reps, '');
  plan.name = 'Changed'; plan.exercises[0].name = 'Changed';
  assert.equal(draft.planName, 'Upper'); assert.equal(draft.exercises[0].name, 'Press');
  assert.match(draft.id, /^[0-9a-f-]{36}$/);
});
test('workout API sends numeric weights and reps and preserves retry ID', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return { ok: true, json: async () => [] }; };
  try {
    const draft = createWorkoutDraft({ id: 1, name: 'Upper', exercises: [{ name: 'Press', targetSets: 1, targetReps: 8 }] });
    draft.exercises[0].sets[0] = { weight: '12.5', reps: '8' };
    await completeWorkout(draft); await completeWorkout(draft); await getWorkouts();
    assert.equal(calls[0].url, '/api/workouts');
    assert.equal(JSON.parse(calls[0].body).id, JSON.parse(calls[1].body).id);
    assert.deepEqual(JSON.parse(calls[0].body).exercises[0].sets[0], { weight: 12.5, reps: 8 });
  } finally { globalThis.fetch = original; }
});
test('failed saves report an error so draft can be retained', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(getWorkouts(), /Cannot reach/);
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ detail: 'Invalid reps' }) });
    await assert.rejects(getWorkouts(), /Invalid reps/);
  } finally { globalThis.fetch = original; }
});
test('history keeps repeated exercise names in separate ordered groups', () => {
  const grouped = groupWorkoutSets([
    { exerciseName: 'Press', exerciseNumber: 1, setNumber: 1 },
    { exerciseName: 'Press', exerciseNumber: 1, setNumber: 2 },
    { exerciseName: 'Press', exerciseNumber: 2, setNumber: 1 },
  ]);
  assert.equal(grouped.length, 2); assert.equal(grouped[0].sets.length, 2);
});
test('draft restoration tolerates malformed data and unavailable browser storage', () => {
  const original = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: () => '{broken' }; assert.equal(readWorkoutDraft(), null);
    globalThis.localStorage = { getItem: () => JSON.stringify({ exercises: [] }) }; assert.equal(readWorkoutDraft(), null);
    const draft = createWorkoutDraft({ id: 1, name: 'Upper', exercises: [{ name: 'Press', targetSets: 1, targetReps: 8 }] });
    globalThis.localStorage = { getItem: key => key === DRAFT_KEY ? JSON.stringify(draft) : null };
    assert.deepEqual(readWorkoutDraft(), draft);
    globalThis.localStorage = { getItem: () => { throw new Error('denied'); } }; assert.equal(readWorkoutDraft(), null);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('blank weight is not silently converted to a completed bodyweight set', async () => {
  const draft = createWorkoutDraft({ id: 1, name: 'Upper', exercises: [{ name: 'Press', targetSets: 1, targetReps: 8 }] });
  draft.exercises[0].sets[0].reps = '8';
  await assert.rejects(completeWorkout(draft), /Enter weight and reps/);
});

test('skip serialization omits draft values and rejects an entirely skipped workout', async () => {
  const { workoutPayload } = await import('./workouts.js');
  const draft = createWorkoutDraft({ id: 1, name: 'Upper', exercises: [{ name: 'Press', exerciseId: 7, targetSets: 2, targetReps: 8 }, { name: 'Row', exerciseId: 8, targetSets: 1, targetReps: 10 }] });
  draft.exercises[0].skipped = true;
  draft.exercises[1].sets[0] = { weight: '20', reps: '10' };
  const body = workoutPayload(draft);
  assert.equal(body.exercises[0].exerciseId, 7);
  assert.deepEqual(body.exercises[0].sets, []);
  assert.deepEqual(body.exercises[1].sets, [{ weight: 20, reps: 10 }]);
  draft.exercises[1].skipped = true;
  assert.throws(() => workoutPayload(draft), /at least one exercise/);
});
test('history editing reconstructs skipped exercises and sends PUT; deletion accepts 204', async () => {
  const { workoutToDraft, updateWorkout, deleteWorkout } = await import('./workouts.js');
  const saved = { id: 'session-1', planId: 1, planName: 'Upper', startedAt: '2026-01-01T00:00:00Z', sets: [{ exerciseName: 'Row', exerciseId: 8, exerciseNumber: 2, setNumber: 1, targetReps: 10, weight: 20, reps: 8 }], skippedExercises: [{ exerciseName: 'Press', exerciseId: 7, exerciseNumber: 1, targetReps: 8 }] };
  const draft = workoutToDraft(saved);
  assert.equal(draft.exercises[0].skipped, true);
  assert.equal(draft.exercises[1].sets[0].weight, '20');
  const original = globalThis.fetch; const calls = [];
  try {
    globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return { ok: true, status: options.method === 'DELETE' ? 204 : 200, json: async () => saved }; };
    await updateWorkout(draft); assert.equal(calls[0].method, 'PUT'); assert.equal(calls[0].url, '/api/workouts/session-1');
    assert.equal(await deleteWorkout(saved.id), null); assert.equal(calls[1].method, 'DELETE');
  } finally { globalThis.fetch = original; }
});
