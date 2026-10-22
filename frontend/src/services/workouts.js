export async function getWorkouts() {
  return request();
}
export async function completeWorkout(draft) {
  if (draft.exercises.some(exercise => exercise.sets.some(set => String(set.weight).trim() === '' || String(set.reps).trim() === ''))) {
    throw new Error('Enter weight and reps for every set. Use 0 kg for bodyweight exercises.');
  }
  return request({ method: 'POST', body: JSON.stringify({ ...draft, exercises: draft.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ weight: Number(set.weight), reps: Number(set.reps) })) })) }) });
}
async function request(options = {}) {
  let response;
  try { response = await fetch('/api/workouts', { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot reach the server. Your workout has not been saved. Please retry.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Could not load or save workouts. Check that the updated backend is running.');
  }
  return response.json();
}
export const DRAFT_KEY = 'form-active-workout-v1';
export function createWorkoutDraft(plan) {
  return { id: crypto.randomUUID(), planId: plan.id, planName: plan.name, startedAt: new Date().toISOString(), exercises: plan.exercises.map(exercise => ({ name: exercise.name, targetReps: exercise.targetReps, sets: Array.from({ length: exercise.targetSets }, () => ({ weight: '', reps: '' })) })) };
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
    if (!groups.has(set.exerciseNumber)) groups.set(set.exerciseNumber, { name: set.exerciseName, sets: [] });
    groups.get(set.exerciseNumber).sets.push(set);
  }
  return [...groups.values()];
}
