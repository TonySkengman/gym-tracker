import test from 'node:test';
import assert from 'node:assert/strict';
import { createExercise, getExercises } from './exercises.js';

test('catalog lists and creates exercises, surfacing duplicate errors', async () => {
  const original = globalThis.fetch; const calls = [];
  try {
    globalThis.fetch = async (url, options) => { if (url === '/api/auth/csrf') return { ok: true, json: async () => ({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }) }; calls.push({ url, ...options }); return { ok: true, json: async () => ({ id: 7, name: 'Cable row' }) }; };
    await getExercises(); await createExercise(' Cable row ', { primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps'] });
    assert.equal(calls[0].url, '/api/exercises');
    assert.equal(calls[1].method, 'POST'); assert.deepEqual(JSON.parse(calls[1].body), { name: 'Cable row', primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps'] });
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ detail: 'An exercise with this name already exists' }) });
    await assert.rejects(createExercise('Cable row'), /already exists/);
  } finally { globalThis.fetch = original; }
});
