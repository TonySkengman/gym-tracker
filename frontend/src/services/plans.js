async function request(path = '', options = {}) {
  let response;
  try { response = await fetch(`/api/plans${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot reach the server. Start the backend and PostgreSQL, then retry.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Could not save or load plans. Check that the backend and database are running.');
  }
  return response.status === 204 ? null : response.json();
}
export const getPlans = () => request();
export const savePlan = (plan) => request(plan.id ? `/${plan.id}` : '', { method: plan.id ? 'PUT' : 'POST', body: JSON.stringify({ name: plan.name, description: plan.description, exercises: plan.exercises.map(({ name, targetSets, targetReps, exerciseId }) => ({ name, exerciseId, targetSets: Number(targetSets), targetReps: Number(targetReps) })) }) });
export const deletePlan = (id) => request(`/${id}`, { method: 'DELETE' });
