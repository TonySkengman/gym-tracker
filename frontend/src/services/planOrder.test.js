import test from 'node:test';
import assert from 'node:assert/strict';
import { moveExercise } from './planOrder.js';
import { createGuestApi } from './guest.js';
import { savePlan } from './plans.js';

const exercises = [
  { name: 'Bench press', exerciseId: 1, targetSets: 3, targetReps: 8, restSeconds: 90 },
  { name: 'Squat', exerciseId: 4, targetSets: 5, targetReps: 5, restSeconds: 180 },
  { name: 'Bench press', exerciseId: 1, targetSets: 2, targetReps: 12, restSeconds: 60 },
];
test('reordering preserves complete entries and repeated exercises without mutating the original', () => {
  const before = structuredClone(exercises);
  const reordered = moveExercise(exercises, 0, 2);
  assert.deepEqual(reordered, [exercises[1], exercises[2], exercises[0]]);
  assert.equal(reordered[1].targetReps, 12);
  assert.equal(reordered[2].restSeconds, 90);
  assert.deepEqual(moveExercise(reordered, 2, 0), exercises);
  assert.deepEqual(exercises, before);
});
test('boundary moves, no-op moves and invalid positions do not change the plan', () => {
  for (const [from, to] of [[0, -1], [2, 3], [-1, 0], [3, 0], [1, 1], [0, 1.5]])
    assert.equal(moveExercise(exercises, from, to), exercises);
  const empty = [];
  assert.equal(moveExercise(empty, 0, 0), empty);
});
test('guest plans retain reordered entries when edited and reloaded', async () => {
  const api = createGuestApi();
  const created = await api.savePlan({ name: 'Upper', exercises });
  const reordered = moveExercise(created.exercises, 2, 0);
  await api.savePlan({ ...created, exercises: reordered });
  const [reloaded] = await api.getPlans();
  assert.deepEqual(reloaded.exercises, reordered);
  assert.equal(reloaded.exercises[0].restSeconds, 60);
});
test('account plan requests send exercises in the selected order with their original targets', async () => {
  const original = globalThis.fetch;
  let body;
  try {
    globalThis.fetch = async (url, options) => {
      if (url === '/api/auth/csrf') return { ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) };
      body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ id: 7, ...body }) };
    };
    const ordered = moveExercise(exercises, 1, 0);
    const saved = await savePlan({ id: 7, name: 'Upper', exercises: ordered });
    assert.deepEqual(body.exercises, ordered);
    assert.deepEqual(saved.exercises, ordered);
  } finally { globalThis.fetch = original; }
});
