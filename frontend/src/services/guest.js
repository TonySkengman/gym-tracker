import defaultExercises from './defaultExercises.json' with { type: 'json' };
import { workoutPayload } from './workouts.js';

// Each guest visit owns an isolated, disposable workspace. No storage or network calls.
export function createGuestApi() {
  let plans = [], workouts = [], schedule = [];
  const exercises = defaultExercises.map((name, index) => ({ id: index + 1, name }));
  let nextPlanId = 1, nextScheduleId = 1;
  const copy = value => structuredClone(value);
  const normalize = name => name.trim().replace(/\s+/g, ' ').toLowerCase();
  function resolve(item) {
    let exercise = exercises.find(exercise => exercise.id === item.exerciseId);
    if (!exercise) exercise = exercises.find(exercise => normalize(exercise.name) === normalize(item.name));
    if (!exercise) { exercise = { id: exercises.length + 1, name: item.name.trim().replace(/\s+/g, ' ') }; exercises.push(exercise); }
    return { ...item, name: exercise.name, exerciseId: exercise.id };
  }
  function find(items, id) {
    const item = items.find(item => item.id === id);
    if (!item) throw new Error('This item is no longer in your guest workspace.');
    return item;
  }
  function saveSession(draft, editing) {
    const payload = workoutPayload(draft);
    const existing = workouts.find(workout => workout.id === draft.id);
    if (!editing && existing) return copy(existing);
    if (editing && !existing) throw new Error('This workout is no longer in your guest workspace.');
    const sets = [], skippedExercises = [];
    payload.exercises.map(resolve).forEach((exercise, index) => {
      const base = { exerciseName: exercise.name, exerciseId: exercise.exerciseId, exerciseNumber: index + 1, targetReps: exercise.targetReps };
      if (exercise.skipped) skippedExercises.push(base);
      else exercise.sets.forEach((set, setIndex) => {
        if (!Number.isFinite(set.weight) || set.weight < 0 || set.weight > 2000 || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100)
          throw new Error('Use weights from 0–2000 kg and whole reps from 1–100.');
        sets.push({ ...base, ...set, setNumber: setIndex + 1 });
      });
    });
    const saved = existing ? { ...existing, sets, skippedExercises } : {
      id: payload.id, planId: payload.planId, planName: payload.planName, startedAt: payload.startedAt,
      completedAt: new Date().toISOString(), sets, skippedExercises,
    };
    workouts = [saved, ...workouts.filter(workout => workout.id !== saved.id)];
    if (!editing) {
      const entry = schedule.find(entry => entry.id === draft.scheduleId && entry.planId === draft.planId && !entry.completedWorkoutId);
      if (entry) entry.completedWorkoutId = saved.id;
    }
    return copy(saved);
  }
  return {
    getPlans: async () => copy([...plans].reverse()),
    savePlan: async input => {
      if (input.id) find(plans, input.id);
      if (input.exercises.some(item => item.restSeconds !== '' && item.restSeconds != null && (!Number.isInteger(Number(item.restSeconds)) || Number(item.restSeconds) < 0 || Number(item.restSeconds) > 3600)))
        throw new Error('Rest time must be a whole number from 0 to 3600 seconds.');
      const plan = { id: input.id || nextPlanId++, name: input.name.trim(), description: input.description?.trim() || '', exercises: input.exercises.map(item => resolve({ ...item, targetSets: Number(item.targetSets), targetReps: Number(item.targetReps), restSeconds: item.restSeconds === '' || item.restSeconds == null ? null : Number(item.restSeconds) })) };
      plans = [...plans.filter(item => item.id !== plan.id), plan]; return copy(plan);
    },
    deletePlan: async id => { find(plans, id); plans = plans.filter(plan => plan.id !== id); },
    getExercises: async () => copy([...exercises].sort((a, b) => a.name.localeCompare(b.name))),
    createExercise: async name => {
      if (!name.trim()) throw new Error('Enter an exercise name.');
      if (exercises.some(exercise => normalize(exercise.name) === normalize(name))) throw new Error('An exercise with this name already exists');
      const item = resolve({ name });
      return { id: item.exerciseId, name: item.name };
    },
    getWorkouts: async () => copy(workouts),
    completeWorkout: async draft => saveSession(draft, false),
    updateWorkout: async draft => saveSession(draft, true),
    deleteWorkout: async id => {
      find(workouts, id); workouts = workouts.filter(workout => workout.id !== id);
      schedule.forEach(entry => { if (entry.completedWorkoutId === id) entry.completedWorkoutId = null; });
    },
    getSchedule: async () => copy(schedule.map(entry => {
      const plan = plans.find(plan => plan.id === entry.planId);
      return { ...entry, planName: plan?.name || entry.planName, planAvailable: Boolean(plan) };
    }).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)),
    saveScheduledWorkout: async input => {
      const planId = Number(input.planId), plan = find(plans, planId);
      const existing = input.id ? find(schedule, input.id) : null;
      if (existing?.completedWorkoutId) throw new Error('Completed workouts cannot be rescheduled.');
      if (schedule.some(entry => entry.id !== input.id && entry.planId === planId && entry.date === input.date)) throw new Error('This plan is already scheduled for that date.');
      const entry = { id: input.id || nextScheduleId++, planId, planName: plan.name, date: input.date, planAvailable: true, completedWorkoutId: null };
      schedule = [...schedule.filter(item => item.id !== entry.id), entry]; return copy(entry);
    },
    deleteScheduledWorkout: async id => { find(schedule, id); schedule = schedule.filter(entry => entry.id !== id); },
  };
}
