const MAX_REST_SECONDS = 3600;

export function isRestTimer(timer) {
  return Boolean(timer && Number.isInteger(timer.durationSeconds) && timer.durationSeconds >= 1 && timer.durationSeconds <= MAX_REST_SECONDS
    && typeof timer.exerciseName === 'string' && Number.isFinite(timer.remainingMs) && timer.remainingMs >= 0 && timer.remainingMs <= MAX_REST_SECONDS * 1000
    && (timer.endsAt === null || Number.isFinite(timer.endsAt)));
}
export function startRestTimer(exercise, now = Date.now()) {
  const seconds = exercise.restSeconds == null ? 60 : Number(exercise.restSeconds);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_REST_SECONDS) return null;
  return { exerciseName: exercise.name, durationSeconds: seconds, remainingMs: seconds * 1000, endsAt: now + seconds * 1000 };
}
export function remainingRestMs(timer, now = Date.now()) {
  if (!isRestTimer(timer)) return 0;
  return Math.max(0, timer.endsAt === null ? timer.remainingMs : timer.endsAt - now);
}
export function changeRestTimer(timer, action, now = Date.now()) {
  if (!isRestTimer(timer) || action === 'skip') return null;
  if (action === 'pause') return { ...timer, remainingMs: remainingRestMs(timer, now), endsAt: null };
  if (action === 'resume') {
    const remainingMs = remainingRestMs(timer, now);
    return { ...timer, remainingMs, endsAt: remainingMs > 0 ? now + remainingMs : null };
  }
  if (action === 'reset') return { ...timer, remainingMs: timer.durationSeconds * 1000, endsAt: null };
  return timer;
}
export function formatRestTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
