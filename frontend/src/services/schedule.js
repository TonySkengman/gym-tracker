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

// Validate locally before saving a date change. The API still enforces these rules.
export function moveScheduledWorkout(entries, id, date) {
  const entry = entries.find(item => item.id === id);
  if (!entry) throw new Error('This scheduled workout is no longer available. Refresh the schedule.');
  if (entry.completedWorkoutId) throw new Error('Completed workouts cannot be rescheduled. Add a new booking instead.');
  if (entry.planAvailable === false) throw new Error('This plan was deleted. Use Reschedule to assign another plan.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) < 1900
    || Number(date.slice(0, 4)) > 9999 || localDateKey(scheduleDate(date)) !== date)
    throw new Error('Choose a valid date between 1900 and 9999.');
  if (entry.date === date) return null;
  if (entries.some(item => item.id !== id && item.planId === entry.planId && item.date === date))
    throw new Error('This plan is already scheduled for that date.');
  return { ...entry, date };
}
