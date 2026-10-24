import { useEffect, useRef, useState } from 'react';
import ExercisePicker from './ExercisePicker';
import { moveExercise } from '../services/planOrder';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X } from 'lucide-react';

const editorExercise = item => ({ ...item, _editorId: crypto.randomUUID() });
const exercise = () => editorExercise({ name: '', targetSets: 3, targetReps: 10, restSeconds: '' });
export default function PlanEditor({ plan, duplicate = false, onSave, onClose, catalog, catalogLoading, catalogError, onCatalogRetry, onCreateExercise }) {
  const dialog = useRef(null);
  const draggedId = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [orderMessage, setOrderMessage] = useState('');
  const [form, setForm] = useState(() => plan
    ? { ...plan, exercises: plan.exercises.map(editorExercise) }
    : { name: '', description: '', exercises: [exercise()] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  const changeExercise = (index, key, value) => setForm({ ...form, exercises: form.exercises.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  function reorder(from, to) {
    if (saving) return;
    const reordered = moveExercise(form.exercises, from, to);
    if (reordered === form.exercises) return;
    setForm({ ...form, exercises: reordered });
    setOrderMessage(`${form.exercises[from].name || `Exercise ${from + 1}`} moved to position ${to + 1}.`);
  }
  function endDrag() {
    draggedId.current = null; setDragging(null); setDropTarget(null);
  }
  function drop(event, index) {
    if (!draggedId.current || saving) return;
    event.preventDefault();
    const from = form.exercises.findIndex(item => item._editorId === draggedId.current);
    const bounds = event.currentTarget.getBoundingClientRect();
    const gap = index + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0);
    reorder(from, gap > from ? gap - 1 : gap);
    endDrag();
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    // Editor row keys never become part of stored plans.
    const payload = { ...form, exercises: form.exercises.map(({ _editorId, ...item }) => item) };
    try { await onSave(payload); onClose(); } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} aria-labelledby="editor-title">
    <form onSubmit={submit}>
      <div className="flex items-center justify-between"><div><p className="eyebrow">BUILD YOUR ROUTINE</p><h2 id="editor-title">{duplicate ? 'Duplicate workout plan' : plan ? 'Edit workout plan' : 'New workout plan'}</h2></div><button type="button" className="icon-button" aria-label="Close editor" disabled={saving} onClick={onClose}><X size={20}/></button></div>
      {duplicate && <p className="muted mt-3">Adjust this copy, then save it as a new plan. The original routine stays unchanged.</p>}
      <label>Plan name<input autoFocus required maxLength={100} pattern=".*\S.*" placeholder="e.g. Upper body strength" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
      <label>Description <span className="muted">(optional)</span><textarea maxLength={500} placeholder="What are you working toward?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
      <div className="flex items-center justify-between my-5"><h3>Exercises</h3><span className="muted">{form.exercises.length} / 50</span></div>
      <p id="exercise-order-help" className="muted exercise-order-help">Drag a handle or use the arrows to change exercise order.</p>
      <p className="sr-only" role="status">{orderMessage}</p>
      {catalogLoading && <p className="muted" role="status">Loading exercise catalog…</p>}
      {catalogError && <div className="error mb-4" role="alert"><p>{catalogError}</p><button type="button" className="secondary mt-2" onClick={onCatalogRetry}>Retry catalog</button></div>}
      <div className="space-y-3">{form.exercises.map((item, index) => <div
        className={`plan-exercise-row ${dragging === item._editorId ? 'is-dragging' : ''} ${dropTarget?.id === item._editorId ? (dropTarget.after ? 'drop-after' : 'drop-before') : ''}`}
        key={item._editorId}
        onDragOver={event => {
          if (!draggedId.current || saving) return;
          event.preventDefault(); event.dataTransfer.dropEffect = 'move';
          const bounds = event.currentTarget.getBoundingClientRect();
          const after = event.clientY >= bounds.top + bounds.height / 2;
          setDropTarget(current => current?.id === item._editorId && current.after === after ? current : { id: item._editorId, after });
        }}
        onDrop={event => drop(event, index)}>
        <div className="exercise-order-controls">
          <button type="button" className="icon-button exercise-drag-handle" draggable={!saving && form.exercises.length > 1}
            disabled={saving || form.exercises.length === 1}
            aria-label={`Reorder exercise ${index + 1}: ${item.name || 'New exercise'}. Use up and down arrow keys.`} aria-describedby="exercise-order-help"
            onDragStart={event => {
              draggedId.current = item._editorId; setDragging(item._editorId);
              event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item._editorId);
            }} onDragEnd={endDrag}
            onKeyDown={event => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault(); reorder(index, index + (event.key === 'ArrowUp' ? -1 : 1));
              }
            }}><GripVertical size={18}/></button>
          <span>Position {index + 1}</span>
          <div className="exercise-move-buttons">
            <button type="button" className="icon-button" disabled={saving || index === 0} aria-label={`Move exercise ${index + 1} up`} onClick={() => reorder(index, index - 1)}><ArrowUp size={16}/></button>
            <button type="button" className="icon-button" disabled={saving || index === form.exercises.length - 1} aria-label={`Move exercise ${index + 1} down`} onClick={() => reorder(index, index + 1)}><ArrowDown size={16}/></button>
          </div>
        </div>
        <div className="exercise-input plan-exercise-input">
          <ExercisePicker label={`Exercise ${index + 1}`} exercise={item} catalog={catalog} disabled={saving || catalogLoading} onCreate={onCreateExercise} onChange={update => setForm({ ...form, exercises: form.exercises.map((exercise, i) => i === index ? { ...exercise, ...update } : exercise) })}/>
          <label>Sets<input type="number" required min="1" max="50" value={item.targetSets} onChange={e => changeExercise(index, 'targetSets', e.target.value)}/></label>
          <label>Reps<input type="number" required min="1" max="100" value={item.targetReps} onChange={e => changeExercise(index, 'targetReps', e.target.value)}/></label>
          <label>Rest (sec)<input aria-label={`Rest between sets for exercise ${index + 1} in seconds`} type="number" min="0" max="3600" step="1" placeholder="Optional" value={item.restSeconds ?? ''} onChange={e => changeExercise(index, 'restSeconds', e.target.value)}/></label>
          <button type="button" className="icon-button" aria-label={`Remove exercise ${index + 1}`} disabled={form.exercises.length === 1 || saving} onClick={() => setForm({ ...form, exercises: form.exercises.filter((_, i) => i !== index) })}><Trash2 size={17}/></button>
        </div>
      </div>)}</div>
      <button type="button" className="secondary mt-4" disabled={form.exercises.length >= 50 || saving} onClick={() => setForm({ ...form, exercises: [...form.exercises, exercise()] })}><Plus size={16}/>Add exercise</button>
      {error && <p role="alert" className="error mt-4">{error}</p>}
      <div className="editor-footer"><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving || catalogLoading || Boolean(catalogError)}>{saving ? 'Saving…' : 'Save plan'}</button></div>
    </form>
  </dialog>;
}
