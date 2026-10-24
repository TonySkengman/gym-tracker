// Move the entire exercise entry so sets, reps, rest and catalog identity stay together.
export function moveExercise(exercises, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0
    || from >= exercises.length || to >= exercises.length || from === to) return exercises;
  const reordered = [...exercises];
  const [exercise] = reordered.splice(from, 1);
  reordered.splice(to, 0, exercise);
  return reordered;
}
