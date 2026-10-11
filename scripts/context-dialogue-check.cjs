const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react')
const {renderToStaticMarkup}=require('react-dom/server')
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023}}).outputText,file)
const {GAME_EVENTS,dialogueOptions,DialogueSession,affectionBand}=require('../src/dialogue/index.ts')
const {CAT_SPEECH,DOG_SPEECH}=require('../src/dialogue/library.ts')
const {CAT_EXTRA,DOG_EXTRA}=require('../src/dialogue/contextLibrary.ts')
const {CAT_BOND,DOG_BOND}=require('../src/dialogue/context.ts')
const {preparePetPrompt}=require('../src/dialogue/ai.ts')
const {REMINDER_TEMPLATES,INACTIVE_VERIFICATION_TEMPLATES,FUTURE_TEMPLATE_STATUS}=require('../src/dialogue/futureTemplates.ts')
const {PetLine}=require('../src/components/PetLine.tsx')
const {adoptPet}=require('../src/pets/save.ts')
const {OutdoorScene}=require('../src/components/OutdoorScene.tsx')
const optionsCount=bank=>Object.values(bank).flatMap(events=>Object.values(events)).reduce((n,lines)=>n+lines.length,0)
assert.equal(GAME_EVENTS.length,29)
let rendered=0,contexts=0
for(const species of ['cat','dog'])for(const personality of ['playful','sleepy','curious','shy','mischievous']){
 for(const event of GAME_EVENTS){
  const choices=dialogueOptions(species,personality,event)
  assert.ok(choices.length>=2);assert.equal(new Set(choices).size,choices.length)
  assert.ok(choices.every(line=>line.length<=125),'Short event lines: '+event)
  assert.ok(choices.every(line=>species==='cat'?!/woof|arf|bork|dog council/i.test(line):!/meow|mrrp|prrr|mrow|kitten/i.test(line)))
  assert.ok(choices.every(line=>!/outdoor proof accepted|GPS verified|we visited|we went to|indoor photo rejected/i.test(line)))
  const html=renderToStaticMarkup(React.createElement(PetLine,{species,personality,event}))
  assert.ok(html.includes(`data-pet-speech="${event}"`)&&html.includes(`data-speech-personality="${personality}"`));rendered++
  const session=new DialogueSession(),first=session.next(species,personality,event,{},()=>0),second=session.next(species,personality,event,{},()=>0)
  assert.notEqual(first,second,'No immediate repetition')
  if(choices.length>=4){const third=session.next(species,personality,event,{},()=>0),fourth=session.next(species,personality,event,{},()=>0);assert.equal(new Set([first,second,third,fourth]).size,4,'Common events rotate before reuse')}
 }
 for(const phase of ['morning','afternoon','golden-hour','blue-hour','night']){
  const bands=[10,50,90].map(affection=>dialogueOptions(species,personality,'idle',{phase,affection}))
  for(let i=0;i<bands.length;i++){
   assert.ok(bands[i].every(line=>line.length<=150),'Short contextual idle')
   assert.ok(bands[i].every(line=>bands.every((other,j)=>i===j||!other.includes(line))),'Affection bands actually differ')
   const html=renderToStaticMarkup(React.createElement(PetLine,{species,personality,event:'idle',affection:[10,50,90][i],facts:{phase}}))
   assert.ok(html.includes(`data-speech-phase="${phase}"`));assert.ok(html.includes(`data-affection-band="${['new','familiar','bonded'][i]}"`));contexts++
  }
 }
 const profile={id:'pet',name:'Actual Friend',species,affection:90,pet:adoptPet(species,species==='cat'?'orange-tabby':'shiba-inu','orange',personality,'pet')}
 const snapshot=JSON.stringify(profile)
 const records=[{id:'kept',pet:{id:'pet'},status:'completed',completedAt:100,caption:'Actual caption',kind:'outing',photoId:'blob-id',destination:{name:'Planned Park'}},{id:'foreign',pet:{id:'other-pet'},status:'completed',completedAt:200},{id:'pending',pet:{id:'pet'},status:'active',completedAt:null},{id:'deleted',pet:{id:'pet'},status:'completed',completedAt:300,memoryDeleted:true}]
 const prompt=preparePetPrompt(profile,{phase:'night',adventureState:'active'},records)
 assert.equal(prompt.trustedGameContext.breed,profile.pet.breed);assert.equal(prompt.trustedGameContext.affectionBand,'bonded');assert.equal(prompt.trustedGameContext.timeOfDay,'night');assert.equal(prompt.trustedGameContext.adventureState,'active')
 assert.deepEqual(prompt.trustedGameContext.recentMemories.map(r=>r.id),['kept']);assert.equal(prompt.trustedGameContext.recentMemories[0].photoStatus,'unverified');assert.equal(prompt.trustedGameContext.recentMemories[0].plannedDestination,'Planned Park')
 assert.equal(JSON.stringify(profile),snapshot,'No save/progression mutation')
 const outing={pet:{id:'pet',name:'Actual Friend',species,appearance:profile.pet},id:'actual',status:'active',elapsedMs:0,plannedMinutes:5}
 const start=renderToStaticMarkup(React.createElement(OutdoorScene,{profile,outing,justStarted:true}));assert.ok(start.includes('Actual Friend')&&start.includes('data-pet-speech="adventure_start"'))
 const active=renderToStaticMarkup(React.createElement(OutdoorScene,{profile,outing}));assert.ok(active.includes('data-pet-speech="adventure_active"'))
 const early=renderToStaticMarkup(React.createElement(OutdoorScene,{profile,outing:{...outing,status:'returned',elapsedMs:2000}}));assert.ok(early.includes('data-pet-speech="adventure_early_return"'))
 const full=renderToStaticMarkup(React.createElement(OutdoorScene,{profile,outing:{...outing,status:'returned',elapsedMs:300000}}));assert.ok(full.includes('data-pet-speech="adventure_return"'))
}
for(const [value,band] of [[0,'new'],[10,'new'],[30,'new'],[31,'familiar'],[70,'familiar'],[71,'bonded'],[100,'bonded'],[NaN,'new']])assert.equal(affectionBand(value),band)
assert.equal(FUTURE_TEMPLATE_STATUS,'not-connected');assert.equal(Object.keys(REMINDER_TEMPLATES.cat).length,4);assert.equal(Object.keys(INACTIVE_VERIFICATION_TEMPLATES.cat).length,2)
assert.ok(!GAME_EVENTS.some(event=>/reject|reminder|indoor|missing_person/.test(event)),'Inactive templates are not playable events')
for(const folder of ['src/screens','src/components'])for(const file of fs.readdirSync(folder)){if(file.endsWith('.tsx'))assert.ok(!fs.readFileSync(folder+'/'+file,'utf8').includes('futureTemplates'),'No UI activates future reminders/rejections')}
const eventVariations=optionsCount(CAT_SPEECH)+optionsCount(DOG_SPEECH)+optionsCount(CAT_EXTRA)+optionsCount(DOG_EXTRA),bondFragments=optionsCount(CAT_BOND)+optionsCount(DOG_BOND)
console.log(`PASS: ${rendered} rendered event/personality/species cases; ${contexts} rendered time/affection cases; anti-repeat, actual outing states, untouched saves, grounded AI facts and inactive future templates. Library: ${eventVariations} event variations, ${bondFragments} bond fragments, 12 inactive templates.`)
