import { matchesWorkoutDraft } from '../services/workouts';
import { ArrowUpRight, CalendarDays, RefreshCw } from 'lucide-react';
import { nextScheduledWorkouts, scheduleDate } from '../services/schedule';

export default function UpcomingWorkout({ entries, today, plans, loading, error, onRetry, onViewSchedule, onStart, onViewPlan, draft }) {
  const upcoming = nextScheduledWorkouts(entries, today);
  const date = upcoming[0]?.date;
  return <section className="upcoming-workout" aria-label="Next upcoming workouts">
    <div className="upcoming-icon"><CalendarDays size={23}/></div>
    <div className="upcoming-copy">
      <p className="eyebrow">{upcoming.length > 1 ? 'NEXT WORKOUTS' : 'NEXT WORKOUT'}</p>
      {loading ? <p role="status">Loading your schedule…</p> : error ? <p role="alert" className="muted">{error}</p> : upcoming.length ? <>
        <p className="muted"><time dateTime={date}>{date === today ? 'Today' : scheduleDate(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</time></p>
        <ul className="upcoming-list">
          {upcoming.map(entry => {
            const plan = plans.find(plan => plan.id === entry.planId);
            const name = plan?.name || entry.planName;
            return <li key={entry.id} className="upcoming-row">
              <h2>{onViewPlan ? <button type="button" className="plan-title-button" aria-label={`View ${name} plan details`} onClick={() => onViewPlan(entry)}>{name}</button> : name}</h2>
              <button className="primary" disabled={!plan} onClick={() => onStart(plan, entry.id)}>{matchesWorkoutDraft(draft, entry.planId, entry.id) ? 'Resume workout' : 'Start workout'}</button>
            </li>;
          })}
        </ul>
      </> : <><h2>No upcoming workouts</h2><p className="muted">Choose a date and add one of your saved plans.</p></>}
    </div>
    <div className="upcoming-actions">
      {error && <button className="secondary" onClick={onRetry}><RefreshCw size={15}/>Retry</button>}
      <button className="text-button" onClick={onViewSchedule}>View schedule <ArrowUpRight size={15}/></button>
    </div>
  </section>;
}
