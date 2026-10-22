import { matchesWorkoutDraft } from '../services/workouts';
import { useEffect, useRef } from 'react';
import { CalendarDays, RefreshCw, X } from 'lucide-react';
import { scheduleDate } from '../services/schedule';

export default function ScheduledPlanDetails({ entry, plan, loading, error, onRetry, onClose, onStart, draft }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="scheduled-plan-details" aria-labelledby="scheduled-plan-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="flex justify-between items-start gap-4"><div><p className="eyebrow">SCHEDULED WORKOUT PLAN</p><h2 id="scheduled-plan-title">{plan?.name || entry.planName}</h2></div><button type="button" className="icon-button" aria-label="Close plan details" onClick={onClose}><X size={20}/></button></div>
    <p className="plan-detail-date"><CalendarDays size={16}/><time dateTime={entry.date}>{scheduleDate(entry.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</time></p>
    {entry.completedWorkoutId && <span className="pill">COMPLETED</span>}
    {loading ? <p className="muted mt-5" role="status">Loading workout plan…</p> : error ? <div className="error mt-5" role="alert"><p>{error}</p><button className="secondary mt-3" onClick={onRetry}><RefreshCw size={15}/>Retry</button></div> : !plan ? <p className="muted mt-5">This plan is no longer available. You can assign another plan to the calendar entry.</p> : <>
      {plan.description && <p className="plan-detail-description">{plan.description}</p>}
      <div className="section-heading mt-6"><h3>Planned exercises</h3><span className="muted">{plan.exercises.length} exercises</span></div>
      <div className="table-scroll"><table className="plan-detail-table"><caption className="sr-only">Planned exercises, target sets, target reps and rest between sets</caption><thead><tr><th scope="col">Exercise</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Rest (sec)</th></tr></thead><tbody>{plan.exercises.map((exercise, index) => <tr key={index}><th scope="row">{exercise.name}</th><td>{exercise.targetSets}</td><td>{exercise.targetReps}</td><td>{exercise.restSeconds ?? '—'}</td></tr>)}</tbody></table></div>
      <p className="progress-note">These are the current saved plan targets.{entry.completedWorkoutId ? ' Your recorded workout results are in History.' : ' Record your actual weights and reps when you start.'}</p>
    </>}
    <div className="editor-footer"><button type="button" className="secondary" onClick={onClose}>Close</button>{!entry.completedWorkoutId && <button type="button" className="primary" disabled={!plan || loading || Boolean(error)} onClick={() => onStart(plan, entry.id)}>{matchesWorkoutDraft(draft, entry.planId, entry.id) ? 'Resume workout' : 'Start workout'}</button>}</div>
  </dialog>;
}
