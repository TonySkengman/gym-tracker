import { Trophy } from 'lucide-react';
import { getPersonalRecords } from '../services/records';

export const recordLabel = record => record.kind === 'heaviest' ? 'Heaviest set' : `Best ${record.reps} ${record.reps === 1 ? 'rep' : 'reps'}`;
export const recordNumber = value => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

export default function PersonalRecords({ workouts, exerciseKey, onViewWorkout }) {
  const records = getPersonalRecords(workouts, exerciseKey);
  return <section className="personal-records" aria-labelledby="personal-records-title">
    <div className="section-heading"><h2 id="personal-records-title"><Trophy size={19} className="accent"/>Personal records</h2><span className="muted">All time</span></div>
    <p className="muted">Heaviest recorded set and best weight at each exact rep count. Date filters apply to the charts below.</p>
    {!records.length ? <p className="progress-note">Complete a session with this exercise to establish your first records.</p> : <div className="table-scroll"><table className="records-table"><caption className="sr-only">All-time personal records for the selected exercise</caption><thead><tr><th scope="col">Record</th><th scope="col">Set</th><th scope="col">Achieved</th></tr></thead><tbody>{records.map(record => <tr key={record.key}><th scope="row">{recordLabel(record)}</th><td>{recordNumber(record.weight)} kg × {record.reps}</td><td><button type="button" className="record-workout-link" onClick={() => onViewWorkout(record.workoutId)} aria-label={`View ${recordLabel(record)} workout: ${record.planName}, ${new Date(record.completedAt).toLocaleDateString()}`}><time dateTime={record.completedAt}>{new Date(record.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time><span className="muted">{record.planName}</span></button></td></tr>)}</tbody></table></div>}
    <p className="progress-note">Ties keep the earliest achievement. Zero kg means no added weight. Records use recorded load, without estimating bodyweight or one-rep max.</p>
  </section>;
}
