import { useId } from 'react';
import { planMuscleSummary } from '../services/muscles';

const front = [
  ['upper-chest', 'Upper chest', 'M73 77 Q86 73 98 78 L98 88 Q84 89 71 85 Z'],
  ['chest', 'Chest', 'M71 89 Q85 93 98 91 L98 112 Q83 119 70 107 Z'],
  ['front-delts', 'Front delts', 'M67 69 Q54 74 53 96 L64 102 Q71 92 70 78 Z'],
  ['side-delts', 'Side delts', 'M54 80 Q47 88 47 102 L52 108 L57 98 Z'],
  ['biceps', 'Biceps / brachialis', 'M54 107 Q47 112 45 130 L48 142 Q58 137 60 115 Z'],
  ['triceps', 'Triceps', 'M45 107 L40 127 L43 141 L47 132 L49 110 Z'],
  ['forearms', 'Forearms / brachioradialis', 'M43 148 Q35 159 31 182 L38 186 Q47 171 48 150 Z'],
  ['obliques', 'Obliques', 'M72 117 L81 125 L82 174 L74 184 L69 162 Z'],
  ['adductors', 'Adductors', 'M90 211 L98 219 L92 259 L86 277 L84 246 Z'],
  ['quads', 'Quads', 'M69 211 Q78 208 84 219 L84 249 L88 276 L82 299 L70 297 L66 270 Z'],
];
const back = [
  ['traps', 'Traps', 'M92 58 L98 70 L98 111 L78 88 L68 75 Z'],
  ['rear-delts', 'Rear delts', 'M67 73 Q53 76 51 99 L64 105 L73 89 Z'],
  ['side-delts', 'Side delts', 'M53 83 Q47 89 47 103 L52 108 L57 98 Z'],
  ['rotator-cuff', 'Rotator cuff', 'M75 92 L88 103 L82 113 L70 105 Z'],
  ['teres-major', 'Teres major', 'M68 108 L81 115 L78 125 L66 117 Z'],
  ['mid-back', 'Mid-back', 'M91 104 L98 116 L98 139 L83 121 Z'],
  ['lats', 'Lats', 'M67 121 L79 129 L90 144 L88 172 L77 181 L70 162 Z'],
  ['lower-back', 'Spinal erectors', 'M92 145 L98 142 L98 188 L89 188 Z'],
  ['triceps', 'Triceps', 'M53 107 Q45 111 42 132 L47 145 Q56 138 59 116 Z'],
  ['forearms', 'Forearms / brachioradialis', 'M43 150 Q35 162 31 183 L38 186 Q46 174 48 151 Z'],
  ['glutes', 'Glutes', 'M75 187 Q85 182 98 193 L98 220 Q84 234 68 220 L68 207 Z'],
  ['hamstrings', 'Hamstrings', 'M69 230 Q83 238 96 228 L91 266 L84 298 L71 297 L66 270 Z'],
  ['adductors', 'Adductors', 'M94 234 L98 233 L93 267 L87 286 L87 270 Z'],
  ['calves', 'Calves', 'M70 319 Q81 312 85 329 L82 357 L74 379 L68 365 L66 343 Z'],
];

function Body({ view, regions, completed }) {
  const titleId = useId();
  const shapes = view === 'Front' ? front : back;
  function muscle(key, name, path, mirrored = false) {
    const status = regions[key];
    return <path key={`${key}-${mirrored}`} d={path} transform={mirrored ? 'translate(200 0) scale(-1 1)' : undefined}
      className={`body-muscle ${status || 'inactive'}`}><title>{`${name}: ${status ? `${status} muscle` : 'not highlighted'}`}</title></path>;
  }
  return <figure className="body-view"><svg viewBox="0 0 200 440" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{`${view} view of muscles trained ${completed ? 'in this completed workout' : 'by this workout plan'}`}</title>
    <g className="body-outline">
      <ellipse cx="100" cy="27" rx="16" ry="21"/>
      <path d="M92 46 L108 46 L110 58 L130 65 Q143 68 148 83 L157 116 L166 146 L176 183 L178 195 L174 204 L169 205 L165 194 L163 186 L152 164 L141 137 L134 115 L130 143 L132 164 L139 192 L137 220 L136 265 L132 300 L132 321 L135 352 L130 381 L132 405 L143 419 Q144 424 138 425 L116 425 Q110 423 112 416 L113 397 L109 369 L109 341 L105 314 L100 269 L95 314 L91 341 L91 369 L87 397 L88 416 Q90 423 84 425 L62 425 Q56 424 57 419 L68 405 L70 381 L65 352 L68 321 L68 300 L64 265 L63 220 L61 192 L68 164 L70 143 L66 115 L59 137 L48 164 L37 186 L35 194 L31 205 L26 204 L22 195 L24 183 L34 146 L43 116 L52 83 Q57 68 70 65 L90 58 Z"/>
    </g>
    {shapes.map(([key, name, path]) => <g key={key}>{muscle(key, name, path)}{muscle(key, name, path, true)}</g>)}
    {view === 'Front' && <g>{[0, 1, 2].map(row => <g key={row}>
      {muscle('abs', 'Abs', `M85 ${122 + row * 17} L98 ${122 + row * 17} L98 ${135 + row * 17} L85 ${135 + row * 17} Z`)}
      {muscle('abs', 'Abs', `M85 ${122 + row * 17} L98 ${122 + row * 17} L98 ${135 + row * 17} L85 ${135 + row * 17} Z`, true)}
    </g>)}</g>}
    <g className="body-detail"><path d="M100 192 L100 233 M71 308 L84 308 M116 308 L129 308"/>{view === 'Back' && <path d="M100 64 L100 185"/>}</g>
  </svg><figcaption>{view}</figcaption></figure>;
}

export default function PlanMuscleMap({ plan, catalog, completed = false }) {
  const summary = planMuscleSummary(plan, catalog);
  return <section className="plan-muscle-map" aria-label={completed ? 'Muscles trained in this completed workout' : 'Muscles trained by this plan'}>
    <div className="section-heading"><h3>Muscles worked</h3><span className="muted">{completed ? 'Completed session' : 'Whole plan'}</span></div>
    <div className="body-views"><Body view="Front" regions={summary.regions} completed={completed}/><Body view="Back" regions={summary.regions} completed={completed}/></div>
    <div className="muscle-map-legend"><span><i className="primary-dot"/>Primary</span><span><i className="secondary-dot"/>Secondary</span><span><i className="inactive-dot"/>Not highlighted</span></div>
    <div className="plan-muscle-groups"><div><h4>Primary muscles</h4><p>{summary.primary.join(', ') || 'Not specified'}</p></div><div><h4>Secondary muscles</h4><p>{summary.secondary.join(', ') || 'None listed'}</p></div></div>
    {summary.unspecified > 0 && <p className="progress-note">{summary.unspecified} {summary.unspecified === 1 ? 'exercise has' : 'exercises have'} no muscle labels yet and {summary.unspecified === 1 ? 'is' : 'are'} not included in the highlights.</p>}
    {summary.unmapped.length > 0 && <p className="progress-note">Listed but not mapped on the diagram: {summary.unmapped.join(', ')}.</p>}
    <p className="progress-note">Simplified surface diagram, not an intensity score. Small muscles share nearby regions. Primary takes priority when exercises train the same area in different roles.</p>
  </section>;
}
