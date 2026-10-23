import { findCatalogExercise } from '../services/muscles';

export default function ExerciseMuscles({ exercise, catalog }) {
  const item = catalog ? findCatalogExercise(catalog, exercise) : exercise;
  return <div className="exercise-muscles">
    <p><strong>Primary:</strong> {item?.primaryMuscles?.join(', ') || 'Not specified'}</p>
    <p><strong>Secondary:</strong> {item?.secondaryMuscles?.join(', ') || 'None listed'}</p>
  </div>;
}
