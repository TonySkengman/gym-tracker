// Catalog identities keep progress stable; legacy records still work by normalized name.
export function exerciseKey(name, id) {
  if (id != null) return `id:${id}`;
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getExerciseOptions(workouts, plans = [], catalog = []) {
  const names = new Map();
  function add(name, id) {
    const key = exerciseKey(name, id);
    if (key && !names.has(key)) names.set(key, name.trim().replace(/\s+/g, ' '));
  }
  catalog.forEach(exercise => add(exercise.name, exercise.id));
  workouts.forEach(workout => workout.sets.forEach(set => add(set.exerciseName, set.exerciseId)));
  plans.forEach(plan => plan.exercises.forEach(exercise => add(exercise.name, exercise.exerciseId)));
  return [...names].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// Match the browser's local calendar dates, including both filter boundaries.
export function localDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getExerciseProgress(workouts, selectedExercise, from = '', to = '') {
  if (!selectedExercise || (from && to && from > to)) return [];
  return workouts.flatMap(workout => {
    const timestamp = Date.parse(workout.completedAt);
    if (!Number.isFinite(timestamp)) return [];
    const day = localDateKey(workout.completedAt);
    if ((from && day < from) || (to && day > to)) return [];
    const sets = workout.sets.filter(set => exerciseKey(set.exerciseName, set.exerciseId) === selectedExercise);
    if (!sets.length) return [];
    return [{
      id: workout.id,
      completedAt: workout.completedAt,
      timestamp,
      planName: workout.planName,
      heaviestWeight: Math.max(...sets.map(set => Number(set.weight))),
      // Round once after summing to avoid displaying floating point artifacts.
      volume: Math.round(sets.reduce((total, set) => total + Number(set.weight) * set.reps, 0) * 100) / 100,
      setCount: sets.length,
    }];
  }).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}
