import { useTheme } from '../theme/useTheme'
import { PHASE_LABELS } from '../lib/solar'
import { Icon } from './BottomNavigation'
import { openLocationSettings } from '../lib/location'
function skyTime(date: Date | null) { return date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'No crossing today' }
export function AppearanceSettings() {
  const { appearance, setAppearance, storageAvailable, environment, location, improveLocation, forgetLocation } = useTheme()
  const busy = location.status === 'requesting'
  const events = environment.events
  return <fieldset className="settings-section appearance-section"><legend>Appearance</legend><p className="appearance-description">sun room. moon room. boss gets both.</p><div className="appearance-options">{([{ value: 'light', label: 'Day', icon: 'sun' }, { value: 'dark', label: 'Night', icon: 'moon' }, { value: 'system', label: 'Follow Device', icon: 'settings' }, { value: 'dynamic', label: 'Dynamic — Follow the Sun', icon: 'sun' }] as const).map(option => <label key={option.value} className={`appearance-option ${appearance === option.value ? 'selected' : ''} ${option.value === 'dynamic' ? 'dynamic-option' : ''}`}><input type="radio" name="appearance" value={option.value} checked={appearance === option.value} onChange={() => setAppearance(option.value)} /><Icon name={option.icon} /><span>{option.label}</span></label>)}</div><p className="appearance-status" role="status">{!storageAvailable ? 'Changed for this session. Browser storage is unavailable.' : appearance === 'system' ? 'Following your device. Changes are saved automatically.' : 'Saved automatically. boss approves.'}</p>
    {appearance === 'dynamic' && <div className="dynamic-panel"><div className="dynamic-heading"><Icon name={environment.phase === 'night' ? 'moon' : 'sun'} /><div><strong>Your room follows the sky.</strong><span>{PHASE_LABELS[environment.phase]} · {environment.source === 'solar' ? 'Solar lighting' : 'Approximate lighting'}</span></div></div>
      <p>{environment.source === 'clock' ? 'Sky follows your clock.' : `Using ${location.status === 'cached' ? 'saved ' : ''}approximate coordinates on this device.`}</p>
      {environment.note && environment.source === 'solar' && <p>{environment.note}</p>}
      <p className="location-explanation">Location helps match sunrise and sunset to your sky. Coordinates are rounded and kept on this device. No location is sent to a server.</p>
      <button type="button" className="location-button" disabled={busy} onClick={improveLocation}><Icon name="leaf" />{busy ? 'Finding your sky...' : location.coordinates ? 'Refresh my location' : 'Use my location'}</button>
      {location.coordinates && <button type="button" className="text-button" disabled={busy} onClick={forgetLocation}>Forget saved location & use local time</button>}
      {location.settingsAvailable && <button type="button" className="text-button" onClick={openLocationSettings}>Open Android app settings</button>}
      {location.message && <p className="location-message" role="status">{location.message}{location.coordinates && location.status !== 'ready' ? ' Your saved approximate location is still in use.' : ''}</p>}
      {events && <details className="solar-details"><summary>Today’s sky times</summary><dl>{[['Dawn', skyTime(events.dawn)], ['Sunrise', skyTime(events.sunrise)], ['Morning golden light ends', skyTime(events.goldenHourEnd)], ['Solar noon', skyTime(events.solarNoon)], ['Golden hour', `${skyTime(events.goldenHourStart)} → ${skyTime(events.sunset)}`], ['Sunset', skyTime(events.sunset)], ['Blue hour', `${skyTime(events.blueHour.eveningStart)} → ${skyTime(events.blueHour.eveningEnd)}`], ['Dusk', skyTime(events.dusk)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><small>Times use this device’s local timezone. Blue hour is our civil-twilight palette; the crescent moon remains decorative.</small></details>}
    </div>}
  </fieldset>
}
