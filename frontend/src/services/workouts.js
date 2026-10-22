export async function getWorkouts() {
  return request();
}
export const completeWorkout = draft => saveWorkout(draft, '', 'POST');
export const updateWorkout = draft => saveWorkout(draft, `/${draft.id}`, 'PUT');
export const deleteWorkout = id => request({ method: 'DELETE' }, `/${id}`);
export function workoutPayload(draft) {
  const performed = draft.exercises.filter(exercise => !exercise.skipped);
  if (!performed.length) throw new Error('Record at least one exercise before saving your workout.');
  if (performed.some(exercise => !exercise.sets.length || exercise.sets.some(set => String(set.weight).trim() === '' || String(set.reps).trim() === ''))) {
    throw new Error('Enter weight and reps for every recorded set, or skip the exercise. Use 0 kg for bodyweight exercises.');
  }
  return { id: draft.id, planId: draft.planId, planName: draft.planName, startedAt: draft.startedAt, scheduleId: draft.scheduleId,
    exercises: draft.exercises.map(exercise => ({ name: exercise.name, exerciseId: exercise.exerciseId, targetReps: exercise.targetReps, skipped: Boolean(exercise.skipped), sets: exercise.skipped ? [] : exercise.sets.map(set => ({ weight: Number(set.weight), reps: Number(set.reps) })) })) };
}
async function saveWorkout(draft, path, method) { return request({ method, body: JSON.stringify(workoutPayload(draft)) }, path); }
async function request(options = {}, path = '') {
  let response;
  try { response = await fetch(`/api/workouts${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot reach the server. Your changes have not been saved. Please retry.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Could not load or save workouts. Check that the updated backend is running.');
  }
  return response.status === 204 ? null : response.json();
}
export const DRAFT_KEY = 'form-active-workout-v1';
export function createWorkoutDraft(plan) {
  return { id: crypto.randomUUID(), planId: plan.id, planName: plan.name, startedAt: new Date().toISOString(), exercises: plan.exercises.map(exercise => ({ name: exercise.name, exerciseId: exercise.exerciseId ?? null, targetSets: exercise.targetSets, skipped: false, targetReps: exercise.targetReps, sets: Array.from({ length: exercise.targetSets }, () => ({ weight: '', reps: '' })) })) };
}
export function readWorkoutDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft || typeof draft.id !== 'string' || typeof draft.planName !== 'string' || !Number.isFinite(Date.parse(draft.startedAt)) || !Array.isArray(draft.exercises) || !draft.exercises.length) return null;
    if (!draft.exercises.every(exercise => typeof exercise.name === 'string' && Array.isArray(exercise.sets) && exercise.sets.length && exercise.sets.every(set => set && ['string', 'number'].includes(typeof set.weight) && ['string', 'number'].includes(typeof set.reps)))) return null;
    return draft;
  } catch { return null; }
}
export function groupWorkoutSets(sets) {
  const groups = new Map();
  for (const set of sets) {
    if (!groups.has(set.exerciseNumber)) groups.set(set.exerciseNumber, { name: set.exerciseName, exerciseId: set.exerciseId, exerciseNumber: set.exerciseNumber, targetReps: set.targetReps, sets: [] });
    groups.get(set.exerciseNumber).sets.push(set);
  }
  return [...groups.values()];
}

export function workoutToDraft(workout) {
  const performed = groupWorkoutSets(workout.sets).map(exercise => ({ ...exercise, skipped: false, targetSets: exercise.sets.length, sets: exercise.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps) })) }));
  const skipped = (workout.skippedExercises || []).map(exercise => ({ name: exercise.exerciseName, exerciseId: exercise.exerciseId, exerciseNumber: exercise.exerciseNumber, targetReps: exercise.targetReps, targetSets: 1, skipped: true, sets: [{ weight: '', reps: '' }] }));
  return { id: workout.id, planId: workout.planId, planName: workout.planName, startedAt: workout.startedAt, exercises: [...performed, ...skipped].sort((a, b) => a.exerciseNumber - b.exerciseNumber) };
}

// Plan cards can resume that plan; calendar actions must match the exact booking.
export function matchesWorkoutDraft(draft, planId, scheduleId = null) {
  return Boolean(draft && draft.planId === planId && (scheduleId == null || draft.scheduleId === scheduleId));
}
