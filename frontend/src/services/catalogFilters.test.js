import test from 'node:test';
import assert from 'node:assert/strict';
import { filterExercises, groupExercisesByPrimaryMuscle, primaryMuscleOptions } from './muscles.js';

const catalog = [
  { id: 1, name: 'Bench press', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front delts'] },
  { id: 2, name: 'Cable fly', primaryMuscles: [' chest '], secondaryMuscles: [] },
  { id: 3, name: 'Close-grip bench press', primaryMuscles: ['Triceps'], secondaryMuscles: ['Chest'] },
  { id: 4, name: 'Custom row', primaryMuscles: ['Upper   back', 'Lats'] },
  { id: 5, name: 'Unlabelled exercise' },
];
test('muscle options use primary labels, include custom groups, and normalize duplicates', () => {
  assert.deepEqual(primaryMuscleOptions(catalog), [
    { value: 'chest', label: 'Chest' }, { value: 'lats', label: 'Lats' },
    { value: 'triceps', label: 'Triceps' }, { value: 'upper back', label: 'Upper back' },
  ]);
  assert.deepEqual(primaryMuscleOptions([]), []);
});
test('muscle filter matches primary muscles exactly and excludes secondary-only matches', () => {
  assert.deepEqual(filterExercises(catalog, '', ' CHEST ').map(item => item.id), [1, 2]);
  assert.deepEqual(filterExercises(catalog, '', 'upper back').map(item => item.id), [4]);
  assert.deepEqual(filterExercises(catalog, '', 'back'), []);
});
test('search combines with primary filter, still searches secondary labels, and clearing restores all', () => {
  const before = structuredClone(catalog);
  assert.deepEqual(filterExercises(catalog, 'bench', 'Chest').map(item => item.id), [1]);
  assert.deepEqual(filterExercises(catalog, 'front delts', 'Chest').map(item => item.id), [1]);
  assert.deepEqual(filterExercises(catalog, 'fly', 'Triceps'), []);
  assert.deepEqual(filterExercises(catalog, '', ''), catalog);
  assert.deepEqual(filterExercises(catalog, '   ').map(item => item.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(filterExercises([], 'press', 'Chest'), []);
  assert.deepEqual(catalog, before);
});

test('plan picker groups by first primary muscle, sorts options, and places unlabelled exercises last', () => {
  const before = structuredClone(catalog);
  const groups = groupExercisesByPrimaryMuscle([...catalog].reverse());
  assert.deepEqual(groups.map(group => group.label.toLowerCase()), ['chest', 'triceps', 'upper back', 'other / unspecified']);
  assert.deepEqual(groups[0].exercises.map(item => item.name), ['Bench press', 'Cable fly']);
  const ids = groups.flatMap(group => group.exercises.map(item => item.id));
  assert.equal(ids.length, catalog.length);
  assert.equal(new Set(ids).size, catalog.length);
  assert.equal(groups.find(group => group.label === 'Upper back').exercises[0].id, 4);
  assert.deepEqual(catalog, before);
  assert.deepEqual(groupExercisesByPrimaryMuscle([]), []);
});
test('picker keeps custom muscle groups and ignores blank primary labels', () => {
  const groups = groupExercisesByPrimaryMuscle([
    { id: 6, name: 'Custom', primaryMuscles: ['', '  Hip   flexors ', 'Abs'] },
    { id: 7, name: 'Unknown', primaryMuscles: [] },
  ]);
  assert.deepEqual(groups.map(group => group.label), ['Hip flexors', 'Other / unspecified']);
});
