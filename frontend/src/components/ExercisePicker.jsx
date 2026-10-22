import { useState } from 'react';

export default function ExercisePicker({ label, exercise, catalog, onChange, onCreate, disabled }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = catalog.find(item => item.id === exercise.exerciseId) || catalog.find(item => item.name.trim().toLowerCase() === exercise.name.trim().toLowerCase());
  async function create() {
    if (!name.trim()) { setError('Enter an exercise name.'); return; }
    setBusy(true); setError('');
    try { const item = await onCreate(name); onChange({ name: item.name, exerciseId: item.id }); setName(''); setAdding(false); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <div className="exercise-picker"><label>{label}<select required disabled={disabled || busy} value={selected?.id || (exercise.name ? 'legacy' : '')} onChange={event => { const item = catalog.find(item => String(item.id) === event.target.value); if (item) onChange({ name: item.name, exerciseId: item.id }); }}>
    <option value="" disabled>Select an exercise</option>{!selected && exercise.name && <option value="legacy">{exercise.name} (existing)</option>}{catalog.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select></label>
  {!adding ? <button type="button" className="text-button picker-add" disabled={disabled} onClick={() => setAdding(true)}>+ Create custom exercise</button> : <div className="picker-create"><input aria-label="New exercise name" maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy || disabled} placeholder="Custom exercise name"/><div className="flex gap-2 mt-2"><button type="button" className="secondary" disabled={busy || disabled} onClick={create}>{busy ? 'Adding…' : 'Add to catalog'}</button><button type="button" className="text-button" disabled={busy} onClick={() => { setAdding(false); setError(''); }}>Cancel</button></div></div>}
  {error && <p className="error mt-2" role="alert">{error}</p>}</div>;
}
