import { matchesWorkoutDraft } from '../services/workouts';
import { useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { calendarDays, moveScheduledWorkout, nextScheduledWorkout, scheduleDate } from '../services/schedule';
import { localDateKey } from '../services/progress';
import ScheduleEditor from './ScheduleEditor';
import UpcomingWorkout from './UpcomingWorkout';

export default function WorkoutSchedule({ entries, plans, today, loading, error, plansLoading, plansError, onRetry, onPlansRetry, onSave, onDelete, onStart, onViewPlans, onViewPlan, draft }) {
  const [month, setMonth] = useState(() => { const now = scheduleDate(today); return new Date(now.getFullYear(), now.getMonth(), 1, 12); });
  const [selectedDate, setSelectedDate] = useState(today);
  const [editor, setEditor] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [movingId, setMovingId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dropDate, setDropDate] = useState(null);
  const draggedId = useRef(null);
  const movePending = useRef(false);
  const suppressClickUntil = useRef(0);
  function canDrag(entry) {
    return !entry.completedWorkoutId && entry.planAvailable !== false && plans.some(plan => plan.id === entry.planId)
      && !plansLoading && !plansError && !editor && deletingId === null && movingId === null && !movePending.current;
  }
  function beginDrag(event, entry) {
    if (!canDrag(entry)) { event.preventDefault(); return; }
    draggedId.current = entry.id; setDraggingId(entry.id); setActionError(''); setNotice('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(entry.id));
  }
  function endDrag() {
    draggedId.current = null; setDraggingId(null); setDropDate(null);
    suppressClickUntil.current = Date.now() + 400;
  }
  function viewPlan(entry, date) {
    if (Date.now() < suppressClickUntil.current) return;
    if (date) selectDate(date);
    onViewPlan(entry);
  }
  async function dropWorkout(event, day) {
    if (draggedId.current === null || movePending.current || day.year < 1900 || day.year > 9999) return;
    event.preventDefault();
    const id = draggedId.current;
    endDrag();
    setActionError(''); setNotice('');
    try {
      const moved = moveScheduledWorkout(entries, id, day.key);
      if (!moved) return;
      movePending.current = true; setMovingId(id);
      await onSave(moved);
      selectDate(day.key);
      setNotice(`${moved.planName} moved to ${scheduleDate(day.key).toLocaleDateString()}.`);
    } catch (error) { setActionError(error.message); }
    finally { movePending.current = false; setMovingId(null); }
  }
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const onDay = entries.filter(entry => entry.date === selectedDate).sort((a, b) => a.id - b.id);
  function selectDate(key) {
    const date = scheduleDate(key);
    setSelectedDate(key); setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12)); setNotice('');
  }
  function changeMonth(delta) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
    setMonth(next); setSelectedDate(localDateKey(next)); setNotice('');
  }
  async function save(entry) { await onSave(entry); selectDate(entry.date); setNotice('Workout scheduled.'); }
  async function remove(entry) {
    if (!window.confirm(`Remove “${entry.planName}” from ${scheduleDate(entry.date).toLocaleDateString()}? Completed workout history will stay saved.`)) return;
    setDeletingId(entry.id); setActionError(''); setNotice('');
    try { await onDelete(entry.id); setNotice('Workout removed from the schedule.'); } catch (error) { setActionError(error.message); } finally { setDeletingId(null); }
  }
  if (loading) return <div className="empty" role="status">Loading your schedule…</div>;
  if (error) return <div className="error connection" role="alert"><p>{error}</p><button className="secondary" onClick={onRetry}><RefreshCw size={16}/>Retry</button></div>;
  return <div className="schedule-page">
    <UpcomingWorkout entries={entries} today={today} plans={plans} loading={false} onViewSchedule={() => selectDate(nextScheduledWorkout(entries, today)?.date || today)} onStart={onStart} onViewPlan={onViewPlan} draft={draft}/>
    {notice && <p role="status" className="notice">{notice}</p>}
    {actionError && <p role="alert" className="error mb-4">{actionError}</p>}
    {movingId !== null && <p role="status" className="notice">Moving workout…</p>}
    <div className="schedule-layout"><section className="calendar-panel" aria-label="Workout calendar">
      <div className="calendar-heading"><h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><div className="flex items-center gap-2"><button className="text-button" onClick={() => selectDate(today)}>Today</button><button className="icon-button" aria-label="Previous month" disabled={month.getFullYear() === 1900 && month.getMonth() === 0} onClick={() => changeMonth(-1)}><ChevronLeft size={20}/></button><button className="icon-button" aria-label="Next month" disabled={month.getFullYear() === 9999 && month.getMonth() === 11} onClick={() => changeMonth(1)}><ChevronRight size={20}/></button></div></div>
      <p id="schedule-drag-help" className="calendar-drag-help">Drag a planned workout onto another day. On mobile or with a keyboard, use its Reschedule button.</p>
      <table className="month-calendar"><caption className="sr-only">Select a date to view or add workout plans</caption><thead><tr>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(day => {
        const scheduled = entries.filter(entry => entry.date === day.key);
        const done = scheduled.filter(entry => entry.completedWorkoutId).length;
        const dateLabel = scheduleDate(day.key).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        return <td key={day.key} onDragOver={event => {
          if (draggedId.current === null || movePending.current || day.year < 1900 || day.year > 9999) return;
          event.preventDefault(); event.dataTransfer.dropEffect = 'move';
          setDropDate(day.key);
        }} onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDropDate(current => current === day.key ? null : current);
        }} onDrop={event => dropWorkout(event, day)}><div className={`calendar-day ${dropDate === day.key ? 'is-drop-target' : ''} ${!day.inMonth ? 'other-month' : ''} ${day.key === today ? 'is-today' : ''} ${day.key === selectedDate ? 'is-selected' : ''}`}>
          <button type="button" className="calendar-date-select" disabled={day.year < 1900 || day.year > 9999} aria-pressed={day.key === selectedDate} aria-current={day.key === today ? 'date' : undefined} aria-label={`${dateLabel}, ${scheduled.length} scheduled, ${done} completed`} onClick={() => selectDate(day.key)}><span className="calendar-day-number">{day.day}</span></button>
          <div className="calendar-day-events">{scheduled.slice(0, 2).map(entry => {
            const name = plans.find(plan => plan.id === entry.planId)?.name || entry.planName;
            return <button type="button" key={entry.id} className={`calendar-event ${entry.completedWorkoutId ? 'is-done' : ''} ${draggingId === entry.id ? 'is-dragging' : ''}`} draggable={canDrag(entry)} onDragStart={event => beginDrag(event, entry)} onDragEnd={endDrag} aria-describedby={canDrag(entry) ? 'schedule-drag-help' : undefined} aria-label={`View ${name} plan for ${dateLabel}`} title={canDrag(entry) ? `${name} — drag to reschedule` : name} onClick={() => viewPlan(entry, day.key)}><span className="calendar-event-dot"/><span className="calendar-event-name">{name}</span></button>;
          })}{scheduled.length > 2 && <button type="button" className="calendar-more" aria-label={`View all ${scheduled.length} workouts for ${dateLabel}`} onClick={() => selectDate(day.key)}>+{scheduled.length - 2}</button>}</div>
        </div></td>;

      })}</tr>)}</tbody></table><p className="calendar-legend"><span><i/>Planned</span><span><i className="done-dot"/>Completed</span></p>
    </section><section className="schedule-day-panel" aria-label="Selected date workouts"><div className="section-heading"><div><p className="eyebrow">YOUR TRAINING DAY</p><h2>{scheduleDate(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h2></div></div>
      {plansLoading ? <p className="muted" role="status">Loading workout plans…</p> : plansError ? <div className="error mb-4" role="alert"><p>{plansError}</p><button className="secondary mt-2" onClick={onPlansRetry}>Retry plans</button></div> : plans.length ? <button className="primary schedule-add" disabled={movingId !== null} onClick={() => setEditor({})}><Plus size={16}/>Add workout</button> : <div className="empty schedule-empty"><CalendarDays size={26}/><p>Create a workout plan before adding it to your calendar.</p><button className="secondary" onClick={onViewPlans}>View workout plans</button></div>}
      {!onDay.length && <p className="muted mt-5">No workouts scheduled for this date. Make it a training day, or enjoy a rest day.</p>}
      <div className="schedule-day-list">{onDay.map(entry => {
        const plan = plans.find(plan => plan.id === entry.planId);
        const completed = Boolean(entry.completedWorkoutId);
        return <article className="scheduled-entry" key={entry.id}><div className="flex justify-between gap-3"><h3><button type="button" className="plan-title-button" aria-label={`View ${plan?.name || entry.planName} plan details`} draggable={canDrag(entry)} onDragStart={event => beginDrag(event, entry)} onDragEnd={endDrag} aria-describedby={canDrag(entry) ? 'schedule-drag-help' : undefined} onClick={() => viewPlan(entry)}>{plan?.name || entry.planName}</button></h3><div className="flex gap-1">{!completed && <button className="icon-button" disabled={movingId !== null || deletingId === entry.id || plansLoading || Boolean(plansError) || !plans.length} aria-label={`Reschedule ${entry.planName}`} onClick={() => setEditor({ entry })}><Pencil size={15}/></button>}<button className="icon-button" disabled={movingId !== null || deletingId === entry.id} aria-label={`Remove scheduled ${entry.planName}`} onClick={() => remove(entry)}><Trash2 size={15}/></button></div></div><p className="schedule-status">{completed ? <><Check size={14}/>Completed</> : entry.date < today ? 'Planned · Past date' : 'Planned'}</p>{!entry.planAvailable && !completed && <p className="muted">This plan was deleted. Assign another plan or remove this entry.</p>}{!completed && <button className="secondary mt-3" disabled={movingId !== null || !plan || deletingId === entry.id} onClick={() => onStart(plan, entry.id)}>{matchesWorkoutDraft(draft, entry.planId, entry.id) ? 'Resume workout' : 'Start workout'}</button>}</article>;
      })}</div>
    </section></div><p className="progress-note">Workouts are scheduled by date. Upcoming workouts include today and exclude completed entries and deleted plans. Start a workout from its schedule entry to mark it complete automatically when you finish.</p>
    {editor && <ScheduleEditor entry={editor.entry} date={selectedDate} plans={plans} onSave={save} onClose={() => setEditor(null)}/>}
  </div>;
}
