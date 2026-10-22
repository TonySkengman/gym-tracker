import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
const exercise = () => ({ name: '', targetSets: 3, targetReps: 10 });
export default function PlanEditor({ plan, onSave, onClose }) {
  const dialog = useRef(null);
  const [form, setForm] = useState(plan || { name: '', description: '', exercises: [exercise()] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  const changeExercise = (index, key, value) => setForm({ ...form, exercises: form.exercises.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave(form); onClose(); } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} aria-labelledby="editor-title">
    <form onSubmit={submit}>
      <div className="flex items-center justify-between"><div><p className="eyebrow">BUILD YOUR ROUTINE</p><h2 id="editor-title">{plan ? 'Edit workout plan' : 'New workout plan'}</h2></div><button type="button" className="icon-button" aria-label="Close editor" disabled={saving} onClick={onClose}><X size={20}/></button></div>
      <label>Plan name<input autoFocus required maxLength={100} pattern=".*\S.*" placeholder="e.g. Upper body strength" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
      <label>Description <span className="muted">(optional)</span><textarea maxLength={500} placeholder="What are you working toward?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
      <div className="flex items-center justify-between my-5"><h3>Exercises</h3><span className="muted">{form.exercises.length} / 50</span></div>
      <div className="space-y-3">{form.exercises.map((item, index) => <div className="exercise-input" key={index}>
        <label className="exercise-name">Exercise {index + 1}<input required maxLength={100} pattern=".*\S.*" placeholder="e.g. Bench press" value={item.name} onChange={e => changeExercise(index, 'name', e.target.value)}/></label>
        <label>Sets<input type="number" required min="1" max="50" value={item.targetSets} onChange={e => changeExercise(index, 'targetSets', e.target.value)}/></label>
        <label>Reps<input type="number" required min="1" max="100" value={item.targetReps} onChange={e => changeExercise(index, 'targetReps', e.target.value)}/></label>
        <button type="button" className="icon-button" aria-label={`Remove exercise ${index + 1}`} disabled={form.exercises.length === 1 || saving} onClick={() => setForm({ ...form, exercises: form.exercises.filter((_, i) => i !== index) })}><Trash2 size={17}/></button>
      </div>)}</div>
      <button type="button" className="secondary mt-4" disabled={form.exercises.length >= 50 || saving} onClick={() => setForm({ ...form, exercises: [...form.exercises, exercise()] })}><Plus size={16}/>Add exercise</button>
      {error && <p role="alert" className="error mt-4">{error}</p>}
      <div className="editor-footer"><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</button></div>
    </form>
  </dialog>;
}
