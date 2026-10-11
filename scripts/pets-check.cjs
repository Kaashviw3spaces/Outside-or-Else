const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react')
const {renderToStaticMarkup}=require('react-dom/server')
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023}}).outputText,file)
const {BREEDS,ACCESSORIES,getBreed}=require('../src/pets/catalog.ts'),{PERSONALITIES}=require('../src/pets/personality.ts')
const {normalizePet,adoptPet,completedAdventures}=require('../src/pets/save.ts'),{PetCharacter}=require('../src/components/PetCharacter.tsx')
const {loadProfile,saveProfile,STORAGE_KEY}=require('../src/lib/storage.ts')
const legacy={id:'original-id',species:'cat',name:'Original',affection:73,activities:['Walking'],outingTime:'09:30',duration:15,sound:true,notifications:true,extraProgress:{preserve:true}}
const raw=JSON.stringify({version:1,profile:legacy}),values=new Map([[STORAGE_KEY,raw],['outside-or-else:appearance','dynamic']])
global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}
const migrated=loadProfile();const {pet,...rest}=migrated
assert.deepEqual(rest,legacy);assert.equal(pet.breed,'classic-cat');assert.equal(pet.adoptedAt,null);assert.equal(pet.generation,1)
assert.deepEqual(pet.relationshipHistory,[]);assert.equal(values.get(STORAGE_KEY),raw,'Read migration does not overwrite old save')
assert.equal(values.get('outside-or-else:appearance'),'dynamic')
assert.equal(saveProfile({...migrated,pet:{...pet,equippedAccessory:'pink-bow',furVariation:'orange'}}),true)
assert.equal(loadProfile().pet.equippedAccessory,'pink-bow');assert.equal(loadProfile().affection,73)
assert.equal(loadProfile().id,'original-id');assert.deepEqual(loadProfile().extraProgress,{preserve:true})
for(const species of ['cat','dog']){
 assert.equal(BREEDS.filter(b=>b.species===species).length,10)
 const silhouettes=new Set()
 for(const breed of BREEDS.filter(b=>b.species===species)){
  for(const fur of breed.fur){
   const appearance=adoptPet(species,breed.id,fur,'curious','id','2026-01-01T00:00:00Z')
   assert.equal(appearance.furVariation,fur);assert.equal(appearance.breed,breed.id)
   for(const mood of ['idle','happy','excited','sleepy','sad','annoyed']){
    const html=renderToStaticMarkup(React.createElement(PetCharacter,{species,appearance,mood,affectionLevel:40,size:'large'}))
    assert.ok(html.includes(`data-breed="${breed.id}"`));assert.ok(html.includes(`mood-${mood}`));assert.ok(!html.includes('undefined'))
    assert.ok(html.includes('pet-head')&&html.includes('pet-body')&&html.includes('pet-eyes')&&html.includes('pet-tail'))
   }
   for(const reaction of ['petting','feeding'])assert.ok(renderToStaticMarkup(React.createElement(PetCharacter,{species,appearance,mood:'happy',reaction,affectionLevel:40,size:'large'})).includes(reaction==='petting'?'floating-heart':'food-bowl'))
  }
  silhouettes.add([breed.ears,breed.body,breed.coat,breed.tail].join(':'))
 }
 assert.ok(silhouettes.size>=5,'Distinct ears, body, coats and tails rather than recolors')
}
const history=n=>Array.from({length:n},(_,i)=>({id:'event-'+i,type:'adventure-completed',date:'2026-01-01T00:00:00Z',adventureId:'adventure-'+i}))
for(const count of [0,1,2,3,4,5,9,10,14,15]){
 const saved=normalizePet({...legacy,pet:{...pet,relationshipHistory:history(count),equippedAccessory:'backpack',unlockedAccessories:ACCESSORIES.map(a=>a.id)}})
 assert.deepEqual(saved.unlockedAccessories,ACCESSORIES.filter(a=>a.adventures<=count).map(a=>a.id))
 assert.equal(saved.equippedAccessory,count>=15?'backpack':null)
}
assert.equal(completedAdventures([...history(3),...history(3)]),3,'Duplicate records cannot farm unlocks')
assert.equal(completedAdventures([{id:'x',type:'adopted',date:'2026-01-01',adventureId:'fake'}]),0)
for(const accessory of ACCESSORIES){
 for(const breed of BREEDS){
  const appearance={...adoptPet(breed.species,breed.id,breed.fur[0],'playful','id'),equippedAccessory:accessory.id}
  const html=renderToStaticMarkup(React.createElement(PetCharacter,{species:breed.species,appearance,mood:'excited',affectionLevel:10,size:'large'}))
  assert.ok(html.includes(`data-accessory="${accessory.id}"`))
 }
}
assert.equal(Object.keys(PERSONALITIES).length,5)
assert.ok(Object.values(PERSONALITIES).every(p=>p.idleSeconds>0))
assert.ok(Object.values(PERSONALITIES).every(p=>p.blinkSeconds>0))
assert.equal(normalizePet({...legacy,pet:{...pet,personality:'toString',breed:'husky',furVariation:'invalid',relationshipHistory:[null,{}]}}).breed,'classic-cat')
assert.equal(getBreed('husky','cat').id,'classic-cat')
global.localStorage={getItem:()=>raw,setItem:()=>{throw Error('blocked')}}
assert.equal(loadProfile().name,'Original');assert.equal(saveProfile(migrated),false)
console.log('PASS: 20 breeds, every allowed fur/mood/reaction, silhouette diversity, 120 breed/accessory combinations, migration preserving identity/progress/theme and raw saves, refresh persistence, lock thresholds/deduplication/tampering, malformed metadata and blocked storage, five scripted personalities.')
