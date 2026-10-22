import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlans, savePlan, deletePlan } from './plans.js';
test('plan API supports create, update, list and delete', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return { ok: true, status: options.method === 'DELETE' ? 204 : 200, json: async () => ({ id: 7 }) };
  };
  try {
    const draft = { name: 'Upper', description: '', exercises: [{ name: 'Press', targetSets: '3', targetReps: '8', id: 99 }] };
    await savePlan(draft); await savePlan({ ...draft, id: 7 }); await getPlans(); await deletePlan(7);
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].body).exercises, [{ name: 'Press', targetSets: 3, targetReps: 8 }]);
    assert.equal(calls[1].url, '/api/plans/7'); assert.equal(calls[1].method, 'PUT');
    assert.equal(calls[2].url, '/api/plans'); assert.equal(calls[3].method, 'DELETE');
  } finally { globalThis.fetch = original; }
});
test('network and validation errors are surfaced without false success', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError('offline'); };
    await assert.rejects(getPlans(), /Cannot reach/);
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ detail: 'Name is required' }) });
    await assert.rejects(getPlans(), /Name is required/);
    globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('html'); } });
    await assert.rejects(getPlans(), /Check that the backend/);
  } finally { globalThis.fetch = original; }
});
