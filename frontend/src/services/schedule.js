import { apiFetch } from './auth.js';
import { localDateKey } from './progress.js';

export const getSchedule = () => request();
export const saveScheduledWorkout = entry => request(entry.id ? `/${entry.id}` : '', { method: entry.id ? 'PUT' : 'POST', body: JSON.stringify({ planId: Number(entry.planId), date: entry.date }) });
export const deleteScheduledWorkout = id => request(`/${id}`, { method: 'DELETE' });
async function request(path = '', options = {}) {
  let response;
  try { response = await apiFetch(`/api/schedule${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Cannot reach the schedule. Check the connection and retry.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Could not load or save the schedule. Check that the updated backend is running.');
  }
  return response.status === 204 ? null : response.json();
}

// Parse date-only strings locally rather than as UTC, which can shift the calendar day.
export function scheduleDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function calendarDays(year, month) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(year, month, 1 - offset + i, 12);
    return { key: localDateKey(date), day: date.getDate(), inMonth: date.getMonth() === month, year: date.getFullYear() };
  });
}
export function nextScheduledWorkouts(entries, today = localDateKey(new Date())) {
  const upcoming = entries.filter(entry => entry.date >= today && !entry.completedWorkoutId && entry.planAvailable !== false)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  return upcoming.filter(entry => entry.date === upcoming[0].date);
}
export function nextScheduledWorkout(entries, today = localDateKey(new Date())) {
  return nextScheduledWorkouts(entries, today)[0] || null;
}
