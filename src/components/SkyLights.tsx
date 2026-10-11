import { useContext } from 'react'
import { ThemeContext } from '../theme/ThemeContext'
import { DEFAULT_ENVIRONMENT } from '../theme/resolveEnvironment'
interface Props { x: number; y: number; radius: number; stars: readonly (readonly [number, number])[] }
// Keep both layers mounted for crossfades, but resolve visibility from the selected mode.
export function SkyLights({ x, y, radius, stars }: Props) {
  const { visibility } = useContext(ThemeContext)?.resolvedEnvironment ?? DEFAULT_ENVIRONMENT
  return <>
    <g className="day-scenery" data-scenery="day" style={{ opacity: visibility.sun }} aria-hidden={visibility.sun === 0}><g className="sun-rays" transform={`translate(${x} ${y})`}>{[0, 45, 90, 135, 180, 225, 270, 315].map(angle => <path key={angle} transform={`rotate(${angle})`} d={`M0 ${-radius - 5}v-6`} stroke="var(--sun)" strokeWidth="2" strokeLinecap="round" />)}</g><circle data-sky-object="sun" cx={x} cy={y} r={radius} fill="var(--sun)" /><path d={`M${x - radius * 3.6} ${y + radius * 1.6}q8-9 17-3 5-15 18-6 10-5 14 9Z`} fill="var(--cloud)" opacity=".8" /></g>
    <g className="night-scenery" data-scenery="night" style={{ opacity: 1 }} aria-hidden={visibility.moon === 0 && visibility.stars === 0}>
      <g className="moon-scenery" data-sky-object="moon" style={{ opacity: visibility.moon }} aria-hidden={visibility.moon === 0} transform={`translate(${x} ${y}) scale(${radius / 22})`}><path d="M9-20A22 22 0 1 0 20 8 19 19 0 0 1 9-20Z" fill="var(--moon)" /></g>
      <g className="star-scenery" data-sky-object="stars" style={{ opacity: visibility.stars }} aria-hidden={visibility.stars === 0}>{stars.map(([sx, sy], i) => <g key={`${sx}-${sy}`} className="twinkle-star" style={{ animationDelay: `${i * -1.3}s` }}><path d={`M${sx} ${sy - 3}v6m-3-3h6`} stroke="var(--moon)" strokeWidth="1.4" strokeLinecap="round" /><circle cx={sx} cy={sy} r=".8" fill="var(--cloud)" /></g>)}</g>
    </g>
  </>
}
