import type { Page } from '../types/game'
export type IconName = Page | 'heart' | 'bowl' | 'sun' | 'leaf' | 'arrow' | 'moon' | 'check' | 'clock' | 'spark' | 'paw' | 'talk' | 'close'
const paths: Record<IconName, string> = {
  talk: 'M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5',
  close: 'm6 6 12 12M6 18 18 6',
  home: 'M3 11 12 3l9 8M5 9v12h5v-7h4v7h5V9',
  adventure: 'm12 3 9 18H3L12 3Zm0 0v18M7 13h10',
  memories: 'M5 4h14v17H5zM8 8h8v7H8zM8 18h5m-6-3 3-3 3 3',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
  heart: 'M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z',
  bowl: 'M3 12h18c0 6-4 9-9 9s-9-3-9-9ZM7 8V5m5 3V3m5 5V5',
  sun: 'M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  leaf: 'M20 3C7 1 1 10 7 17s16-1 13-14ZM4 21 16 9',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  moon: 'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
  paw: 'M8 15c2-5 6-5 8 0 5 6-13 6-8 0ZM5 6a2 3 0 1 0 0 6 2 3 0 0 0 0-6ZM10 2a2 3 0 1 0 0 6 2 3 0 0 0 0-6ZM16 3a2 3 0 1 0 0 6 2 3 0 0 0 0-6ZM21 8a2 3 0 1 0 0 6 2 3 0 0 0 0-6Z',
}
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function BottomNavigation({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  const labels: Record<Page, string> = { home: 'nest', adventure: 'outside', memories: 'brain folder', settings: 'knobs' }
  const pages: Page[] = ['home', 'adventure', 'memories', 'settings']
  return <nav className="bottom-nav" aria-label="Main navigation">{pages.map(p => <button key={p} type="button" aria-label={p} className={page === p ? 'nav-item active' : 'nav-item'} aria-current={page === p ? 'page' : undefined} onClick={() => onChange(p)}><Icon name={p} /><span>{labels[p]}</span></button>)}</nav>
}
