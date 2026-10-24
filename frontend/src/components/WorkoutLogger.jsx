import RestTimer from './RestTimer';
import { formatRestTime, startRestTimer } from '../services/restTimer';
import ExerciseMuscles from './ExerciseMuscles';
import { previousExerciseSessions } from '../services/workouts';
import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Save, Trash2, X } from 'lucide-react';

export default function WorkoutLogger({ catalog, workouts = [], historyLoading = false, historyError, onHistoryRetry, draft, onChange, onFinish, onSaveDraft, guest = false, onClose, onDiscard, editing = false }) {
  const dialog = useRef(null);
  const previous = editing ? [] : previousExerciseSessions(draft, workouts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveAction, setSaveAction] = useState(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  function changeSet(exerciseIndex, setIndex, field, value) {
    onChange({ ...draft, exercises: draft.exercises.map((exercise, i) => i !== exerciseIndex ? exercise : { ...exercise, sets: exercise.sets.map((set, j) => j === setIndex ? { ...set, [field]: value } : set) }) });
  }
  function changeExercise(index, patch) {
    onChange({ ...draft, exercises: draft.exercises.map((exercise, i) => i === index ? { ...exercise, ...patch } : exercise) });
  }
  function removeSet(exerciseIndex, setIndex) {
    const exercise = draft.exercises[exerciseIndex];
    const set = exercise.sets[setIndex];
    if ((String(set.weight) !== '' || String(set.reps) !== '') && !window.confirm('Remove this set and its recorded values?')) return;
    changeExercise(exerciseIndex, { sets: exercise.sets.filter((_, i) => i !== setIndex) });
  }
  async function finish(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setSaveAction('finish'); setError('');
    try { await onFinish(draft); } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  async function saveProgress() {
    if (saving) return;
    setSaving(true); setSaveAction('draft'); setError('');
    try { await onSaveDraft(draft); }
    catch (error) { setError(error.message); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} className="workout-dialog" aria-labelledby="workout-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={finish}>
      <div className="flex justify-between items-start gap-3"><div><p className="eyebrow">{editing ? 'EDIT COMPLETED WORKOUT' : 'YOUR SESSION'}</p><h2 id="workout-title">{draft.planName}</h2></div><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label={editing ? 'Close workout editor' : 'Minimize workout'}><X size={20}/></button></div>
      <p className="muted mt-3">Record each set in kilograms. Enter 0 for bodyweight or no added weight. {editing ? 'Changes apply to History and Progress after saving. The original workout date is preserved.' : 'Close this window to return to your workout later.'}</p>
      {!editing && <RestTimer timer={draft.restTimer} disabled={saving} onChange={restTimer => onChange({ ...draft, restTimer })}/>}
      {!editing && historyError && <div className="error mt-4" role="alert"><p>Previous workout values are unavailable. You can still record this workout.</p><button type="button" className="secondary mt-2" onClick={onHistoryRetry}>Retry history</button></div>}
      <fieldset disabled={saving} className="workout-fields">
        {draft.exercises.map((exercise, exerciseIndex) => {
          const last = previous[exerciseIndex];
          return <section className="logged-exercise" key={exerciseIndex}>
          <div className="exercise-log-heading"><div><h3>{exercise.name}</h3><ExerciseMuscles exercise={exercise} catalog={catalog}/></div><label className="skip-toggle"><input type="checkbox" checked={Boolean(exercise.skipped)} onChange={event => changeExercise(exerciseIndex, { skipped: event.target.checked })}/>Skip exercise {exerciseIndex + 1}</label></div><p className="muted">Target: {exercise.targetSets || exercise.sets.length} sets × {exercise.targetReps} reps{exercise.restSeconds != null && ` · Rest: ${exercise.restSeconds}s between sets`}</p>
          {!editing && <div className="previous-workout" aria-label={`Previous performance for ${exercise.name}`}>
            {historyLoading ? <p role="status">Loading previous workout…</p> : historyError ? <p>Previous values unavailable.</p> : last ? <>
              <p><strong>Last performed</strong> <time dateTime={last.completedAt}>{new Date(last.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time> · {last.planName}</p>
              <p>{last.sets.map(set => `${set.weight} kg × ${set.reps}`).join(' · ')}</p>
            </> : <p>No previous recorded sets for this exercise yet.</p>}
          </div>}
          {exercise.skipped && <p className="skipped-note">Skipped — no weights or reps will be recorded.</p>}
          <fieldset className="workout-fields" disabled={exercise.skipped}>
          {exercise.sets.map((set, setIndex) => <div className={`logged-set flexible-set ${!editing ? 'with-previous' : ''}`} key={setIndex}>
            <span className="set-label">Set {setIndex + 1}</span>
            {!editing && <div className="previous-set"><span>Previous</span><strong>{historyLoading ? 'Loading…' : historyError ? 'Unavailable' : last?.sets[setIndex] ? `${last.sets[setIndex].weight} kg × ${last.sets[setIndex].reps}` : '—'}</strong></div>}
            <label>Weight (kg)<input aria-label={`${exercise.name}, exercise ${exerciseIndex + 1}, set ${setIndex + 1} weight in kilograms`} type="number" inputMode="decimal" min="0" max="2000" step="0.01" required placeholder="0" value={set.weight} onChange={e => changeSet(exerciseIndex, setIndex, 'weight', e.target.value)}/></label>
            <label>Reps<input aria-label={`${exercise.name}, exercise ${exerciseIndex + 1}, set ${setIndex + 1} reps`} type="number" inputMode="numeric" min="1" max="100" step="1" required placeholder={String(exercise.targetReps)} value={set.reps} onChange={e => changeSet(exerciseIndex, setIndex, 'reps', e.target.value)}/></label>
            <button type="button" className="icon-button" disabled={exercise.sets.length <= 1} aria-label={`Remove exercise ${exerciseIndex + 1} set ${setIndex + 1}`} onClick={() => removeSet(exerciseIndex, setIndex)}><Trash2 size={16}/></button>
          </div>)}
          <div className="exercise-set-actions"><button type="button" className="secondary" disabled={exercise.sets.length >= 50} onClick={() => changeExercise(exerciseIndex, { sets: [...exercise.sets, { weight: '', reps: '' }] })}><Plus size={15}/>Add set</button>
          {!editing && exercise.restSeconds !== 0 && <button type="button" className="secondary" onClick={() => {
            onChange({ ...draft, restTimer: startRestTimer(exercise) });
            dialog.current.scrollTo({ top: 0, behavior: 'smooth' });
          }}>Start rest · {formatRestTime((exercise.restSeconds ?? 60) * 1000)}</button>}
          {!editing && exercise.restSeconds === 0 && <span className="muted">No rest planned</span>}
          </div></fieldset>
        </section>; })}
      </fieldset>
      {error && <p className="error mt-4" role="alert">{error}</p>}
      {!editing && <p className="progress-note">{guest ? 'Save keeps your progress for this visit only.' : 'Save keeps your unfinished workout on this device.'} Finish workout adds the session to History.</p>}
      <div className={`editor-footer workout-footer ${editing ? '' : 'workout-footer-active'}`}>
        {editing ? <>
          <button type="button" className="secondary" disabled={saving} onClick={onDiscard}>Cancel editing</button>
          <button type="submit" className="primary" disabled={saving}><Check size={16}/>{saving ? 'Saving…' : 'Save changes'}</button>
        </> : <>
          <button type="submit" className="secondary finish-workout" disabled={saving}><Check size={16}/>{saving && saveAction === 'finish' ? 'Finishing…' : 'Finish workout'}</button>
          <button type="button" className="text-button discard-workout" disabled={saving} onClick={onDiscard}>Discard workout</button>
          <button type="button" className="primary save-workout-progress" disabled={saving} onClick={saveProgress}><Save size={16}/>{saving && saveAction === 'draft' ? 'Saving…' : 'Save'}</button>
        </>}
      </div>
    </form>
  </dialog>;
}
