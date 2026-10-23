import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseMuscles, findCatalogExercise } from './muscles.js';
import { createGuestApi } from './guest.js';
import defaults from './defaultExercises.json' with { type: 'json' };

test('all 50 defaults carry consistent muscle labels in guest and backend catalogs', () => {
  const backend = JSON.parse(readFileSync(new URL('../../../backend/src/main/resources/exercise-muscles.json', import.meta.url), 'utf8'));
  assert.deepEqual(defaults, backend);
  assert.equal(defaults.length, 50);
  for (const exercise of defaults) {
    assert.ok(exercise.primaryMuscles.length > 0, exercise.name);
    assert.ok(Array.isArray(exercise.secondaryMuscles));
    assert.ok(!exercise.primaryMuscles.some(name => exercise.secondaryMuscles.includes(name)));
  }
  const bench = defaults.find(exercise => exercise.name === 'Bench press');
  assert.deepEqual(bench.primaryMuscles, ['Chest']);
  assert.deepEqual(bench.secondaryMuscles, ['Triceps', 'Front delts']);
});
test('muscle input trims and deduplicates labels and rejects excessive metadata', () => {
  assert.deepEqual(parseMuscles(' Chest, chest, Upper   chest, , '), ['Chest', 'Upper chest']);
  assert.deepEqual(parseMuscles(''), []);
  assert.throws(() => parseMuscles('x'.repeat(41)), /at most 40/);
  assert.throws(() => parseMuscles(Array.from({ length: 9 }, (_, i) => `Muscle ${i}`).join(',')), /up to 8/);
});
test('plan muscle lookup uses catalog identity first and normalized legacy names second', () => {
  const catalog = [{ id: 7, name: 'Bench press', primaryMuscles: ['Chest'] }];
  assert.equal(findCatalogExercise(catalog, { exerciseId: 7, name: 'Old name' }), catalog[0]);
  assert.equal(findCatalogExercise(catalog, { name: ' BENCH   PRESS ' }), catalog[0]);
  assert.equal(findCatalogExercise(catalog, { name: 'Unknown' }), undefined);
});
test('custom guest muscle labels stay isolated and survive catalog reloads', async () => {
  const api = createGuestApi();
  const custom = await api.createExercise('Custom press', { primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'chest'] });
  assert.deepEqual(custom.primaryMuscles, ['Chest']);
  assert.deepEqual(custom.secondaryMuscles, ['Triceps']);
  custom.primaryMuscles.push('Changed response');
  assert.deepEqual((await api.getExercises()).find(exercise => exercise.id === custom.id).primaryMuscles, ['Chest']);
  assert.equal((await createGuestApi().getExercises()).some(exercise => exercise.name === 'Custom press'), false);
  await assert.rejects(api.createExercise('Invalid custom', { primaryMuscles: ['x'.repeat(41)] }), /40 characters/);
});

test('plan summary combines all exercises with primary priority and no duplicate labels', async () => {
  const { planMuscleSummary } = await import('./muscles.js');
  const catalog = [
    { id: 1, name: 'Bench press', primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front delts'] },
    { id: 2, name: 'Triceps pushdown', primaryMuscles: ['Triceps'], secondaryMuscles: [] },
  ];
  const plan = { exercises: [{ exerciseId: 1, name: 'Old press' }, { exerciseId: 2, name: 'Pushdown' }, { exerciseId: 1, name: 'Bench press' }] };
  const before = structuredClone({ catalog, plan });
  const summary = planMuscleSummary(plan, catalog);
  assert.deepEqual(summary.primary, ['Chest', 'Triceps']);
  assert.deepEqual(summary.secondary, ['Front delts']);
  assert.equal(summary.regions.chest, 'primary');
  assert.equal(summary.regions['upper-chest'], 'primary');
  assert.equal(summary.regions.triceps, 'primary');
  assert.equal(summary.regions['front-delts'], 'secondary');
  assert.equal(summary.regions.quads, undefined);
  assert.deepEqual({ catalog, plan }, before);
});
test('diagram covers all default muscle labels and reports custom or missing labels honestly', async () => {
  const { planMuscleSummary } = await import('./muscles.js');
  const catalog = defaults.map((exercise, index) => ({ ...exercise, id: index + 1 }));
  const all = planMuscleSummary({ exercises: catalog.map(exercise => ({ name: exercise.name, exerciseId: exercise.id })) }, catalog);
  assert.deepEqual(all.unmapped, []);
  assert.equal(all.unspecified, 0);
  const custom = planMuscleSummary({ exercises: [{ name: 'Unknown' }, { name: 'Custom' }] }, [{ id: 100, name: 'Custom', primaryMuscles: ['Custom muscle'], secondaryMuscles: [] }]);
  assert.equal(custom.unspecified, 1);
  assert.deepEqual(custom.unmapped, ['Custom muscle']);
  assert.deepEqual(custom.regions, {});
  assert.deepEqual(planMuscleSummary(null).primary, []);
});
test('primary precedence applies to shared surface regions across different muscle names', async () => {
  const { planMuscleSummary } = await import('./muscles.js');
  const catalog = [{ id: 1, name: 'Custom curl', primaryMuscles: ['Brachialis'], secondaryMuscles: ['Biceps'] }];
  const summary = planMuscleSummary({ exercises: [{ exerciseId: 1 }] }, catalog);
  assert.equal(summary.regions.biceps, 'primary');
  assert.deepEqual(summary.secondary, ['Biceps']);
});
