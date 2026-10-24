export function parseMuscles(text = '') {
  const seen = new Set();
  const muscles = text.split(',').map(name => name.trim().replace(/\s+/g, ' ')).filter(name => {
    const key = name.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
  if (muscles.length > 8 || muscles.some(name => name.length > 40)) throw new Error('Use up to 8 muscles per group, with at most 40 characters each.');
  return muscles;
}
export function findCatalogExercise(catalog = [], exercise) {
  const key = name => name?.trim().replace(/\s+/g, ' ').toLowerCase();
  return catalog.find(item => item.id === exercise?.exerciseId)
    || catalog.find(item => key(item.name) === key(exercise?.name));
}

// Small muscles share a nearby surface region in the simplified body illustration.
const bodyRegions = {
  chest: ['chest', 'upper-chest'], 'upper chest': ['upper-chest'],
  'front delts': ['front-delts'], 'side delts': ['side-delts'], 'rear delts': ['rear-delts'],
  triceps: ['triceps'], biceps: ['biceps'], brachialis: ['biceps'], brachioradialis: ['forearms'], forearms: ['forearms'],
  lats: ['lats'], 'mid-back': ['mid-back'], 'upper traps': ['traps'], traps: ['traps'],
  'teres major': ['teres-major'], 'rotator cuff': ['rotator-cuff'], 'spinal erectors': ['lower-back'],
  abs: ['abs'], obliques: ['obliques'], quads: ['quads'], glutes: ['glutes'],
  adductors: ['adductors'], hamstrings: ['hamstrings'], calves: ['calves'],
};
export function planMuscleSummary(plan, catalog = []) {
  const primary = new Map(), secondary = new Map();
  let unspecified = 0;
  const key = name => name.trim().replace(/\s+/g, ' ').toLowerCase();
  for (const exercise of plan?.exercises || []) {
    const metadata = findCatalogExercise(catalog, exercise);
    if (!metadata?.primaryMuscles?.length && !metadata?.secondaryMuscles?.length) unspecified++;
    for (const name of metadata?.primaryMuscles || []) primary.set(key(name), name);
    for (const name of metadata?.secondaryMuscles || []) secondary.set(key(name), name);
  }
  for (const name of primary.keys()) secondary.delete(name);
  const regions = {};
  for (const name of secondary.keys()) for (const region of bodyRegions[name] || []) regions[region] = 'secondary';
  for (const name of primary.keys()) for (const region of bodyRegions[name] || []) regions[region] = 'primary';
  const unmapped = [...primary.values(), ...secondary.values()].filter(name => !bodyRegions[key(name)]);
  return { primary: [...primary.values()], secondary: [...secondary.values()], regions, unspecified, unmapped };
}

const muscleKey = value => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

export function primaryMuscleOptions(catalog = []) {
  const options = new Map();
  for (const exercise of catalog) for (const name of exercise.primaryMuscles || []) {
    const value = muscleKey(name);
    if (value && !options.has(value)) options.set(value, { value, label: name.trim().replace(/\s+/g, ' ') });
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function filterExercises(catalog, search = '', primaryMuscle = '') {
  const query = muscleKey(search), muscle = muscleKey(primaryMuscle);
  return catalog.filter(exercise => {
    const matchesMuscle = !muscle || (exercise.primaryMuscles || []).some(name => muscleKey(name) === muscle);
    const matchesSearch = !query || [exercise.name, ...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])]
      .some(value => muscleKey(value).includes(query));
    return matchesMuscle && matchesSearch;
  });
}

// Keep each option in one group, even when an exercise has multiple primary muscles.
export function groupExercisesByPrimaryMuscle(catalog = []) {
  const groups = new Map();
  for (const exercise of catalog) {
    const muscle = (exercise.primaryMuscles || []).find(name => muscleKey(name));
    const key = muscle ? `muscle:${muscleKey(muscle)}` : 'unspecified';
    if (!groups.has(key)) groups.set(key, {
      key, label: muscle ? muscle.trim().replace(/\s+/g, ' ') : 'Other / unspecified', exercises: [],
    });
    groups.get(key).exercises.push(exercise);
  }
  return [...groups.values()].sort((a, b) => a.key === 'unspecified' ? 1 : b.key === 'unspecified' ? -1 : a.label.localeCompare(b.label))
    .map(group => ({ ...group, exercises: group.exercises.sort((a, b) => a.name.localeCompare(b.name)) }));
}
