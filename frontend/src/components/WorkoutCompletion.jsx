import { useEffect, useRef } from 'react';
import { Check, Trophy, X } from 'lucide-react';
import { recordLabel, recordNumber } from './PersonalRecords';

export default function WorkoutCompletion({ workout, records, onClose, onViewWorkout, onProgress, guest }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  const duration = Math.max(1, Math.round((Date.parse(workout.completedAt) - Date.parse(workout.startedAt)) / 60000));
  return <dialog ref={dialog} className="workout-completion" aria-labelledby="completion-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="flex justify-between items-start gap-4"><div><p className="eyebrow">WORKOUT COMPLETE</p><h2 id="completion-title">{records?.some(record => record.previous) ? 'Stronger than last time.' : 'Another session in the books.'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close workout summary"><X size={20}/></button></div>
    <p className="muted">{workout.planName} · {duration} min · {workout.sets.length} sets</p>
    {records === null ? <p className="progress-note">Workout saved. Record comparison is unavailable because History could not be loaded. Retry from Progress to see your records.</p> : records.length ? <div className="completion-records">{records.map(record => <article className="completion-record" key={record.key}><div className="flex items-center gap-2 accent"><Trophy size={17}/><span>{record.previous ? 'New personal record' : 'First record'} · {recordLabel(record)}</span></div><h3>{record.exerciseName}</h3><p className="record-value">{recordNumber(record.weight)} kg <span>× {record.reps} reps</span></p>{record.previous ? <><p className="accent">+{recordNumber(Math.round((record.weight - record.previous.weight) * 100) / 100)} kg</p><p className="muted">Previous best: {recordNumber(record.previous.weight)} kg × {record.previous.reps} · {new Date(record.previous.completedAt).toLocaleDateString()}</p></> : <p className="muted">Your starting benchmark for this record.</p>}<p className="muted">Exercise {record.exerciseNumber} · Set {record.setNumber}</p></article>)}</div> : <p className="progress-note"><Check size={16}/>Workout completed. No new records this session—every workout counts.</p>}
    {guest && <p className="progress-note">Guest records last for this visit only. Log in to save future workouts.</p>}
    <div className="editor-footer"><button type="button" className="secondary" onClick={onClose}>Done</button><button type="button" className="secondary" onClick={onProgress}>View Progress</button><button type="button" className="primary" onClick={onViewWorkout}>View workout</button></div>
  </dialog>;
}
