import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicatePlanDraft, savePlan } from './plans.js';
import { createGuestApi } from './guest.js';

const plan = {
  id: 7, name: 'Upper', description: 'Strength', ownerId: 1, scheduleId: 9,
  exercises: [
    { name: 'Bench press', exerciseId: 1, targetSets: 3, targetReps: 8, restSeconds: 90 },
    { name: 'Squat', exerciseId: 4, targetSets: 5, targetReps: 5, restSeconds: 0 },
    { name: 'Bench press', exerciseId: 1, targetSets: 2, targetReps: 12 },
  ],
};
test('duplicates routine data and order without IDs, ownership or shared exercise objects', () => {
  const before = structuredClone(plan);
  const copy = duplicatePlanDraft(plan, [plan]);
  assert.equal(copy.name, 'Upper (copy)');
  assert.equal(copy.description, plan.description);
  assert.equal(copy.id, undefined);
  assert.equal(copy.ownerId, undefined);
  assert.equal(copy.scheduleId, undefined);
  assert.deepEqual(copy.exercises, plan.exercises.map(item => ({ ...item, restSeconds: item.restSeconds ?? null })));
  copy.exercises[0].targetSets = 10;
  assert.deepEqual(plan, before);
});
test('copy names stay within the API limit and avoid case/whitespace collisions', () => {
  const existing = [{ name: ' UPPER  (COPY) ' }, { name: 'Upper (copy 2)' }];
  assert.equal(duplicatePlanDraft(plan, existing).name, 'Upper (copy 3)');
  const long = { ...plan, name: 'A'.repeat(100) };
  const first = duplicatePlanDraft(long);
  const second = duplicatePlanDraft(long, [first]);
  assert.equal(first.name.length, 100);
  assert.equal(second.name.length, 100);
  assert.ok(second.name.endsWith(' (copy 2)'));
});
test('account duplicate is created with POST rather than updating the source plan', async () => {
  const original = globalThis.fetch; let call;
  try {
    globalThis.fetch = async (url, options) => {
      if (url === '/api/auth/csrf') return { ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) };
      call = { url, ...options }; return { ok: true, json: async () => ({ id: 8, ...JSON.parse(options.body) }) };
    };
    const saved = await savePlan(duplicatePlanDraft(plan, [plan]));
    assert.equal(call.method, 'POST');
    assert.equal(call.url, '/api/plans');
    assert.equal(saved.id, 8);
    assert.equal(JSON.parse(call.body).id, undefined);
  } finally { globalThis.fetch = original; }
});
test('guest duplicates save independently and never duplicate calendar bookings or workout history', async () => {
  const api = createGuestApi();
  const original = await api.savePlan({ name: plan.name, description: plan.description, exercises: plan.exercises });
  await api.saveScheduledWorkout({ planId: original.id, date: '2026-10-25' });
  const copy = duplicatePlanDraft(original, await api.getPlans());
  copy.exercises[0].targetReps = 15;
  const saved = await api.savePlan(copy);
  assert.notEqual(saved.id, original.id);
  const plans = await api.getPlans();
  assert.equal(plans.length, 2);
  assert.equal(plans.find(item => item.id === original.id).exercises[0].targetReps, 8);
  assert.equal(plans.find(item => item.id === saved.id).exercises[0].targetReps, 15);
  assert.equal((await api.getSchedule()).length, 1);
  assert.deepEqual(await api.getWorkouts(), []);
});
