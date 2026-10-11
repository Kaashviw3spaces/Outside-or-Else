import { useContext, useEffect, useState } from 'react'
import { ChallengeContext } from '../challenge/ChallengeContext'
import type { Profile } from '../types/game'
import { isAndroid, PetReminders } from '../native/platform'
import { defaults, readReminderPreferences, saveReminderPreferences } from '../notifications/preferences'
import type { ReminderPreferences } from '../notifications/preferences'
import { syncReminders } from '../notifications/service'
export function NotificationSettings({profile}:{profile:Profile}) {
  const [prefs,setPrefs]=useState(readReminderPreferences),[status,setStatus]=useState('Disabled'),[permission,setPermission]=useState('Checking'),[busy,setBusy]=useState(false)
  const challenge=useContext(ChallengeContext)
  useEffect(()=>{let alive=true;if(!isAndroid()){void Promise.resolve().then(()=>{if(alive){setPermission('Unsupported');setStatus('Reminders are available in the Android app.')}});return()=>{alive=false}}
    const refresh=()=>{void PetReminders.status().then(s=>{if(alive){setPermission(s.permission);setStatus(!prefs.enabled?'Disabled':s.permission!=='granted'?'Permission required':s.scheduled?`Scheduled · ${s.scheduled} reminders`:'Enabled · no reminders due')}}).catch(()=>{if(alive)setStatus('Error · could not check reminders')})}
    const error=()=>{if(alive)setStatus('Error · reminders could not be updated. Please reopen the app and try again.')}
    refresh();window.addEventListener('reminders-synced',refresh);window.addEventListener('reminders-error',error);window.addEventListener('focus',refresh)
    return()=>{alive=false;window.removeEventListener('reminders-synced',refresh);window.removeEventListener('reminders-error',error);window.removeEventListener('focus',refresh)}
  },[prefs.enabled])
  async function update(patch:Partial<ReminderPreferences>){setBusy(true);try{
    const next={...prefs,...patch};if(!saveReminderPreferences(next))throw new Error('Could not save reminders. Please try again.')
    setPrefs(next);const result=await syncReminders(profile,challenge?.state??null);setPermission(result.permission)
    setStatus(!isAndroid()?'Unsupported · use the Android app':!next.enabled?'Disabled':result.permission!=='granted'?'Permission required':result.scheduled?`Scheduled · ${result.scheduled} reminders`:'Enabled · no reminders due')
  }catch(e){setStatus(`Error · ${e instanceof Error?e.message:'Could not update reminders'}`)}finally{setBusy(false)}}
  async function allow(){setBusy(true);try{const s=await PetReminders.requestPermission();setPermission(s.permission);if(s.permission==='granted'){const r=await syncReminders(profile,challenge?.state??null);setStatus(r.scheduled?`Scheduled · ${r.scheduled} reminders`:'Enabled · no reminders due')}else setStatus('Permission required · allow reminders in your phone settings.')}catch{setStatus('Error · could not request permission')}finally{setBusy(false)}}
  return <div className="settings-section"><h2>tiny creature nudges</h2><p>Nudges start off. Choose your nudges. Your phone may deliver them late.</p>
    {(['enabled','daily','checkIn','challenge'] as const).map((key,i)=><div className="toggle-row" key={key}><label htmlFor={`reminder-${key}`}><strong>{['Pet reminders','Daily adventure reminder','Pet check-in reminder','Challenge warning'][i]}</strong><span>{['boss has shoe opinions.','Skipped after today’s completed adventure.','daily hello. tiny boss checks human.','Only during an active challenge after one missed day.'][i]}</span></label><input id={`reminder-${key}`} className="toggle" type="checkbox" checked={prefs[key]} disabled={busy} onChange={e=>void update({[key]:e.target.checked})}/></div>)}
    <label htmlFor="reminder-time">Reminder time</label><input id="reminder-time" type="time" value={prefs.time} disabled={busy} onChange={e=>void update({time:e.target.value||defaults.time})}/>
    <div className="toggle-row"><label htmlFor="reminder-quiet"><strong>Quiet hours</strong><span>No nudges during your rest. Matching start and end means quiet all day.</span></label><input id="reminder-quiet" className="toggle" type="checkbox" checked={prefs.quiet} disabled={busy} onChange={e=>void update({quiet:e.target.checked})}/></div>
    <label htmlFor="quiet-start">Quiet from</label><input id="quiet-start" type="time" value={prefs.quietStart} disabled={busy} onChange={e=>void update({quietStart:e.target.value||defaults.quietStart})}/><label htmlFor="quiet-end">Quiet until</label><input id="quiet-end" type="time" value={prefs.quietEnd} disabled={busy} onChange={e=>void update({quietEnd:e.target.value||defaults.quietEnd})}/>
    <p>Permission: {permission}</p><p role="status">{status}</p><button type="button" className="text-button" disabled={busy||!isAndroid()} onClick={()=>void allow()}>Allow reminders</button>{' '}
    <button type="button" className="text-button" disabled={busy||!isAndroid()||permission!=='granted'||!prefs.enabled} onClick={()=>{void PetReminders.test().then(()=>setStatus('Test sent to your phone’s notification tray.')).catch(()=>setStatus('Error · test could not be sent. Check permission and quiet hours.'))}}>Test notification</button>{' '}
    <button type="button" className="text-button" disabled={busy} onClick={()=>void update({enabled:false})}>Disable all reminders</button></div>
}
