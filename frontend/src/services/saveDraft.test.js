import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkoutDraft, DRAFT_KEY, readWorkoutDraft, saveWorkoutDraft } from './workouts.js';

test('explicit Save preserves partially entered sets under the account key without submitting a workout', () => {
  const originalStorage = globalThis.localStorage, originalFetch = globalThis.fetch;
  const values = new Map(); let calls = 0;
  globalThis.localStorage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) ?? null };
  globalThis.fetch = () => { calls++; throw new Error('Saving a draft must not finish it'); };
  try {
    const draft = createWorkoutDraft({ id: 7, name: 'Upper', exercises: [{ name: 'Press', targetSets: 2, targetReps: 8 }] });
    draft.exercises[0].sets[0] = { weight: '60', reps: '8' };
    draft.exercises[0].sets[1] = { weight: '60', reps: '' };
    draft.scheduleId = 9;
    const key = `${DRAFT_KEY}-user-1`;
    saveWorkoutDraft(draft, key);
    assert.deepEqual(readWorkoutDraft(key), draft);
    assert.equal(readWorkoutDraft(`${DRAFT_KEY}-user-2`), null);
    assert.equal(calls, 0);
    assert.equal(draft.completedAt, undefined);
  } finally { globalThis.localStorage = originalStorage; globalThis.fetch = originalFetch; }
});
test('failed Save surfaces a useful error and leaves the editable draft intact', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { setItem() { throw new Error('quota exceeded'); } };
  try {
    const draft = { id: 'draft', exercises: [{ sets: [{ weight: '60', reps: '8' }] }] };
    const before = structuredClone(draft);
    assert.throws(() => saveWorkoutDraft(draft, 'account-key'), /Could not save workout progress/);
    assert.deepEqual(draft, before);
  } finally { globalThis.localStorage = original; }
});
