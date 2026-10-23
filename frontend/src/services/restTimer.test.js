import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRestTimer, formatRestTime, isRestTimer, remainingRestMs, startRestTimer } from './restTimer.js';
import { createWorkoutDraft, workoutPayload } from './workouts.js';

test('uses planned rest, defaults missing targets to 60 seconds and respects explicit zero', () => {
  assert.equal(startRestTimer({ name: 'Press', restSeconds: 90 }, 1000).endsAt, 91000);
  assert.equal(startRestTimer({ name: 'Press' }, 1000).durationSeconds, 60);
  assert.equal(startRestTimer({ name: 'Press', restSeconds: 0 }), null);
  for (const duration of [-1, 1.5, 3601, NaN]) assert.equal(startRestTimer({ name: 'Press', restSeconds: duration }), null);
});
test('counts down by the deadline across missed ticks, minimization and refresh', () => {
  const timer = startRestTimer({ name: 'Press', restSeconds: 90 }, 1000);
  assert.equal(remainingRestMs(timer, 1000), 90000);
  assert.equal(remainingRestMs(timer, 31250), 59750);
  const restored = JSON.parse(JSON.stringify(timer));
  assert.equal(remainingRestMs(restored, 61000), 30000);
  assert.equal(remainingRestMs(restored, 121000), 0);
  assert.equal(formatRestTime(remainingRestMs(restored, 121000)), '0:00');
});
test('pause freezes time, resume uses only remaining time, reset stops at the full duration and skip clears', () => {
  const timer = startRestTimer({ name: 'Press', restSeconds: 60 }, 1000);
  const paused = changeRestTimer(timer, 'pause', 11500);
  assert.equal(paused.endsAt, null);
  assert.equal(remainingRestMs(paused, 100000), 49500);
  const resumed = changeRestTimer(paused, 'resume', 100000);
  assert.equal(resumed.endsAt, 149500);
  assert.equal(remainingRestMs(resumed, 110000), 39500);
  const reset = changeRestTimer(resumed, 'reset', 110000);
  assert.equal(reset.endsAt, null);
  assert.equal(reset.remainingMs, 60000);
  assert.equal(changeRestTimer(reset, 'skip'), null);
  assert.equal(timer.endsAt, 61000);
});
test('formats partial seconds without ending early and handles expired or malformed timers', () => {
  assert.equal(formatRestTime(1), '0:01');
  assert.equal(formatRestTime(60001), '1:01');
  assert.equal(formatRestTime(90000), '1:30');
  for (const timer of [null, {}, { durationSeconds: 60, exerciseName: 'Press', remainingMs: 'bad', endsAt: null }]) {
    assert.equal(isRestTimer(timer), false);
    assert.equal(remainingRestMs(timer), 0);
    assert.equal(changeRestTimer(timer, 'resume'), null);
  }
  const expired = startRestTimer({ name: 'Press', restSeconds: 10 }, 1000);
  assert.equal(changeRestTimer(expired, 'resume', 12000).endsAt, null);
});
test('timer stays in the restored draft but never becomes part of saved workout results', () => {
  const draft = createWorkoutDraft({ id: 7, name: 'Upper', exercises: [{ name: 'Press', targetSets: 1, targetReps: 8 }] });
  draft.exercises[0].sets[0] = { weight: '20', reps: '8' };
  draft.restTimer = startRestTimer({ name: 'Press', restSeconds: 90 }, 1000);
  const restored = JSON.parse(JSON.stringify(draft));
  assert.equal(isRestTimer(restored.restTimer), true);
  assert.equal(workoutPayload(restored).restTimer, undefined);
  assert.equal(workoutPayload(restored).exercises[0].sets[0].reps, 8);
});
