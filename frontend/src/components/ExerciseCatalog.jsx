import ExerciseMuscles from './ExerciseMuscles';
import MuscleFields from './MuscleFields';
import { parseMuscles } from '../services/muscles';
import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';

export default function ExerciseCatalog({ catalog, loading, error, onRetry, onCreate }) {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  async function create(event) {
    event.preventDefault(); setSaving(true); setSaveError(''); setMessage('');
    try { const exercise = await onCreate(name, { primaryMuscles: parseMuscles(primary), secondaryMuscles: parseMuscles(secondary) }); setMessage(`${exercise.name} added to the catalog.`); setName(''); setPrimary(''); setSecondary(''); }
    catch (error) { setSaveError(error.message); } finally { setSaving(false); }
  }
  if (loading) return <div className="empty" role="status">Loading exercise catalog…</div>;
  if (error) return <div className="error connection" role="alert"><p>{error}</p><button className="secondary" onClick={onRetry}><RefreshCw size={16}/>Retry</button></div>;
  const filtered = catalog.filter(exercise => [exercise.name, ...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])].some(value => value.toLowerCase().includes(search.trim().toLowerCase())));
  return <section className="catalog-page"><form className="catalog-create" onSubmit={create}><label>New exercise<input required maxLength={100} pattern=".*\S.*" placeholder="e.g. Romanian deadlift" value={name} disabled={saving} onChange={event => setName(event.target.value)}/></label><MuscleFields primary={primary} secondary={secondary} onPrimaryChange={setPrimary} onSecondaryChange={setSecondary} disabled={saving}/><button className="primary" disabled={saving}><Plus size={16}/>{saving ? 'Adding…' : 'Add exercise'}</button></form>
    {saveError && <p role="alert" className="error mb-4">{saveError}</p>}{message && <p role="status" className="notice">{message}</p>}
    <label className="catalog-search">Search exercises<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find an exercise or muscle…"/></label><p className="muted mt-4">{filtered.length} exercises</p>
    <ul className="catalog-list">{filtered.map(exercise => <li key={exercise.id}><h3>{exercise.name}</h3><ExerciseMuscles exercise={exercise}/></li>)}</ul>{!filtered.length && <p className="empty">No matching exercises. Add a custom exercise above.</p>}
    <p className="progress-note">Muscle labels describe typical technique; emphasis varies with grip, stance and execution. Choose these exercises when building plans to keep progress linked across routines. Existing names are imported automatically. Similar spellings are kept separate; the catalog does not guess that different names mean the same exercise.</p>
  </section>;
}
