import { apiFetch } from './auth.js';
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
  try { response = await apiFetch(`/api/workouts${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot reach the server. Your changes have not been saved. Please retry.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Could not load or save workouts. Check that the updated backend is running.');
  }
  return response.status === 204 ? null : response.json();
}
export const DRAFT_KEY = 'form-active-workout-v1';
export function createWorkoutDraft(plan) {
  return { id: crypto.randomUUID(), planId: plan.id, planName: plan.name, startedAt: new Date().toISOString(), exercises: plan.exercises.map(exercise => ({ name: exercise.name, exerciseId: exercise.exerciseId ?? null, targetSets: exercise.targetSets, restSeconds: exercise.restSeconds ?? null, skipped: false, targetReps: exercise.targetReps, sets: Array.from({ length: exercise.targetSets }, () => ({ weight: '', reps: '' })) })) };
}
// Saving an unfinished workout does not validate completed sets or submit History.
export function saveWorkoutDraft(draft, key = DRAFT_KEY) {
  try { localStorage.setItem(key, JSON.stringify(draft)); }
  catch { throw new Error('Could not save workout progress. Browser storage may be unavailable or full. Keep this page open and retry.'); }
}
export function readWorkoutDraft(key = DRAFT_KEY) {
  try {
    const draft = JSON.parse(localStorage.getItem(key));
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

// Compare against completed sessions before this workout started, across all plans.
// Repeated exercise entries match their corresponding occurrence, not a merged set list.
export function previousExerciseSessions(draft, workouts = []) {
  const nameKey = name => (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const matches = (exercise, group) => exercise.exerciseId != null && group.exerciseId != null
    ? exercise.exerciseId === group.exerciseId : nameKey(exercise.name) === nameKey(group.name);
  const cutoff = Date.parse(draft.startedAt);
  const sessions = workouts.filter(workout => workout.id !== draft.id
    && Number.isFinite(Date.parse(workout.completedAt)) && Date.parse(workout.completedAt) <= cutoff)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt) || String(a.id).localeCompare(String(b.id)));
  return draft.exercises.map((exercise, index) => {
    const occurrence = draft.exercises.slice(0, index).filter(item => matches(exercise, item)).length;
    for (const workout of sessions) {
      const groups = groupWorkoutSets(workout.sets || []).sort((a, b) => a.exerciseNumber - b.exerciseNumber);
      const group = groups.filter(group => matches(exercise, group))[occurrence];
      if (!group) continue; // Skipped exercises have no recorded sets.
      const sets = group.sets.filter(set => set.weight != null && String(set.weight).trim() !== ''
        && Number.isFinite(Number(set.weight)) && Number(set.weight) >= 0
        && Number.isInteger(Number(set.reps)) && Number(set.reps) > 0)
        .sort((a, b) => a.setNumber - b.setNumber)
        .map(set => ({ weight: Number(set.weight), reps: Number(set.reps), setNumber: set.setNumber }));
      if (sets.length) return { workoutId: workout.id, planName: workout.planName, completedAt: workout.completedAt, sets };
    }
    return null;
  });
}

// Preserve recorded exercise order and repeated blocks; skipped entries have no sets.
export function completedWorkoutExercises(workout) {
  const performed = groupWorkoutSets(workout.sets || []).map(exercise => ({
    ...exercise, skipped: false, sets: [...exercise.sets].sort((a, b) => a.setNumber - b.setNumber),
  }));
  const skipped = (workout.skippedExercises || []).map(exercise => ({
    name: exercise.exerciseName, exerciseId: exercise.exerciseId,
    exerciseNumber: exercise.exerciseNumber, skipped: true, sets: [],
  }));
  return [...performed, ...skipped].sort((a, b) => a.exerciseNumber - b.exerciseNumber);
}
