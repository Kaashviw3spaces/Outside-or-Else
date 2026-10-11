import { loveStage } from '../lib/storage'
import { Icon } from './BottomNavigation'
export function LoveMeter({ value }: { value: number }) {
  return <div className="love-meter"><div className="love-label"><span><Icon name="heart" /> {loveStage(value)} bond</span><strong>{value}%</strong></div><div className="love-track" role="progressbar" aria-label="Love" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div style={{ width: `${value}%` }} /></div></div>
}
