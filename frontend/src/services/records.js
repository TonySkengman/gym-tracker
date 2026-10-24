import { exerciseKey } from './progress.js';

// Recompute from saved sessions so History edits/deletions never leave stale records.
// Equal weights retain the earliest achievement; rep records compare exact rep counts.
export function getPersonalRecords(workouts, selectedKey) {
  const best = new Map();
  const ordered = workouts.filter(workout => Number.isFinite(Date.parse(workout.completedAt)))
    .slice().sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || String(a.id).localeCompare(String(b.id)));
  for (const workout of ordered) for (const set of workout.sets || []) {
    const key = exerciseKey(set.exerciseName, set.exerciseId);
    const weight = Number(set.weight), reps = Number(set.reps);
    if ((selectedKey && key !== selectedKey) || set.weight == null || set.weight === '' || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) continue;
    for (const kind of ['heaviest', 'reps']) {
      const recordKey = `${key}:${kind}:${kind === 'reps' ? reps : ''}`;
      const previous = best.get(recordKey);
      if (!previous || weight > previous.weight) best.set(recordKey, {
        key: recordKey, exerciseKey: key, kind, weight, reps, exerciseName: set.exerciseName,
        workoutId: workout.id, planName: workout.planName, completedAt: workout.completedAt,
        exerciseNumber: set.exerciseNumber, setNumber: set.setNumber,
      });
    }
  }
  return [...best.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)
    || (a.kind === b.kind ? a.reps - b.reps : a.kind === 'heaviest' ? -1 : 1));
}

export function newPersonalRecords(history, workout) {
  const previous = history.filter(item => item.id !== workout.id && Date.parse(item.completedAt) <= Date.parse(workout.completedAt));
  const before = new Map(getPersonalRecords(previous).map(record => [record.key, record]));
  return getPersonalRecords([...previous, workout]).filter(record => record.workoutId === workout.id)
    .map(record => ({ ...record, previous: before.get(record.key) || null }));
}
