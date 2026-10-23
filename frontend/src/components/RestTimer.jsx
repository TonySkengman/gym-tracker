import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { changeRestTimer, formatRestTime, isRestTimer, remainingRestMs } from '../services/restTimer';

export default function RestTimer({ timer, onChange, disabled }) {
  const [now, setNow] = useState(Date.now);
  const valid = isRestTimer(timer);
  const deadline = valid ? timer.endsAt : null;
  useEffect(() => {
    setNow(Date.now());
    if (deadline === null) return;
    // Use the wall clock so background tabs, minimization and sleep do not delay rest.
    const update = () => {
      const time = Date.now(); setNow(time);
      if (time >= deadline) clearInterval(interval);
    };
    const interval = setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', update); };
  }, [deadline]);
  if (!valid) return null;
  const remaining = remainingRestMs(timer, now);
  const complete = remaining === 0;
  const running = deadline !== null && !complete;
  return <section className={`rest-timer ${complete ? 'rest-complete' : ''}`} aria-label="Rest timer">
    <div className="rest-timer-heading"><Timer size={18}/><div><h3>Rest between sets</h3><p>{timer.exerciseName}</p></div></div>
    <div className="rest-timer-clock" role="timer" aria-live="off" aria-label={`${formatRestTime(remaining)} remaining`}>{formatRestTime(remaining)}</div>
    <p className="rest-timer-status" role="status">{complete ? 'Rest complete — ready for your next set.' : running ? 'Rest timer running' : 'Rest timer paused'}</p>
    <div className="rest-timer-controls">
      <button type="button" className="secondary" disabled={disabled || complete} onClick={() => onChange(changeRestTimer(timer, running ? 'pause' : 'resume'))}>{running ? <Pause size={14}/> : <Play size={14}/>} {running ? 'Pause' : 'Start / Resume'}</button>
      <button type="button" className="secondary" disabled={disabled} onClick={() => onChange(changeRestTimer(timer, 'reset'))}><RotateCcw size={14}/>Reset</button>
      <button type="button" className="text-button" disabled={disabled} onClick={() => onChange(null)}><SkipForward size={14}/>{complete ? 'Dismiss' : 'Skip rest'}</button>
    </div>
  </section>;
}
