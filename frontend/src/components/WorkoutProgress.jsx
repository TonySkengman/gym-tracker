import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { getExerciseOptions, getExerciseProgress } from '../services/progress';

const number = value => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
const shortDate = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fullDate = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function SessionTooltip({ active, payload, metric }) {
  const session = payload?.[0]?.payload;
  if (!active || !session) return null;
  return <div className="progress-tooltip"><strong>{fullDate(session.completedAt)}</strong><p>{session.planName}</p><span>{metric === 'volume' ? 'Volume' : 'Heaviest weight'}: {number(session[metric])} {metric === 'volume' ? 'kg × reps' : 'kg'}</span></div>;
}

function ProgressChart({ sessions, metric, title, description }) {
  const volume = metric === 'volume';
  // Session IDs keep two workouts on the same day as distinct chart points.
  const dates = new Map(sessions.map(session => [session.id, session.completedAt]));
  const chartProps = { data: sessions, margin: { top: 20, right: 20, left: 0, bottom: 10 }, accessibilityLayer: true };
  const axes = <><CartesianGrid stroke="#30382a" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="id" tickFormatter={id => shortDate(dates.get(id))} tick={{ fill: '#a7b49b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={35}/><YAxis domain={[0, 'auto']} tick={{ fill: '#a7b49b', fontSize: 11 }} tickFormatter={number} axisLine={false} tickLine={false} width={62}/><Tooltip content={<SessionTooltip metric={metric}/>} cursor={volume ? { fill: '#c4ef7910' } : { stroke: '#617347' }}/></>;
  return <section className="progress-chart-card" aria-label={`${title} chart. Values are also available in the session data table.`}>
    <div className="chart-heading"><h2>{title}</h2><p className="muted">{description}</p></div>
    <div className="progress-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0}>
      {volume ? <BarChart {...chartProps}>{axes}<Bar dataKey={metric} name="Training volume" fill="#9fc86a" radius={[5, 5, 0, 0]} maxBarSize={48}/></BarChart> : <LineChart {...chartProps}>{axes}<Line type="linear" dataKey={metric} name="Heaviest weight" stroke="#c4ef79" strokeWidth={2.5} dot={{ r: 4, fill: '#c4ef79', stroke: '#192014', strokeWidth: 2 }} activeDot={{ r: 6 }}/></LineChart>}
    </ResponsiveContainer></div>
    <p className="chart-unit">{volume ? 'kg × reps · one bar per session' : 'kg · one point per session'}</p>
  </section>;
}

export default function WorkoutProgress({ workouts, plans, catalog = [], loading, error, onRetry, onViewPlans }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const options = getExerciseOptions(workouts, plans, catalog);
  const firstLoggedKey = getExerciseOptions(workouts)[0]?.key;
  const exercise = options.find(option => option.key === selectedKey) || options.find(option => option.key === firstLoggedKey) || options[0];
  const invalidRange = Boolean(from && to && from > to);
  const sessions = getExerciseProgress(workouts, exercise?.key, from, to);
  if (loading) return <div className="empty" role="status">Loading your progress…</div>;
  if (error) return <div className="error connection" role="alert"><p>{error}</p><button className="secondary" onClick={onRetry}><RefreshCw size={16}/>Retry</button></div>;
  if (!options.length) return <section className="empty milestone"><span className="empty-icon"><TrendingUp size={30}/></span><h2>Your progress starts with a session.</h2><p>Create a workout plan and log your first workout to start tracking your progress.</p><button className="secondary" onClick={onViewPlans}>View workout plans</button></section>;
  const best = sessions.length ? Math.max(...sessions.map(session => session.heaviestWeight)) : 0;
  const totalVolume = sessions.reduce((sum, session) => sum + session.volume, 0);
  return <div className="progress-page">
    <div className="progress-filters">
      <label>Exercise<select value={exercise.key} onChange={event => setSelectedKey(event.target.value)}>{options.map(option => <option key={option.key} value={option.key}>{option.name}</option>)}</select></label>
      <label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'date-range-error' : undefined}/></label>
      <label>To<input type="date" value={to} onChange={event => setTo(event.target.value)} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'date-range-error' : undefined}/></label>
      <button className="secondary" disabled={!from && !to} onClick={() => { setFrom(''); setTo(''); }}>All dates</button>
    </div>
    {invalidRange ? <p id="date-range-error" role="alert" className="error">The start date must be on or before the end date.</p> : !sessions.length ? <section className="empty"><span className="empty-icon"><TrendingUp size={30}/></span><h2>No sessions for this selection.</h2><p>Log a workout with {exercise.name}, or choose a different exercise or date range.</p><button className="secondary" onClick={onViewPlans}>View workout plans</button></section> : <>
      <section className="stats progress-stats" aria-label="Selected exercise summary">
        <article className="stat"><div>Sessions</div><strong>{sessions.length}</strong><p>In the selected date range</p></article>
        <article className="stat"><div>Heaviest weight</div><strong>{number(best)} <small>kg</small></strong><p>Best recorded set in this range</p></article>
        <article className="stat"><div>Total volume</div><strong>{number(totalVolume)} <small>kg</small></strong><p>Weight × reps, across matching sets</p></article>
      </section>
      {sessions.length === 1 && <p role="status" className="progress-hint">Your first data point is here. Log another session with this exercise to see a trend.</p>}
      <div className="progress-charts"><ProgressChart sessions={sessions} metric="heaviestWeight" title="Heaviest weight" description="Your heaviest recorded set in each session."/><ProgressChart sessions={sessions} metric="volume" title="Training volume" description="The sum of weight × reps in each session."/></div>
      <details className="progress-data"><summary>Session data · {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</summary><div className="table-scroll"><table><caption>{exercise.name} — recorded session values</caption><thead><tr><th scope="col">Completed</th><th scope="col">Workout</th><th scope="col">Sets</th><th scope="col">Heaviest (kg)</th><th scope="col">Volume (kg × reps)</th></tr></thead><tbody>{sessions.map(session => <tr key={session.id}><td><time dateTime={session.completedAt}>{fullDate(session.completedAt)}</time></td><td>{session.planName}</td><td>{session.setCount}</td><td>{number(session.heaviestWeight)}</td><td>{number(session.volume)}</td></tr>)}</tbody></table></div></details>
    </>}
    <p className="progress-note">Charts follow the selected catalog exercise across plans. Skipped exercises do not count toward volume or matching sessions. Dates use your local timezone. Volume uses recorded weight only; a 0 kg bodyweight set contributes 0 kg to volume.</p>
  </div>;
}
