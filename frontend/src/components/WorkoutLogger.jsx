import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

export default function WorkoutLogger({ draft, onChange, onFinish, onClose, onDiscard }) {
  const dialog = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  function changeSet(exerciseIndex, setIndex, field, value) {
    onChange({ ...draft, exercises: draft.exercises.map((exercise, i) => i !== exerciseIndex ? exercise : { ...exercise, sets: exercise.sets.map((set, j) => j === setIndex ? { ...set, [field]: value } : set) }) });
  }
  async function finish(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try { await onFinish(draft); } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  return <dialog ref={dialog} className="workout-dialog" aria-labelledby="workout-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={finish}>
      <div className="flex justify-between items-start gap-3"><div><p className="eyebrow">YOUR SESSION</p><h2 id="workout-title">{draft.planName}</h2></div><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label="Minimize workout"><X size={20}/></button></div>
      <p className="muted mt-3">Record each set in kilograms. Enter 0 for bodyweight or no added weight. Close this window to return to your workout later.</p>
      <fieldset disabled={saving} className="workout-fields">
        {draft.exercises.map((exercise, exerciseIndex) => <section className="logged-exercise" key={exerciseIndex}>
          <h3>{exercise.name}</h3><p className="muted">Target: {exercise.sets.length} sets × {exercise.targetReps} reps</p>
          {exercise.sets.map((set, setIndex) => <div className="logged-set" key={setIndex}>
            <span className="set-label">Set {setIndex + 1}</span>
            <label>Weight (kg)<input aria-label={`${exercise.name}, exercise ${exerciseIndex + 1}, set ${setIndex + 1} weight in kilograms`} type="number" inputMode="decimal" min="0" max="2000" step="0.01" required placeholder="0" value={set.weight} onChange={e => changeSet(exerciseIndex, setIndex, 'weight', e.target.value)}/></label>
            <label>Reps<input aria-label={`${exercise.name}, exercise ${exerciseIndex + 1}, set ${setIndex + 1} reps`} type="number" inputMode="numeric" min="1" max="100" step="1" required placeholder={String(exercise.targetReps)} value={set.reps} onChange={e => changeSet(exerciseIndex, setIndex, 'reps', e.target.value)}/></label>
          </div>)}
        </section>)}
      </fieldset>
      {error && <p className="error mt-4" role="alert">{error}</p>}
      <div className="editor-footer workout-footer"><button type="button" className="secondary" disabled={saving} onClick={onDiscard}>Discard workout</button><button className="primary" disabled={saving}><Check size={16}/>{saving ? 'Saving…' : 'Finish workout'}</button></div>
    </form>
  </dialog>;
}
