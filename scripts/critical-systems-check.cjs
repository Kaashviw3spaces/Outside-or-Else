const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict'),path=require('path')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText,f)
function mock(file,exports){const name=require.resolve(file);require.cache[name]={id:name,filename:name,loaded:true,exports}}
let android=true,initialized=0,generated=0,unloaded=0,permissionRequests=0,synced=[],denied=false
const native={isAndroid:()=>android,PetInference:{initialize:async()=>{initialized++;return{loadMs:2}},generate:async()=>{generated++;return{text:'little paws inspect this imaginary scarf. mrrp.',tokens:10,inputTokens:300,generationMs:10,firstTokenMs:1}},unload:async()=>{unloaded++},cancel:async()=>{}},PetReminders:{sync:async({snapshot})=>{synced.push(JSON.parse(snapshot));return{permission:denied?'denied':'granted',scheduled:denied||!JSON.parse(snapshot).prefs.enabled?0:2}},requestPermission:async()=>{permissionRequests++}}}
mock('../src/native/platform.ts',native)
mock('../src/journey/service.ts',{getJourneyData:async()=>({memories:[]})})
mock('../src/ai/talkWorker.ts',{createTalkWorker:()=>{throw new Error('Browser worker must not be created on Android')}})
const values=new Map();global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};global.window={dispatchEvent:()=>{}}
const p=require('../src/notifications/preferences.ts'),{syncReminders,warningEligible}=require('../src/notifications/service.ts')
const {initialState,day}=require('../src/challenge/rules.ts'),{loadTalkBrain,inspectChatSupport}=require('../src/ai/useTalkBrain.ts'),{brainSession}=require('../src/ai/brainSession.ts'),{buildGroundedContext}=require('../src/ai/grounding.ts'),{buildTalkPrompt}=require('../src/ai/talkPrompt.ts')
async function main(){
 assert.equal(p.readReminderPreferences().enabled,false,'OFF default independent of legacy save')
 assert.ok(p.saveReminderPreferences({...p.defaults,enabled:true,time:'18:45'}));assert.equal(p.readReminderPreferences().time,'18:45');assert.equal(p.readReminderPreferences().enabled,true)
 values.set(p.reminderKey,'{broken');assert.deepEqual(p.readReminderPreferences(),p.defaults)
 values.set(p.reminderKey,JSON.stringify({enabled:'yes',time:'29:99'}));assert.deepEqual(p.readReminderPreferences(),p.defaults)
 assert.ok(p.inQuietHours('23:00',p.defaults));assert.ok(p.inQuietHours('00:00',p.defaults));assert.equal(p.inQuietHours('08:00',p.defaults),false);assert.ok(p.inQuietHours('12:00',{...p.defaults,quietStart:'08:00',quietEnd:'08:00'}))
 const set=localStorage.setItem;localStorage.setItem=()=>{throw Error('full')};assert.equal(p.saveReminderPreferences(p.defaults),false);localStorage.setItem=set
 const profile={id:'fixture',name:'Miso',species:'cat',affection:10,activities:[],outingTime:'17:30',duration:10,sound:false,notifications:false}
 const now=new Date(2026,9,11,12).getTime(),zone=Intl.DateTimeFormat().resolvedOptions().timeZone,clock={now,timezone:zone,mono:0,session:'test'},state={...initialState(profile.id,1,clock),enabled:true,graceDate:day(new Date(2026,9,9,12).getTime())}
 assert.ok(warningEligible(state,profile.id,now));for(const patch of [{enabled:false},{paused:true},{safetyReason:'clock changed'},{currentPetId:'other'},{lastQualifyingDate:day(now)},{graceDate:day(now)}])assert.equal(warningEligible({...state,...patch},profile.id,now),false)
 assert.equal(warningEligible(state,profile.id,new Date(2026,9,12,0).getTime()),false,'Local-day warning expires')
 p.saveReminderPreferences({...p.defaults,enabled:true});denied=true;assert.equal((await syncReminders(profile,state)).scheduled,0);assert.equal(permissionRequests,0,'No permission prompt on automatic synchronization')
 denied=false;p.saveReminderPreferences({...p.defaults,enabled:false});await syncReminders(profile,state);assert.equal(synced.at(-1).prefs.enabled,false,'Cancellation snapshot reaches native scheduler')
 android=false;assert.equal((await syncReminders(profile,state)).permission,'unsupported');android=true
 const before=JSON.stringify(profile),context=buildGroundedContext(profile,'afternoon',[],'hello',true,'none');assert.equal((await inspectChatSupport()).cpu,true,'Android skips WebGPU and workers')
 await loadTalkBrain(false,'webgpu');assert.equal(initialized,0);await loadTalkBrain(true,'webgpu');await new Promise(r=>setImmediate(r));assert.equal(brainSession.getSnapshot().state,'ready');assert.equal(initialized,1);await loadTalkBrain(true,'webgpu');assert.equal(initialized,1,'Duplicate guard')
 const result=await brainSession.generate({type:'generate',purpose:'talk',context,messages:buildTalkPrompt(profile,context,'hello',[])});assert.equal(result.accepted,true);assert.equal(generated,1);assert.equal(JSON.stringify(profile),before,'AI cannot mutate saved progression');assert.equal(values.has('outside-or-else:v1'),false,'AI never writes game save')
 brainSession.stop();await new Promise(r=>setImmediate(r));assert.equal(unloaded,1)
 console.log('PASS: reminder preference persistence/corruption/storage error/OFF default, quiet hours, challenge guards/local date expiry, mocked permission denial/cancellation/unsupported routing/no automatic prompts; actual native Talk routing/shared lifecycle/validation/duplicate load/unload and game-state isolation. Transport mocked; no Android delivery or model generation claimed.')
}
main().catch(e=>{brainSession.stop();console.error(e);process.exitCode=1})
