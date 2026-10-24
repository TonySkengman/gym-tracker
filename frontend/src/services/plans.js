import { apiFetch } from './auth.js';
async function request(path = '', options = {}) {
  let response;
  try { response = await apiFetch(`/api/plans${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot reach the server. Start the backend and PostgreSQL, then retry.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Could not save or load plans. Check that the backend and database are running.');
  }
  return response.status === 204 ? null : response.json();
}
export const getPlans = () => request();
export const savePlan = (plan) => request(plan.id ? `/${plan.id}` : '', { method: plan.id ? 'PUT' : 'POST', body: JSON.stringify({ name: plan.name, description: plan.description, exercises: plan.exercises.map(({ name, targetSets, targetReps, exerciseId, restSeconds }) => ({ name, exerciseId, targetSets: Number(targetSets), targetReps: Number(targetReps), restSeconds: restSeconds === '' || restSeconds == null ? null : Number(restSeconds) })) }) });
export const deletePlan = (id) => request(`/${id}`, { method: 'DELETE' });

// Only copy routine data. A duplicate must not inherit the saved plan's ID or history.
export function duplicatePlanDraft(plan, existingPlans = []) {
  const nameKey = name => name.trim().replace(/\s+/g, ' ').toLowerCase();
  const names = new Set(existingPlans.map(item => nameKey(item.name)));
  let number = 1, name;
  do {
    const suffix = number === 1 ? ' (copy)' : ` (copy ${number})`;
    name = plan.name.trim().slice(0, 100 - suffix.length).trimEnd() + suffix;
    number++;
  } while (names.has(nameKey(name)));
  return {
    name,
    description: plan.description || '',
    exercises: plan.exercises.map(({ name, exerciseId, targetSets, targetReps, restSeconds }) => ({
      name, exerciseId, targetSets, targetReps, restSeconds: restSeconds ?? null,
    })),
  };
}
