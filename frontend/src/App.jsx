import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Check, ChevronRight, Dumbbell, History, LayoutDashboard, ListChecks, Pencil, Plus, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import PlanEditor from './components/PlanEditor';
import WorkoutLogger from './components/WorkoutLogger';
import WorkoutHistory from './components/WorkoutHistory';
import ExerciseCatalog from './components/ExerciseCatalog';
import { getExercises, createExercise } from './services/exercises';
import { completeWorkout, createWorkoutDraft, DRAFT_KEY, getWorkouts, readWorkoutDraft, updateWorkout, deleteWorkout, workoutToDraft } from './services/workouts';
import { deletePlan, getPlans, savePlan } from './services/plans';
const WorkoutProgress = lazy(() => import('./components/WorkoutProgress'));
const navigation = [{ name: 'Dashboard', icon: LayoutDashboard }, { name: 'Workout Plans', icon: ListChecks }, { name: 'History', icon: History }, { name: 'Progress', icon: TrendingUp }, { name: 'Exercises', icon: Dumbbell }];
export default function App() {
  const [page, setPage] = useState('Dashboard');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [workoutsError, setWorkoutsError] = useState('');
  const [draft, setDraft] = useState(readWorkoutDraft);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [draftWarning, setDraftWarning] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [workoutEdit, setWorkoutEdit] = useState(null);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState(null);
  const [historyActionError, setHistoryActionError] = useState('');
  async function loadCatalog() {
    setCatalogLoading(true); setCatalogError('');
    try { setCatalog(await getExercises()); } catch (error) { setCatalogError(error.message); } finally { setCatalogLoading(false); }
  }
  async function addExercise(name) {
    const created = await createExercise(name);
    setCatalog(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }
  async function saveWorkoutEdit(session) {
    const saved = await updateWorkout(session);
    setWorkouts(current => current.map(workout => workout.id === saved.id ? saved : workout));
    setWorkoutEdit(null); setHistoryActionError(''); setNotice('Workout updated. Progress charts now use the corrected sets.');
  }
  function closeWorkoutEdit() {
    if (window.confirm('Discard your unsaved workout edits?')) setWorkoutEdit(null);
  }
  async function removeWorkout(workout) {
    if (!window.confirm(`Delete “${workout.planName}” from ${new Date(workout.completedAt).toLocaleString()}? This also removes its data from Progress and cannot be undone.`)) return;
    setDeletingWorkoutId(workout.id); setHistoryActionError('');
    try { await deleteWorkout(workout.id); setWorkouts(current => current.filter(item => item.id !== workout.id)); setNotice('Workout deleted.'); }
    catch (error) { setHistoryActionError(error.message); } finally { setDeletingWorkoutId(null); }
  }
  useEffect(() => {
    try {
      if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(DRAFT_KEY);
      setDraftWarning('');
    } catch { setDraftWarning('Browser storage is unavailable. Keep this page open until your workout is saved.'); }
  }, [draft]);
  async function loadWorkouts() {
    setWorkoutsLoading(true); setWorkoutsError('');
    try { setWorkouts(await getWorkouts()); } catch (error) { setWorkoutsError(error.message); } finally { setWorkoutsLoading(false); }
  }
  function startWorkout(plan) {
    if (draft) { setWorkoutOpen(true); return; }
    setDraft(createWorkoutDraft(plan)); setWorkoutOpen(true); setNotice('');
  }
  async function finishWorkout(session) {
    const saved = await completeWorkout(session);
    setWorkouts(current => [saved, ...current.filter(item => item.id !== saved.id)]);
    setDraft(null); setWorkoutOpen(false); setWorkoutsError('');
    setPage('History'); setNotice('Workout completed and saved.');
  }
  function discardWorkout() {
    if (!window.confirm('Discard this unfinished workout and its recorded sets?')) return;
    setDraft(null); setWorkoutOpen(false);
  }
  async function load() {
    setLoading(true); setError('');
    try { setPlans(await getPlans()); } catch (error) { setError(error.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); loadWorkouts(); loadCatalog(); }, []);
  async function save(plan) {
    const saved = await savePlan(plan);
    setPlans(current => plan.id ? current.map(item => item.id === saved.id ? saved : item) : [saved, ...current]);
    setError(''); setNotice('Workout plan saved.');
  }
  async function remove(plan) {
    if (!window.confirm(`Delete “${plan.name}”? This cannot be undone.`)) return;
    setDeleting(plan.id); setError('');
    try { await deletePlan(plan.id); setPlans(current => current.filter(item => item.id !== plan.id)); setNotice('Workout plan deleted.'); }
    catch (error) { setError(error.message); } finally { setDeleting(null); }
  }
  const totalExercises = plans.reduce((sum, plan) => sum + plan.exercises.length, 0);
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('Dashboard'); }}><span className="brand-icon"><Dumbbell size={24}/></span>form<span className="brand-dot">.</span></a><p className="sidebar-label">YOUR TRAINING SPACE</p><nav aria-label="Main navigation">{navigation.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} aria-current={page === name ? 'page' : undefined} onClick={() => { setPage(name); setNotice(''); }}><Icon size={19}/><span>{name}</span>{page === name && <span className="nav-dot"/>}</button>)}</nav><div className="sidebar-bottom"><span className="avatar">TL</span><div><strong>Your workspace</strong><p>One rep at a time.</p></div></div></aside>
    <main><header className="topbar"><span>Workspace <ChevronRight size={14}/> <strong>{page}</strong></span><span className="version">PERSONAL TRAINING / V.01</span></header>
      <div className="page-content"><div className="page-heading"><div><p className="eyebrow">LET’S BUILD SOMETHING STRONGER</p><h1>{page === 'Dashboard' ? 'Your training, in focus.' : page}</h1><p className="muted">{page === 'Dashboard' ? 'Make a plan. Show up. Keep getting better.' : page === 'Workout Plans' ? 'Your routines, ready for the next session.' : page === 'Progress' ? 'See how your training changes, one session at a time.' : page === 'Exercises' ? 'A shared catalog for consistent plans and progress.' : 'Your completed sessions, all in one place.'}</p></div>{['Dashboard', 'Workout Plans'].includes(page) && <button className="primary" onClick={() => setEditor({})}><Plus size={18}/>New plan</button>}</div>
      {draftWarning && <p role="alert" className="error mb-4">{draftWarning}</p>}
      {draft && <div className="active-workout mb-5"><div><strong>Workout in progress</strong><p>{draft.planName}</p></div><button className="primary" onClick={() => setWorkoutOpen(true)}>Resume workout</button></div>}
      {notice && <p className="notice" role="status"><Check size={16}/>{notice}</p>}
      {['Dashboard', 'Workout Plans'].includes(page) && <>
        {page === 'Dashboard' && <><section className="hero"><div className="hero-content"><span className="pill"><span/> CONSISTENCY STARTS HERE</span><h2>Small steps.<br/><em>Stronger you.</em></h2><p>Your next chapter starts with a plan.<br/>Build a routine that works for you.</p><button className="hero-button" onClick={() => setEditor({})}>Build your workout <ArrowUpRight size={18}/></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><Dumbbell className="hero-dumbbell" strokeWidth={1}/><span className="art-label">PROGRESS IS A PRACTICE.</span></div></section>
        <section className="stats" aria-label="Training overview">{[{ label: 'Workout plans', value: loading || error ? '—' : String(plans.length).padStart(2, '0'), sub: 'Built around your goals', icon: ListChecks }, { label: 'Planned exercises', value: loading || error ? '—' : String(totalExercises).padStart(2, '0'), sub: 'Across all your routines', icon: Dumbbell }, { label: 'Completed workouts', value: workoutsLoading || workoutsError ? '—' : String(workouts.length).padStart(2, '0'), sub: workoutsError ? 'Open History to retry' : 'Every session counts', icon: Activity }].map(({ label, value, sub, icon: Icon }) => <article className="stat" key={label}><div className="flex justify-between"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><p>{sub}</p></article>)}</section></>}
        <section><div className="section-heading"><div><h2>Your workout plans <span className="count">{plans.length}</span></h2><p className="muted">A little structure. A lot of potential.</p></div>{page === 'Dashboard' && <button className="text-button" onClick={() => setPage('Workout Plans')}>View all <ChevronRight size={16}/></button>}</div>
          {error && <div className="error connection" role="alert"><div><strong>Unable to connect</strong><p>{error}</p></div><button className="secondary" onClick={load}><RefreshCw size={15}/>Retry</button></div>}
          {loading ? <div className="empty" role="status">Loading your workout plans…</div> : plans.length ? <div className="plan-grid">{plans.map((plan, index) => <article className="plan-card" key={plan.id}><div className="flex justify-between items-center"><span className="plan-number">PLAN {String(index + 1).padStart(2, '0')}</span><Dumbbell size={20} className="lime"/></div><h3>{plan.name}</h3><p className="plan-description">{plan.description || 'Your next step toward a stronger routine.'}</p><div className="exercise-list">{plan.exercises.map((exercise, i) => <div key={i}><span>{exercise.name}</span><small>{exercise.targetSets} × {exercise.targetReps}</small></div>)}</div><div className="plan-footer"><button className="secondary" onClick={() => startWorkout(plan)}>{draft ? 'Resume workout' : 'Start workout'}</button><div className="flex gap-2"><button className="icon-button" aria-label={`Edit ${plan.name}`} onClick={() => setEditor({ plan })}><Pencil size={16}/></button><button className="icon-button" aria-label={`Delete ${plan.name}`} disabled={deleting === plan.id} onClick={() => remove(plan)}><Trash2 size={16}/></button></div></div></article>)}</div> : !error && <div className="empty"><span className="empty-icon"><Dumbbell size={27}/></span><h3>Your first plan starts here</h3><p>Add your exercises, sets and reps.<br/>Keep your next session one step closer.</p><button className="secondary" onClick={() => setEditor({})}><Plus size={16}/>Create a workout plan</button></div>}
        </section></>}
      {page === 'Exercises' && <ExerciseCatalog catalog={catalog} loading={catalogLoading} error={catalogError} onRetry={loadCatalog} onCreate={addExercise}/>}
      {page === 'History' && historyActionError && <p className="error mb-4" role="alert">{historyActionError}</p>}
      {page === 'History' && <WorkoutHistory workouts={workouts} loading={workoutsLoading} error={workoutsError} onRetry={loadWorkouts} onViewPlans={() => setPage('Workout Plans')} onEdit={workout => setWorkoutEdit(workoutToDraft(workout))} onDelete={removeWorkout} deletingId={deletingWorkoutId}/>}
      {page === 'Progress' && <Suspense fallback={<div className="empty" role="status">Loading progress charts…</div>}><WorkoutProgress workouts={workouts} plans={plans} catalog={catalog} loading={workoutsLoading} error={workoutsError} onRetry={loadWorkouts} onViewPlans={() => setPage('Workout Plans')}/></Suspense>}
      <footer className="page-footer"><span>BUILT FOR THE LONG RUN.</span><span>One workout at a time.</span></footer></div>
    </main>{draft && workoutOpen && <WorkoutLogger draft={draft} onChange={setDraft} onFinish={finishWorkout} onClose={() => setWorkoutOpen(false)} onDiscard={discardWorkout}/>}
    {workoutEdit && <WorkoutLogger editing draft={workoutEdit} onChange={setWorkoutEdit} onFinish={saveWorkoutEdit} onClose={closeWorkoutEdit} onDiscard={closeWorkoutEdit}/>}
    {editor && <PlanEditor catalog={catalog} catalogLoading={catalogLoading} catalogError={catalogError} onCatalogRetry={loadCatalog} onCreateExercise={addExercise} plan={editor.plan} onSave={save} onClose={() => setEditor(null)}/>}
  </div>;
}
