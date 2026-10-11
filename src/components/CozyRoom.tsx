import { useContext, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { SkyLights } from './SkyLights'
import { ThemeContext } from '../theme/ThemeContext'
import { DEFAULT_ENVIRONMENT } from '../theme/resolveEnvironment'
export function CozyRoom({ children, immersive = false, conversation = false, conversationReserve = 0 }: { children: ReactNode; immersive?: boolean; conversation?: boolean; conversationReserve?: number }) {
  const id = useId().replace(/:/g, '')
  const room = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 480, height: 450 })
  useLayoutEffect(() => {
    if (!immersive || !room.current) return
    const element = room.current
    const measure = () => { const { width, height } = element.getBoundingClientRect(); if (width && height) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height }) }
    measure()
    if (typeof ResizeObserver !== 'undefined') { const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect() }
    window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure)
  }, [immersive])
  const resolved = useContext(ThemeContext)?.resolvedEnvironment ?? DEFAULT_ENVIRONMENT
  const { visibility } = resolved
  const scale = 480 / size.width
  const height = immersive ? size.height * scale : 450
  // Reserve the lower HUD before placing the bed/pet; the SVG itself always fills the scene.
  const compact = conversation && size.height < 500
  const reserve = conversation && conversationReserve ? conversationReserve + (compact ? 8 : 92) : compact ? 138 : conversation ? 232 : 198
  const petPixels = Math.min(size.width * .64, Math.max(100, (size.height - (conversation ? Math.max(compact ? 208 : 200, reserve + 82) : 200)) * .92))
  const floorPixels = Math.min(size.height * (conversation ? .56 : .62), size.height - reserve - petPixels * .34375 - 8)
  const floor = immersive ? Math.max(0, floorPixels) * scale : 319
  const floorShift = floor - 319
  const windowShift = immersive ? (compact ? 54 : Math.max(104, Math.min(size.height * .17, 140))) * scale - 34 : 0
  const windowScale = compact ? .58 : 1
  const bedScale = immersive ? petPixels / (size.width * .64) : 1
  const shelfShift = immersive ? windowShift : 0
  const pictureShift = immersive ? (compact ? 75 * scale - 175 : floorShift - 35) : 0
  const move = (y: number) => ({ transform: `translateY(${y}px)` })
  const style = immersive ? { '--room-floor-y': `${floor / scale}px`, '--pet-scene-size': `${petPixels}px` } as CSSProperties : undefined
  return <div ref={room} className={`cozy-room${immersive ? ' immersive-room' : ''}${compact ? ' compact-room' : ''}`} style={style} data-room-theme={resolved.theme} data-room-phase={resolved.phase}><svg className="room-art" viewBox={`0 0 480 ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop data-room-color="wall" stopColor="var(--wall-top)" /><stop offset="1" stopColor="var(--wall-bottom)" /></linearGradient>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop data-room-color="sky" stopColor="var(--sky-top)" /><stop offset="1" stopColor="var(--sky-bottom)" /></linearGradient>
      <radialGradient id={`${id}-bed-light`}><stop stopColor="#FFD9A3" stopOpacity=".25" /><stop offset="1" stopColor="#FFD9A3" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-lavender`}><stop stopColor="#8C83B5" stopOpacity=".18" /><stop offset="1" stopColor="#8C83B5" stopOpacity="0" /></radialGradient>
      <clipPath id={`${id}-window`}><rect x="72" y="40" width="136" height="164" rx="60" /></clipPath>
    </defs>
    <rect width="480" height={height} fill={`url(#${id}-wall)`} />
    <g className="room-fixture" style={move(floorShift)}><rect data-room-color="floor" y="319" width="480" height={height} fill="var(--floor)" /><path d="M0 319h480" stroke="var(--floor-line)" strokeWidth="3" /><path d={`M55 ${height - floorShift} 180 320m175 ${height - floorShift - 320}-55-${height - floorShift - 320}M0 377h480`} stroke="var(--floor-line)" opacity=".3" strokeWidth="2" /></g>
    <path className="window-light" d={`M162 ${108 + windowShift} 322 ${85 + windowShift} 465 ${328 + floorShift} 267 ${382 + floorShift}Z`} fill="var(--window-light)" opacity=".2" />
    <ellipse style={{ opacity: visibility.nightGlow }} className="night-scenery" cx="365" cy={257 + pictureShift} rx="200" ry="140" fill={`url(#${id}-lavender)`} />
    <g className="room-fixture" style={move(windowShift)}><g transform={`translate(65 34) scale(${windowScale}) translate(-65 -34)`}><rect x="65" y="34" width="150" height="178" rx="65" fill="var(--wood)" />
    <g clipPath={`url(#${id}-window)`}><rect x="72" y="40" width="136" height="164" rx="60" fill={`url(#${id}-sky)`} />
      <SkyLights x={167} y={84} radius={22} stars={[[94, 82], [125, 58], [188, 118], [104, 153], [169, 153]]} />
      <path d="M73 173q45-48 72-13 23-41 62 0v44H73Z" fill="var(--distant-hill)" />
    </g><path d="M140 40v164M72 126h136" stroke="var(--window-frame)" strokeWidth="7" /><rect x="55" y="205" width="170" height="12" rx="6" fill="var(--wood)" /></g></g>
    <g className="room-fixture" style={move(shelfShift)}><path d="M327 113h87v7h-87z" fill="var(--wood)" /><path d="M346 113V80q-24-11-15-29 23 2 15 29 5-37 27-33 9 22-27 34" fill="var(--plant-light)" /><path d="M333 96h29l-5 18h-18Z" fill="var(--terracotta)" /><rect x="380" y="80" width="10" height="33" rx="2" fill="var(--book-blue)" /><rect x="392" y="86" width="9" height="27" rx="2" fill="var(--book-gold)" /></g>
    <g className="room-fixture" style={move(pictureShift)}><rect x="306" y="175" width="49" height="59" rx="4" fill="var(--wood)" transform="rotate(-5 330 205)" /><rect x="312" y="181" width="37" height="47" rx="2" fill="var(--picture-paper)" transform="rotate(-5 330 205)" /><path d="m320 216 10-16 13 16" fill="var(--plant-light)" /><circle cx="338" cy="190" r="5" fill="var(--book-gold)" /></g>
    <g className="room-fixture" style={move(floorShift)}><g transform={`translate(244 319) scale(${bedScale}) translate(-244 -319)`}><ellipse cx="244" cy="380" rx="150" ry="34" fill="var(--room-shadow)" opacity=".4" /><ellipse cx="244" cy="373" rx="139" ry="31" fill="var(--bed-edge)" /><ellipse cx="244" cy="371" rx="117" ry="23" fill="var(--bed)" />
    <ellipse className="night-scenery" cx="244" cy="362" rx="156" ry="90" fill={`url(#${id}-bed-light)`} /></g>
    <path d="M40 319v-80m0 38q-32-9-23-31 30 0 23 31m0-5q34-17 37-43-32 3-37 43m0-6q-5-40-25-53-14 29 25 53" fill="var(--plant)" stroke="var(--plant)" strokeWidth="3" /><path d="M19 305h45l-8 40H27Z" fill="var(--terracotta)" /><path d="M14 305h54v8H14Z" fill="var(--pot-rim)" />
    <g style={{ opacity: visibility.fireflies }} aria-hidden={visibility.fireflies === 0} className="night-scenery fireflies" fill="#F6DF9E">{[[84, 254], [378, 265], [342, 330]].map(([x, y], i) => <g key={x} className="firefly" style={{ animationDelay: `${i * -2.7}s` }}><circle cx={x} cy={y} r="6" opacity=".12" /><circle cx={x} cy={y} r="1.8" /></g>)}</g></g>
  </svg>{children}</div>
}
