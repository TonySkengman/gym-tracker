import ExerciseMuscles from './ExerciseMuscles';
import PlanMuscleMap from './PlanMuscleMap';
import { completedWorkoutExercises } from '../services/workouts';

export default function CompletedWorkoutResults({ workout, catalog }) {
  const exercises = completedWorkoutExercises(workout);
  const performed = exercises.filter(exercise => !exercise.skipped);
  const duration = Math.max(1, Math.round((new Date(workout.completedAt) - new Date(workout.startedAt)) / 60000));
  return <>
    <p className="completed-workout-date">Completed <time dateTime={workout.completedAt}>{new Date(workout.completedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time> · {duration} min</p>
    <div className="plan-details-layout">
      <section className="plan-exercises-panel" aria-label="Completed workout results">
        <div className="section-heading"><h3>Recorded exercises</h3><span className="muted">{workout.sets.length} sets</span></div>
        <div className="completed-exercise-list">{exercises.map(exercise => <section className="completed-exercise" key={exercise.exerciseNumber}>
          <h4>{exercise.name}</h4>
          <ExerciseMuscles exercise={exercise} catalog={catalog}/>
          {exercise.skipped ? <p className="skipped-note">Skipped — no sets recorded.</p> : <div className="table-scroll">
            <table className="plan-detail-table completed-set-table"><caption className="sr-only">Recorded sets for {exercise.name}, exercise {exercise.exerciseNumber}</caption>
              <thead><tr><th scope="col">Set</th><th scope="col">Weight (kg)</th><th scope="col">Reps</th></tr></thead>
              <tbody>{exercise.sets.map(set => <tr key={set.setNumber}><th scope="row">{set.setNumber}</th><td>{set.weight}</td><td>{set.reps}</td></tr>)}</tbody>
            </table>
          </div>}
        </section>)}</div>
        <p className="progress-note">These are your recorded results for this session. Updates in History appear here too.</p>
      </section>
      <PlanMuscleMap completed plan={{ exercises: performed }} catalog={catalog}/>
    </div>
  </>;
}
