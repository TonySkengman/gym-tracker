import { apiFetch } from './auth.js';
export const getExercises = () => request();
export const createExercise = (name, muscles = {}) => request({ method: 'POST', body: JSON.stringify({ name: name.trim(), ...muscles }) });
async function request(options = {}) {
  let response;
  try { response = await apiFetch('/api/exercises', { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot load the exercise catalog. Check the backend connection and retry.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'The exercise catalog is unavailable. Restart the updated backend and retry.');
  }
  return response.json();
}
