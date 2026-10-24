import CompletedWorkoutResults from './CompletedWorkoutResults';
import PlanMuscleMap from './PlanMuscleMap';
import ExerciseMuscles from './ExerciseMuscles';
import { matchesWorkoutDraft } from '../services/workouts';
import { useEffect, useRef } from 'react';
import { CalendarDays, RefreshCw, X } from 'lucide-react';
import { scheduleDate } from '../services/schedule';

export default function ScheduledPlanDetails({ catalog, entry = {}, plan, loading, error, onRetry, onClose, onStart, draft,
  workout, workoutLoading = false, workoutError, onWorkoutRetry }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  const completed = Boolean(entry.completedWorkoutId);
  const busy = completed ? workoutLoading : loading;
  const failure = completed ? workoutError : error;
  const retry = completed ? onWorkoutRetry : onRetry;
  const name = completed ? workout?.planName || entry.planName : plan?.name || entry.planName;
  return <dialog ref={dialog} className="scheduled-plan-details" aria-labelledby="scheduled-plan-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="flex justify-between items-start gap-4"><div><p className="eyebrow">{completed ? 'COMPLETED WORKOUT' : entry.date ? 'SCHEDULED WORKOUT PLAN' : 'WORKOUT PLAN'}</p><h2 id="scheduled-plan-title">{name}</h2></div><button type="button" className="icon-button" aria-label="Close workout details" onClick={onClose}><X size={20}/></button></div>
    {entry.date && <p className="plan-detail-date"><CalendarDays size={16}/>{completed && <span>Scheduled for</span>}<time dateTime={entry.date}>{scheduleDate(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</time></p>}
    {completed && <span className="pill">COMPLETED</span>}
    {busy ? <p className="muted mt-5" role="status">{completed ? 'Loading completed workout…' : 'Loading workout plan…'}</p> : failure ? <div className="error mt-5" role="alert"><p>{failure}</p><button className="secondary mt-3" onClick={retry}><RefreshCw size={15}/>Retry</button></div> : completed ? (
      workout ? <CompletedWorkoutResults workout={workout} catalog={catalog}/> : <div className="error mt-5" role="alert"><p>The linked completed workout is unavailable. Refresh workout history and try again.</p><button className="secondary mt-3" onClick={onWorkoutRetry}><RefreshCw size={15}/>Refresh history</button></div>
    ) : !plan ? <p className="muted mt-5">This plan is no longer available. You can assign another plan to the calendar entry.</p> : <>
      {plan.description && <p className="plan-detail-description">{plan.description}</p>}
      <div className="plan-details-layout">
        <section className="plan-exercises-panel" aria-label="Planned exercises">
          <div className="section-heading"><h3>Planned exercises</h3><span className="muted">{plan.exercises.length} exercises</span></div>
          <div className="table-scroll"><table className="plan-detail-table"><caption className="sr-only">Planned exercises, target sets, target reps and rest between sets</caption><thead><tr><th scope="col">Exercise</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Rest (sec)</th></tr></thead><tbody>{plan.exercises.map((exercise, index) => <tr key={index}><th scope="row">{exercise.name}<ExerciseMuscles exercise={exercise} catalog={catalog}/></th><td>{exercise.targetSets}</td><td>{exercise.targetReps}</td><td>{exercise.restSeconds ?? '—'}</td></tr>)}</tbody></table></div>
          <p className="progress-note">These are the current saved plan targets. Record your actual weights and reps when you start.</p>
        </section>
        <PlanMuscleMap plan={plan} catalog={catalog}/>
      </div>
    </>}
    <div className="editor-footer"><button type="button" className="secondary" onClick={onClose}>Close</button>{!completed && <button type="button" className="primary" disabled={!plan || loading || Boolean(error)} onClick={() => onStart(plan, entry.id)}>{matchesWorkoutDraft(draft, entry.planId, entry.id) ? 'Resume workout' : 'Start workout'}</button>}</div>
  </dialog>;
}
