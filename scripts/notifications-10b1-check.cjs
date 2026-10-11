const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText,f);
const baseline=JSON.parse(fs.readFileSync('artifacts/checkpoint-10b1/source-before.json','utf8'));
// Checkpoint 10A/10C's confirmed wall-clock reward fix is tested separately.
const allowed=new Set(['src/ai/talkFacts.ts','src/journey/types.ts','src/journey/rewards.ts','src/journey/service.ts','src/journey/useJourney.ts','src/screens/Adventure.tsx','android/app/src/main/java/com/outsideorelse/game/MainActivity.java','src/notifications/service.ts','android/app/src/main/java/com/outsideorelse/game/ReminderScheduler.java']);
for(const [name,hash] of Object.entries(baseline))if(!allowed.has(name))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex'),hash,'Unchanged: '+name);
const javaRoot='android/app/src/main/java/com/outsideorelse/game/';
const old=fs.readFileSync('artifacts/checkpoint-10b1/ReminderScheduler.java.before','utf8').replace(/\r\n/g,'\n'),current=fs.readFileSync(javaRoot+'ReminderScheduler.java','utf8').replace(/\r\n/g,'\n');
assert.equal(current.split('            ReminderCopy.Category category=')[0],old.split('            String name=s.optString')[0],'All scheduling, quiet hours, category gates and duplicate prevention unchanged');
assert.equal(current.slice(current.indexOf('    static void show(')),old.slice(old.indexOf('    static void show(')),'Channel, IDs, BigText, presentation and tap intent unchanged');
assert.ok(current.includes('show(context,id,copy.title(),copy.body());context.getSharedPreferences("pet-reminders",0).edit().putString(key,date).commit();'));
assert.ok(current.includes('if(!allowed(c)||p==null||!p.optBoolean("enabled")||quiet(p,LocalTime.now()))throw new Exception("Reminders need permission, must be enabled, and respect quiet hours.");'),'Test permission/master/quiet gate preserved');
const copy=fs.readFileSync(javaRoot+'ReminderCopy.java','utf8');assert.doesNotMatch(copy,/import android|https?:|PetInference|brainSession|HttpURLConnection|AlarmManager|NotificationManager/,'Pure local templates only');
assert.ok(copy.includes('enum Category { DAILY, CHECKIN, CHALLENGE, TEST }'),'Only existing categories');
const values=new Map(),calls=[];global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
global.fetch=()=>{throw Error('No network permitted');};
function mock(file,exports){const name=require.resolve(file);require.cache[name]={id:name,filename:name,loaded:true,exports};}
mock('../src/native/platform.ts',{isAndroid:()=>true,PetReminders:{sync:async payload=>{calls.push(JSON.parse(payload.snapshot));return{permission:'granted',scheduled:2};}},PetInference:{initialize:()=>{throw Error('No AI permitted');}}});
let memories=[];mock('../src/journey/service.ts',{getJourneyData:async()=>({memories})});
const prefs=require('../src/notifications/preferences.ts'),{syncReminders}=require('../src/notifications/service.ts'),{day}=require('../src/challenge/rules.ts');
(async()=>{
 prefs.saveReminderPreferences({...prefs.defaults,enabled:true,time:'19:55',quiet:true,quietStart:'21:00',quietEnd:'08:00'});
 const savedPreferences=values.get(prefs.reminderKey);
 for(const species of ['cat','dog'])for(const personality of ['playful','sleepy','curious','shy','mischievous']) {
  const profile={id:'saved-id',name:'Actual Saved Pet',species,pet:{personality}},before=JSON.stringify(profile);
  await syncReminders(profile,null);const snapshot=calls.at(-1);assert.equal(snapshot.name,profile.name);assert.equal(snapshot.species,species);assert.equal(snapshot.personality,personality);assert.equal(snapshot.completedToday,false);assert.equal(snapshot.date,day(Date.now()));assert.equal(JSON.stringify(profile),before);assert.equal(values.get(prefs.reminderKey),savedPreferences);
 }
 const legacy={id:'legacy',name:'Legacy',species:'cat'};await syncReminders(legacy,null);assert.equal(calls.at(-1).personality,'shy');
 memories=[{kind:'outing',status:'completed',completedAt:Date.now(),memoryDeleted:false}];await syncReminders(legacy,null);assert.equal(calls.at(-1).completedToday,true);
 memories=[{kind:'manual',status:'completed',completedAt:Date.now(),memoryDeleted:false}];await syncReminders(legacy,null);assert.equal(calls.at(-1).completedToday,false);
 await syncReminders(null,null);assert.equal(calls.at(-1).petId,null);assert.equal(values.get(prefs.reminderKey),savedPreferences);
 console.log('PASS: saved pet name/species/personality/completion metadata, untouched profiles/preferences, exact scheduling/quiet/duplicate/channel preservation, existing categories, no network or AI, unchanged fonts/name/icon and notification timing sources.');
})().catch(e=>{console.error(e);process.exitCode=1;});
