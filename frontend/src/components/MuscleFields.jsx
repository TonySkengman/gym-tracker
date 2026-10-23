export default function MuscleFields({ primary, secondary, onPrimaryChange, onSecondaryChange, disabled }) {
  return <div className="muscle-fields">
    <label>Primary muscles (optional)<input maxLength={350} placeholder="e.g. Chest" value={primary} disabled={disabled} onChange={event => onPrimaryChange(event.target.value)}/></label>
    <label>Secondary muscles (optional)<input maxLength={350} placeholder="e.g. Triceps, Front delts" value={secondary} disabled={disabled} onChange={event => onSecondaryChange(event.target.value)}/></label>
    <p className="muted">Separate multiple muscles with commas.</p>
  </div>;
}
