import test from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, clearCsrf, getCurrentUser, login, logout, register } from './auth.js';
import { DRAFT_KEY, readWorkoutDraft } from './workouts.js';

test('authentication uses same-origin cookies, CSRF headers and renews tokens after account changes', async () => {
  const original = globalThis.fetch;
  const calls = []; let tokens = 0;
  clearCsrf();
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, ...options });
      if (url === '/api/auth/csrf') return { ok: true, json: async () => ({ token: `token-${++tokens}`, headerName: 'X-CSRF-TOKEN' }) };
      return { ok: true, status: url.endsWith('logout') ? 204 : 200, json: async () => ({ id: 7, displayName: 'Tony' }) };
    };
    assert.equal((await login({ email: 'tony@example.com', password: 'password123' })).id, 7);
    await apiFetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    await logout();
    await register({ displayName: 'Tony', email: 'tony@example.com', password: 'password123' });
    assert.equal(tokens, 3);
    assert.equal(calls.find(call => call.url === '/api/auth/login').headers['X-CSRF-TOKEN'], 'token-1');
    const planCall = calls.find(call => call.url === '/api/plans');
    assert.equal(planCall.headers['X-CSRF-TOKEN'], 'token-2');
    assert.equal(planCall.headers['Content-Type'], 'application/json');
    assert.ok(calls.every(call => call.credentials === 'same-origin'));
  } finally { globalThis.fetch = original; clearCsrf(); }
});
test('session expiry clears the private view, while invalid login only reports its error', async () => {
  const original = globalThis.fetch; const originalWindow = globalThis.window;
  const target = new EventTarget(); let expired = 0;
  target.addEventListener('session-expired', () => expired++);
  globalThis.window = target; clearCsrf();
  try {
    globalThis.fetch = async url => url === '/api/auth/csrf'
      ? { ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) }
      : { ok: false, status: 401, json: async () => ({ detail: 'Incorrect email or password' }) };
    assert.equal(await getCurrentUser(), null);
    await assert.rejects(login({}), /Incorrect email or password/);
    assert.equal(expired, 0);
    await apiFetch('/api/plans');
    assert.equal(expired, 1);
  } finally { globalThis.fetch = original; globalThis.window = originalWindow; clearCsrf(); }
});
test('workout drafts are read only from the selected account storage key', () => {
  const original = globalThis.localStorage;
  const draft = { id: 'draft', planName: 'Private upper', startedAt: '2026-01-01T10:00:00Z', exercises: [{ name: 'Press', sets: [{ weight: '20', reps: '8' }] }] };
  globalThis.localStorage = { getItem: key => key === `${DRAFT_KEY}-user-1` ? JSON.stringify(draft) : null };
  try {
    assert.equal(readWorkoutDraft(`${DRAFT_KEY}-user-1`).planName, 'Private upper');
    assert.equal(readWorkoutDraft(`${DRAFT_KEY}-user-2`), null);
  } finally { globalThis.localStorage = original; }
});
