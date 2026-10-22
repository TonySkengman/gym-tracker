import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuestApi } from './guest.js';
import { createWorkoutDraft, workoutToDraft } from './workouts.js';

const routine = name => ({ name, description: 'Guest training', exercises: [
  { name: 'Bench press', targetSets: 1, targetReps: 8 },
  { name: 'Barbell row', targetSets: 1, targetReps: 10 },
] });

test('guest plans, logging, history and schedule work without network or browser storage', async () => {
  const fetchBefore = globalThis.fetch, storageBefore = globalThis.localStorage;
  globalThis.fetch = () => { throw new Error('Guest data must not reach the backend'); };
  globalThis.localStorage = new Proxy({}, { get() { throw new Error('Guest data must not be persisted'); } });
  try {
    const guest = createGuestApi();
    let plan = await guest.savePlan(routine('Upper'));
    assert.equal((await guest.getPlans()).length, 1);
    assert.equal(plan.exercises[0].name, 'Bench press');
    assert.ok(plan.exercises[0].exerciseId);
    plan = await guest.savePlan({ ...plan, name: 'Upper strength' });
    assert.equal((await guest.getPlans())[0].name, 'Upper strength');
    const entry = await guest.saveScheduledWorkout({ planId: String(plan.id), date: '2026-11-01' });
    await assert.rejects(guest.saveScheduledWorkout({ planId: plan.id, date: entry.date }), /already scheduled/);
    const moved = await guest.saveScheduledWorkout({ ...entry, date: '2026-11-02' });
    assert.equal(moved.date, '2026-11-02');
    const draft = { ...createWorkoutDraft(plan), scheduleId: entry.id };
    draft.exercises[0].sets[0] = { weight: '25', reps: '8' };
    draft.exercises[1].skipped = true;
    const saved = await guest.completeWorkout(draft);
    assert.equal(saved.sets[0].weight, 25);
    assert.equal(saved.sets[0].exerciseName, 'Bench press');
    assert.equal(saved.skippedExercises[0].exerciseName, 'Barbell row');
    assert.equal((await guest.getSchedule())[0].completedWorkoutId, saved.id);
    assert.deepEqual(await guest.completeWorkout(draft), saved);
    assert.equal((await guest.getWorkouts()).length, 1);
    await assert.rejects(guest.saveScheduledWorkout({ ...moved, date: '2026-11-03' }), /cannot be rescheduled/);
    const edit = workoutToDraft(saved); edit.exercises[0].sets[0].weight = '30';
    const updated = await guest.updateWorkout(edit);
    assert.equal(updated.sets[0].weight, 30);
    assert.equal(updated.startedAt, saved.startedAt);
    assert.equal(updated.completedAt, saved.completedAt);
    await guest.deleteWorkout(saved.id);
    assert.deepEqual(await guest.getWorkouts(), []);
    assert.equal((await guest.getSchedule())[0].completedWorkoutId, null);
    await guest.deletePlan(plan.id);
    assert.equal((await guest.getSchedule())[0].planAvailable, false);
    await guest.deleteScheduledWorkout(entry.id);
    assert.deepEqual(await guest.getPlans(), []);
    assert.deepEqual(await guest.getSchedule(), []);
  } finally { globalThis.fetch = fetchBefore; globalThis.localStorage = storageBefore; }
});
test('new visits start empty and cannot see another workspace or mutate its snapshots', async () => {
  const first = createGuestApi(), second = createGuestApi();
  const plan = await first.savePlan(routine('Private guest visit'));
  plan.name = 'Mutated response';
  assert.equal((await first.getPlans())[0].name, 'Private guest visit');
  const custom = await first.createExercise('  Guest   press ');
  assert.equal(custom.name, 'Guest press');
  await assert.rejects(first.createExercise('GUEST PRESS'), /already exists/);
  assert.equal((await first.getExercises()).length, 51);
  assert.equal((await second.getExercises()).length, 50);
  assert.deepEqual(await second.getPlans(), []);
  assert.deepEqual(await second.getWorkouts(), []);
  assert.deepEqual(await second.getSchedule(), []);
  await assert.rejects(second.deletePlan(plan.id), /no longer/);
});
test('guest workouts reject blank and invalid recorded sets', async () => {
  const guest = createGuestApi(), plan = await guest.savePlan(routine('Upper'));
  const draft = createWorkoutDraft(plan);
  await assert.rejects(guest.completeWorkout(draft), /Enter weight and reps/);
  draft.exercises.forEach(exercise => { exercise.skipped = true; });
  await assert.rejects(guest.completeWorkout(draft), /at least one exercise/);
  draft.exercises[0].skipped = false;
  draft.exercises[0].sets[0] = { weight: '-1', reps: '8' };
  await assert.rejects(guest.completeWorkout(draft), /weights/);
  assert.deepEqual(await guest.getWorkouts(), []);
});

test('guest rest targets survive edits and workout creation without defaulting older plans', async () => {
  const guest = createGuestApi();
  const input = routine('Upper'); input.exercises[0].restSeconds = '90';
  let plan = await guest.savePlan(input);
  assert.equal((await guest.getPlans())[0].exercises[0].restSeconds, 90);
  assert.equal(createWorkoutDraft(plan).exercises[0].restSeconds, 90);
  assert.equal(plan.exercises[1].restSeconds, null);
  plan.exercises[0].restSeconds = '0'; plan = await guest.savePlan(plan);
  assert.equal(plan.exercises[0].restSeconds, 0);
  plan.exercises[0].restSeconds = ''; plan = await guest.savePlan(plan);
  assert.equal(plan.exercises[0].restSeconds, null);
  for (const rest of [-1, 3601, 1.5]) {
    plan.exercises[0].restSeconds = rest;
    await assert.rejects(guest.savePlan(plan), /Rest time/);
  }
});
