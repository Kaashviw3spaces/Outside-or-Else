const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react')
const {renderToStaticMarkup}=require('react-dom/server')
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023}}).outputText,file)
const {SPEECH_EVENTS,speechOptions,selectSpeech}=require('../src/pets/dialogue.ts')
const {buildPetSpeechInstructions}=require('../src/pets/speechInstructions.ts')
const {completionSpeechEvent}=require('../src/pets/speechEvents.ts')
const {adoptPet,normalizePet}=require('../src/pets/save.ts')
const {PetLine}=require('../src/components/PetLine.tsx')
const {OutdoorScene}=require('../src/components/OutdoorScene.tsx')
const {Farewell}=require('../src/screens/Farewell.tsx')
let count=0
for(const species of ['cat','dog'])for(const personality of ['playful','sleepy','curious','shy','mischievous']){
 const profile={id:'actual-pet',species,name:'Buddy',affection:10,sound:false,notifications:false,activities:[],outingTime:'17:30',duration:5,pet:adoptPet(species,species==='cat'?'orange-tabby':'shiba-inu','orange',personality,'actual-pet','2026-01-01T10:00:00Z')}
 const record={id:'actual-outing',kind:'outing',status:'active',pet:{id:profile.id,name:profile.name,species,breed:profile.pet.breed,appearance:profile.pet},eligible:false,photoId:null}
 for(const event of SPEECH_EVENTS){
  const options=speechOptions(species,personality,event)
  assert.ok(options.length>=2)
  for(const line of options){
   assert.ok(line.length<=125,`${species} ${personality} ${event}: concise dialogue`)
   assert.ok(!/verified outdoors|GPS verified|you visited|we went to|AI-generated/i.test(line),'No invented visits or verification')
   assert.ok(species==='cat'?!/woof|good dog|tail wag/i.test(line):!/meow|mrrp|prrr|mrow|kitten/i.test(line),'No cross-species voice')
  }
  assert.equal(selectSpeech(species,personality,event,'',()=>0),options[0])
  assert.equal(selectSpeech(species,personality,event,options[0],()=>0),options[1])
  assert.equal(selectSpeech(species,personality,event,'',()=>1),options.at(-1))
  const html=renderToStaticMarkup(React.createElement(PetLine,{species,personality,event}))
  assert.ok(html.includes(`data-pet-speech="${event}"`)&&html.includes(`data-speech-species="${species}"`)&&html.includes(`data-speech-personality="${personality}"`))
  count++
 }
 const active=renderToStaticMarkup(React.createElement(OutdoorScene,{profile,outing:record}))
 assert.ok(active.includes('data-pet-speech="adventure_active"'));assert.ok(!active.includes('data-pet-speech="returning"'))
 const returned=renderToStaticMarkup(React.createElement(OutdoorScene,{profile,outing:{...record,status:'returned'}}))
 assert.ok(returned.includes('data-pet-speech="adventure_return"'));assert.ok(!returned.includes('data-pet-speech="adventure-started"'))
 const farewell=renderToStaticMarkup(React.createElement(Farewell,{profile,onMemories:()=>{},onAdventure:()=>{}}))
 assert.ok(farewell.includes('data-pet-speech="farewell"'));assert.ok(farewell.includes('two full days without a saved, unverified adventure photo'),'Consequences remain factual')
 assert.equal(completionSpeechEvent(record,profile),'memory-saved')
 const earned={...profile,pet:normalizePet({...profile,pet:{...profile.pet,relationshipHistory:[...profile.pet.relationshipHistory,{id:'completion',type:'adventure-completed',date:'2026-01-02T10:00:00Z',adventureId:record.id}]}})}
 assert.equal(completionSpeechEvent({...record,status:'completed',eligible:true},earned),'accessory-unlocked')
 for(const change of [{kind:'manual'},{status:'returned'},{eligible:false},{pet:{...record.pet,id:'other-pet'}},{id:'different-outing'}])assert.equal(completionSpeechEvent({...record,status:'completed',eligible:true,...change},earned),'memory-saved')
 assert.equal(completionSpeechEvent({...record,status:'completed',eligible:true,pet:{...record.pet,appearance:earned.pet}},earned),'memory-saved','Already owned accessories never produce an unlock')
 const otherEarned={...earned,pet:normalizePet({...earned,pet:{...earned.pet,relationshipHistory:[...earned.pet.relationshipHistory,{id:'other-completion',type:'adventure-completed',date:'2026-01-02T11:00:00Z',adventureId:'another-record'}]}})}
 assert.equal(completionSpeechEvent({...record,status:'completed',eligible:true},otherEarned),'memory-saved','Another record already earned the accessory: no invented new unlock')
 const prompt=buildPetSpeechInstructions(species,personality)
 assert.ok(prompt.includes('Personality:')&&prompt.includes('trusted game facts')&&prompt.includes('unverified adventure photos'))
 assert.ok(prompt.includes(species==='cat'?'broken English':'enthusiastic, loyal'))
}
for(const event of SPEECH_EVENTS)for(const species of ['cat','dog'])assert.equal(new Set(['playful','sleepy','curious','shy','mischievous'].map(p=>speechOptions(species,p,event)[0])).size,5,'Distinct personality writing for '+event)
const cats=SPEECH_EVENTS.flatMap(event=>speechOptions('cat','playful',event))
assert.ok(cats.some(line=>/meow|mrrp|prrr|mrow/i.test(line))&&cats.some(line=>!/meow|mrrp|prrr|mrow/i.test(line)),'Sounds are occasional')
console.log(`PASS: ${count} species/personality/event combinations; deterministic variations, no-repeat, rendered scenes/farewell, factual notices, unlock gates and future-model instructions`)
