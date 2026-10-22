import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, Check, ChevronRight, Dumbbell, History, LayoutDashboard, ListChecks, Pencil, Plus, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import PlanEditor from './components/PlanEditor';
import { deletePlan, getPlans, savePlan } from './services/plans';
const navigation = [{ name: 'Dashboard', icon: LayoutDashboard }, { name: 'Workout Plans', icon: ListChecks }, { name: 'History', icon: History }, { name: 'Progress', icon: TrendingUp }];
export default function App() {
  const [page, setPage] = useState('Dashboard');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { setPlans(await getPlans()); } catch (error) { setError(error.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
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
      <div className="page-content"><div className="page-heading"><div><p className="eyebrow">LET’S BUILD SOMETHING STRONGER</p><h1>{page === 'Dashboard' ? 'Your training, in focus.' : page}</h1><p className="muted">{page === 'Dashboard' ? 'Make a plan. Show up. Keep getting better.' : page === 'Workout Plans' ? 'Your routines, ready for the next session.' : 'A stronger story starts with your first session.'}</p></div>{['Dashboard', 'Workout Plans'].includes(page) && <button className="primary" onClick={() => setEditor({})}><Plus size={18}/>New plan</button>}</div>
      {notice && <p className="notice" role="status"><Check size={16}/>{notice}</p>}
      {['Dashboard', 'Workout Plans'].includes(page) && <>
        {page === 'Dashboard' && <><section className="hero"><div className="hero-content"><span className="pill"><span/> CONSISTENCY STARTS HERE</span><h2>Small steps.<br/><em>Stronger you.</em></h2><p>Your next chapter starts with a plan.<br/>Build a routine that works for you.</p><button className="hero-button" onClick={() => setEditor({})}>Build your workout <ArrowUpRight size={18}/></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><Dumbbell className="hero-dumbbell" strokeWidth={1}/><span className="art-label">PROGRESS IS A PRACTICE.</span></div></section>
        <section className="stats" aria-label="Training overview">{[{ label: 'Workout plans', value: loading || error ? '—' : String(plans.length).padStart(2, '0'), sub: 'Built around your goals', icon: ListChecks }, { label: 'Planned exercises', value: loading || error ? '—' : String(totalExercises).padStart(2, '0'), sub: 'Across all your routines', icon: Dumbbell }, { label: 'Completed workouts', value: '—', sub: 'Workout logging coming next', icon: Activity }].map(({ label, value, sub, icon: Icon }) => <article className="stat" key={label}><div className="flex justify-between"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><p>{sub}</p></article>)}</section></>}
        <section><div className="section-heading"><div><h2>Your workout plans <span className="count">{plans.length}</span></h2><p className="muted">A little structure. A lot of potential.</p></div>{page === 'Dashboard' && <button className="text-button" onClick={() => setPage('Workout Plans')}>View all <ChevronRight size={16}/></button>}</div>
          {error && <div className="error connection" role="alert"><div><strong>Unable to connect</strong><p>{error}</p></div><button className="secondary" onClick={load}><RefreshCw size={15}/>Retry</button></div>}
          {loading ? <div className="empty" role="status">Loading your workout plans…</div> : plans.length ? <div className="plan-grid">{plans.map((plan, index) => <article className="plan-card" key={plan.id}><div className="flex justify-between items-center"><span className="plan-number">PLAN {String(index + 1).padStart(2, '0')}</span><Dumbbell size={20} className="lime"/></div><h3>{plan.name}</h3><p className="plan-description">{plan.description || 'Your next step toward a stronger routine.'}</p><div className="exercise-list">{plan.exercises.map((exercise, i) => <div key={i}><span>{exercise.name}</span><small>{exercise.targetSets} × {exercise.targetReps}</small></div>)}</div><div className="plan-footer"><span>{plan.exercises.length} exercises</span><div className="flex gap-2"><button className="icon-button" aria-label={`Edit ${plan.name}`} onClick={() => setEditor({ plan })}><Pencil size={16}/></button><button className="icon-button" aria-label={`Delete ${plan.name}`} disabled={deleting === plan.id} onClick={() => remove(plan)}><Trash2 size={16}/></button></div></div></article>)}</div> : !error && <div className="empty"><span className="empty-icon"><Dumbbell size={27}/></span><h3>Your first plan starts here</h3><p>Add your exercises, sets and reps.<br/>Keep your next session one step closer.</p><button className="secondary" onClick={() => setEditor({})}><Plus size={16}/>Create a workout plan</button></div>}
        </section></>}
      {['History', 'Progress'].includes(page) && <section className="empty milestone"><span className="empty-icon">{page === 'History' ? <CalendarDays size={30}/> : <TrendingUp size={30}/>}</span><span className="pill">NEXT MILESTONE</span><h2>{page === 'History' ? 'Every session will count.' : 'See how far you’ve come.'}</h2><p>{page === 'History' ? 'Workout logging and session history are coming in a future milestone.' : 'Progress charts will appear here once workout logging is available.'}</p><button className="secondary" onClick={() => setPage('Workout Plans')}>Build your plans <ArrowUpRight size={16}/></button></section>}
      <footer className="page-footer"><span>BUILT FOR THE LONG RUN.</span><span>One workout at a time.</span></footer></div>
    </main>{editor && <PlanEditor plan={editor.plan} onSave={save} onClose={() => setEditor(null)}/>}
  </div>;
}
