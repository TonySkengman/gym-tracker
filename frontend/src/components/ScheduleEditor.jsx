import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function ScheduleEditor({ entry, date, plans, onSave, onClose }) {
  const dialog = useRef(null);
  const [form, setForm] = useState({ id: entry?.id, planId: entry?.planId || '', date: entry?.date || date });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave(form); onClose(); } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  return <dialog ref={dialog} aria-labelledby="schedule-editor-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}><form onSubmit={save}>
    <div className="flex justify-between items-start gap-4"><div><p className="eyebrow">MAKE TIME FOR YOURSELF</p><h2 id="schedule-editor-title">{entry ? 'Reschedule workout' : 'Schedule a workout'}</h2></div><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label="Close schedule editor"><X size={20}/></button></div>
    <fieldset className="workout-fields" disabled={saving}><label>Workout plan<select autoFocus required value={form.planId} onChange={event => setForm({ ...form, planId: event.target.value })}><option value="" disabled>Choose a saved plan</option>{entry && !plans.some(plan => plan.id === entry.planId) && <option value={entry.planId} disabled>{entry.planName} (deleted)</option>}{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
    <label>Workout date<input type="date" required min="1900-01-01" max="9999-12-31" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })}/></label></fieldset>
    <p className="muted mt-4">Schedule by date. You can add different plans to the same day.</p>{error && <p role="alert" className="error mt-4">{error}</p>}
    <div className="editor-footer"><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving || !plans.some(plan => String(plan.id) === String(form.planId))}>{saving ? 'Saving…' : entry ? 'Save changes' : 'Add to schedule'}</button></div>
  </form></dialog>;
}
