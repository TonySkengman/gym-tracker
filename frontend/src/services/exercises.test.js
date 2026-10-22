import test from 'node:test';
import assert from 'node:assert/strict';
import { createExercise, getExercises } from './exercises.js';

test('catalog lists and creates exercises, surfacing duplicate errors', async () => {
  const original = globalThis.fetch; const calls = [];
  try {
    globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return { ok: true, json: async () => ({ id: 7, name: 'Cable row' }) }; };
    await getExercises(); await createExercise(' Cable row ');
    assert.equal(calls[0].url, '/api/exercises');
    assert.equal(calls[1].method, 'POST'); assert.deepEqual(JSON.parse(calls[1].body), { name: 'Cable row' });
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ detail: 'An exercise with this name already exists' }) });
    await assert.rejects(createExercise('Cable row'), /already exists/);
  } finally { globalThis.fetch = original; }
});
