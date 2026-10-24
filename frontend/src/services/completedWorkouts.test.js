import test from 'node:test';
import assert from 'node:assert/strict';
import { completedWorkoutExercises, createWorkoutDraft, workoutToDraft } from './workouts.js';
import { createGuestApi } from './guest.js';

test('completed results keep repeated exercise blocks, recorded set order, zero weights and skipped entries', () => {
  const workout = { sets: [
    { exerciseNumber: 3, exerciseName: 'Bench press', exerciseId: 1, setNumber: 1, weight: 40, reps: 12 },
    { exerciseNumber: 1, exerciseName: 'Bench press', exerciseId: 1, setNumber: 2, weight: 62.5, reps: 6 },
    { exerciseNumber: 1, exerciseName: 'Bench press', exerciseId: 1, setNumber: 1, weight: 0, reps: 8 },
  ], skippedExercises: [{ exerciseNumber: 2, exerciseName: 'Squat', exerciseId: 4 }] };
  const original = structuredClone(workout);
  const exercises = completedWorkoutExercises(workout);
  assert.deepEqual(exercises.map(exercise => exercise.exerciseNumber), [1, 2, 3]);
  assert.deepEqual(exercises[0].sets.map(set => [set.weight, set.reps]), [[0, 8], [62.5, 6]]);
  assert.equal(exercises[1].skipped, true);
  assert.deepEqual(exercises[1].sets, []);
  assert.equal(exercises[2].sets[0].reps, 12);
  assert.deepEqual(workout, original);
});
test('calendar completion resolves the exact saved session after source plan deletion and history edits', async () => {
  const api = createGuestApi();
  const plan = await api.savePlan({ name: 'Original upper', exercises: [{ name: 'Bench press', targetSets: 1, targetReps: 8 }] });
  const entry = await api.saveScheduledWorkout({ planId: plan.id, date: '2026-10-25' });
  const draft = { ...createWorkoutDraft(plan), scheduleId: entry.id };
  draft.exercises[0].sets[0] = { weight: '62.5', reps: '7' };
  const saved = await api.completeWorkout(draft);
  await api.deletePlan(plan.id);
  let [booking] = await api.getSchedule();
  assert.equal(booking.planAvailable, false);
  const linked = (await api.getWorkouts()).find(workout => workout.id === booking.completedWorkoutId);
  assert.equal(linked.id, saved.id);
  assert.equal(linked.planName, 'Original upper');
  assert.equal(completedWorkoutExercises(linked)[0].sets[0].weight, 62.5);
  const edit = workoutToDraft(linked); edit.exercises[0].sets[0].weight = '65';
  await api.updateWorkout(edit);
  const updated = (await api.getWorkouts()).find(workout => workout.id === booking.completedWorkoutId);
  assert.equal(completedWorkoutExercises(updated)[0].sets[0].weight, 65);
  await api.deleteWorkout(saved.id);
  [booking] = await api.getSchedule();
  assert.equal(booking.completedWorkoutId, null);
});
