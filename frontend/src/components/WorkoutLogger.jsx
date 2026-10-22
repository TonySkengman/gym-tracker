import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';

export default function WorkoutLogger({ draft, onChange, onFinish, onClose, onDiscard, editing = false }) {
  const dialog = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
    setSaving(true); setError('');
    try { await onFinish(draft); } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  return <dialog ref={dialog} className="workout-dialog" aria-labelledby="workout-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={finish}>
      <div className="flex justify-between items-start gap-3"><div><p className="eyebrow">{editing ? 'EDIT COMPLETED WORKOUT' : 'YOUR SESSION'}</p><h2 id="workout-title">{draft.planName}</h2></div><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label={editing ? 'Close workout editor' : 'Minimize workout'}><X size={20}/></button></div>
      <p className="muted mt-3">Record each set in kilograms. Enter 0 for bodyweight or no added weight. {editing ? 'Changes apply to History and Progress after saving. The original workout date is preserved.' : 'Close this window to return to your workout later.'}</p>
      <fieldset disabled={saving} className="workout-fields">
        {draft.exercises.map((exercise, exerciseIndex) => <section className="logged-exercise" key={exerciseIndex}>
          <div className="exercise-log-heading"><h3>{exercise.name}</h3><label className="skip-toggle"><input type="checkbox" checked={Boolean(exercise.skipped)} onChange={event => changeExercise(exerciseIndex, { skipped: event.target.checked })}/>Skip exercise {exerciseIndex + 1}</label></div><p className="muted">Target: {exercise.targetSets || exercise.sets.length} sets × {exercise.targetReps} reps</p>
          {exercise.skipped && <p className="skipped-note">Skipped — no weights or reps will be recorded.</p>}
          <fieldset className="workout-fields" disabled={exercise.skipped}>
          {exercise.sets.map((set, setIndex) => <div className="logged-set flexible-set" key={setIndex}>
            <span className="set-label">Set {setIndex + 1}</span>
            <label>Weight (kg)<input aria-label={`${exercise.name}, exercise ${exerciseIndex + 1}, set ${setIndex + 1} weight in kilograms`} type="number" inputMode="decimal" min="0" max="2000" step="0.01" required placeholder="0" value={set.weight} onChange={e => changeSet(exerciseIndex, setIndex, 'weight', e.target.value)}/></label>
            <label>Reps<input aria-label={`${exercise.name}, exercise ${exerciseIndex + 1}, set ${setIndex + 1} reps`} type="number" inputMode="numeric" min="1" max="100" step="1" required placeholder={String(exercise.targetReps)} value={set.reps} onChange={e => changeSet(exerciseIndex, setIndex, 'reps', e.target.value)}/></label>
            <button type="button" className="icon-button" disabled={exercise.sets.length <= 1} aria-label={`Remove exercise ${exerciseIndex + 1} set ${setIndex + 1}`} onClick={() => removeSet(exerciseIndex, setIndex)}><Trash2 size={16}/></button>
          </div>)}
          <button type="button" className="secondary mt-3" disabled={exercise.sets.length >= 50} onClick={() => changeExercise(exerciseIndex, { sets: [...exercise.sets, { weight: '', reps: '' }] })}><Plus size={15}/>Add set</button></fieldset>
        </section>)}
      </fieldset>
      {error && <p className="error mt-4" role="alert">{error}</p>}
      <div className="editor-footer workout-footer"><button type="button" className="secondary" disabled={saving} onClick={onDiscard}>{editing ? 'Cancel editing' : 'Discard workout'}</button><button className="primary" disabled={saving}><Check size={16}/>{saving ? 'Saving…' : editing ? 'Save changes' : 'Finish workout'}</button></div>
    </form>
  </dialog>;
}
