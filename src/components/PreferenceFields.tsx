import { ACTIVITIES } from '../types/game'
import type { Activity, Duration } from '../types/game'
import { Icon } from './BottomNavigation'
export function ActivityPicker({ value, onChange }: { value: Activity[]; onChange: (value: Activity[]) => void }) {
  return <div className="activity-grid">{ACTIVITIES.map((a, i) => <button type="button" className={`activity-option ${value.includes(a) ? 'selected' : ''}`} aria-pressed={value.includes(a)} key={a} onClick={() => onChange(value.includes(a) ? value.filter(x => x !== a) : [...value, a])}><Icon name={(['leaf', 'sun', 'adventure', 'memories', 'bowl', 'sun'] as const)[i]} /><span>{a}</span>{value.includes(a) && <Icon name="check" className="selection-check" />}</button>)}</div>
}
export function DurationPicker({ value, onChange }: { value: Duration; onChange: (value: Duration) => void }) {
  return <div className="duration-options" role="group" aria-label="Outing duration">{([5, 10, 15, 30] as const).map(d => <button type="button" key={d} aria-pressed={value === d} className={value === d ? 'selected' : ''} onClick={() => onChange(d)}><strong>{d}</strong><span>minutes</span></button>)}</div>
}
