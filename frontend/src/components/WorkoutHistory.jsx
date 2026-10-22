import { CalendarDays, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { groupWorkoutSets } from '../services/workouts';

export default function WorkoutHistory({ workouts, loading, error, onRetry, onViewPlans, onEdit, onDelete, deletingId }) {
  if (loading) return <div className="empty" role="status">Loading your workout history…</div>;
  if (error) return <div className="error connection" role="alert"><p>{error}</p><button className="secondary" onClick={onRetry}><RefreshCw size={16}/>Retry</button></div>;
  if (!workouts.length) return <section className="empty milestone"><span className="empty-icon"><CalendarDays size={30}/></span><h2>Your first session is ahead.</h2><p>Start a workout from one of your plans. Your completed sessions will appear here.</p><button className="secondary" onClick={onViewPlans}>View workout plans</button></section>;
  return <div className="history-list">{workouts.map(workout => {
    const duration = Math.max(1, Math.round((new Date(workout.completedAt) - new Date(workout.startedAt)) / 60000));
    return <article className="plan-card history-card" key={workout.id}>
      <div className="history-heading"><div><p className="eyebrow">COMPLETED WORKOUT</p><h2>{workout.planName}</h2><p className="muted"><time dateTime={workout.completedAt}>{new Date(workout.completedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time> · {duration} min</p></div><div className="history-actions"><span className="pill">{workout.sets.length} SETS</span><button className="icon-button" disabled={deletingId === workout.id} aria-label={`Edit workout ${workout.planName} from ${workout.completedAt}`} onClick={() => onEdit(workout)}><Pencil size={16}/></button><button className="icon-button" disabled={deletingId === workout.id} aria-label={`Delete workout ${workout.planName} from ${workout.completedAt}`} onClick={() => onDelete(workout)}><Trash2 size={16}/></button></div></div>
      <details><summary>View exercises and sets</summary><div className="history-exercises">{groupWorkoutSets(workout.sets).map((exercise, i) => <section key={i}><h3>{exercise.name}</h3><div className="exercise-list">{exercise.sets.map(set => <div key={set.setNumber}><span>Set {set.setNumber}</span><small>{set.weight} kg × {set.reps} reps</small></div>)}</div></section>)}{(workout.skippedExercises || []).map(exercise => <section key={`skip-${exercise.exerciseNumber}`}><h3>{exercise.exerciseName}</h3><p className="skipped-note">Skipped</p></section>)}</div></details>
    </article>;
  })}</div>;
}
