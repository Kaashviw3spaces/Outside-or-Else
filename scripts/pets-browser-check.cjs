const ts=require('typescript');require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(require('node:fs').readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {speechOptions}=require('../src/pets/dialogue.ts')
const {dialogueOptions}=require('../src/dialogue/index.ts')
// Adoption/wardrobe browser regression and screenshots. Run after npm run build; requires installed Chrome.
// Chrome touch emulation is not a substitute for testing the actual Android phone.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
let galleryHtml=''
const savedProfile = { version:1, profile:{id:'existing-pet',species:'cat',name:'Original',activities:['Walking'],outingTime:'09:30',duration:30,affection:45,sound:false,notifications:false} }
const server = http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'), root=path.resolve('dist')
 if(url.pathname==='/__pet-gallery'){res.setHeader('Content-Type','text/html');return res.end(galleryHtml)}
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname))
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end()}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/svg+xml');res.end(fs.readFileSync(file))
})
let browser, socket, browserProfile
async function main(){
 assert.ok(fs.existsSync(chrome),'Set CHROME_PATH to an installed Chrome executable')
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const port=server.address().port
 browserProfile=fs.mkdtempSync(path.join(os.tmpdir(),'outside-pets-test-'))
 browser=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-proxy-server','--remote-debugging-port=0','--host-resolver-rules=MAP outside-or-else.test 127.0.0.1','--user-data-dir='+browserProfile,'about:blank'],{windowsHide:true,stdio:'ignore'})
 const activePort=path.join(browserProfile,'DevToolsActivePort')
 for(let i=0;!fs.existsSync(activePort)&&i<100;i++)await delay(100)
 assert.ok(fs.existsSync(activePort),'Chrome debugging connection did not start')
 const debugPort=fs.readFileSync(activePort,'utf8').split('\n')[0]
 const targets=await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
 let nextId=0;const pending=new Map()
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject,timer}=pending.get(message.id);pending.delete(message.id);clearTimeout(timer);message.error?reject(new Error(message.error.message)):resolve(message.result)}})
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method))},10000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))})
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value}
 const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(50)}throw new Error('Timed out waiting for '+expression)}
 await call('Page.enable');await call('Runtime.enable')

 const legacy={version:1,profile:{id:'old-friend',species:'cat',name:'Original',activities:['Walking'],outingTime:'09:30',duration:15,affection:73,sound:false,notifications:false}}
 const dates=Array.from({length:15},(_,i)=>({id:'saved-'+i,type:'adventure-completed',date:'2026-01-01T10:00:00Z',adventureId:'verified-'+i}))
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__errors=[];addEventListener('error',e=>__errors.push(e.message));const params=new URLSearchParams(location.search);if(params.has('seed')){localStorage.clear();const kind=params.get('seed');if(kind!=='new'){const save=${JSON.stringify(legacy)};if(kind==='earned')save.profile.pet={breed:'ragdoll',furVariation:'cream',personality:'curious',equippedAccessory:null,relationshipHistory:${JSON.stringify(dates)},adoptedAt:'2026-01-01T09:00:00Z',generation:2};if(params.has('personality')){save.profile.species=params.get('species');save.profile.pet.personality=params.get('personality');save.profile.pet.breed=save.profile.species==='cat'?'ragdoll':'golden-retriever';}localStorage.setItem('outside-or-else:v1',JSON.stringify(save));}localStorage.setItem('outside-or-else:appearance','light');history.replaceState(null,'','/');}`})
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
 const tap=async selector=>{
  await waitFor('!!document.querySelector('+JSON.stringify(selector)+')');await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center",inline:"center",behavior:"instant"})');await delay(300);const point=await evaluate('(()=>{const b=document.querySelector('+JSON.stringify(selector)+');const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest("button,label,a")===b}})()')
  if(!point.hit){const {data}=await call('Page.captureScreenshot',{format:'png'});fs.mkdirSync('artifacts/checkpoint-6',{recursive:true});fs.writeFileSync('artifacts/checkpoint-6/failed-control.png',Buffer.from(data,'base64'));console.error(point,await evaluate('document.elementFromPoint('+point.x+','+point.y+')?.tagName'))}
  assert.ok(point.hit,'Intercepted '+selector);assert.ok(point.w>=43.99&&point.h>=43.99,'44px touch size '+selector+' '+JSON.stringify(point))
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(150)
 }
 const input=async(selector,value)=>{await evaluate('(()=>{const i=document.querySelector('+JSON.stringify(selector)+');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,'+JSON.stringify(value)+');i.dispatchEvent(new Event("input",{bubbles:true}))})()');await delay(50)}
 const screenshots=path.resolve('artifacts/checkpoint-6');fs.mkdirSync(screenshots,{recursive:true})
 const shot=async name=>{await delay(650);const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(screenshots,name+'.png'),Buffer.from(data,'base64'))}
 const navigate=async seed=>{await call('Page.navigate',{url:'http://127.0.0.1:'+port+'/?seed='+seed});await delay(300)}
 const noOverflow=async()=>assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'No horizontal overflow')
 const visiblePet=async selector=>{const geometry=await evaluate('(()=>{const s=document.querySelector('+JSON.stringify(selector)+');const b=s.getBoundingClientRect(),r=s.closest(".cozy-room").getBoundingClientRect();return {pet:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},room:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},fits:b.left>=r.left&&b.right<=r.right&&b.top>=r.top-1&&b.bottom<=r.bottom+1}})()');assert.ok(geometry.fits,'Preview fits illustrated room '+JSON.stringify(geometry))}
 const galleryOnly=process.argv.includes('--gallery-only')
 if(!galleryOnly){
 await call('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true})
 for(const species of ['cat','dog'])for(const personality of ['playful','sleepy','curious','shy','mischievous']){
  await navigate('earned&species='+species+'&personality='+personality);await waitFor('!!document.querySelector(".home-screen")')
  const stored=await evaluate('localStorage.getItem("outside-or-else:v1")')
  const spoken=async()=> (await evaluate('document.querySelector(".speech-bubble").textContent')).slice(1,-1)
  const matches=async event=>{const phase=await evaluate('document.querySelector("[data-pet-speech=idle]")?.dataset.speechPhase');const affection=await evaluate('JSON.parse(localStorage.getItem("outside-or-else:v1")).profile.affection');assert.ok(dialogueOptions(species,personality,event,{phase,affection}).includes(await spoken()),species+' '+personality+' '+event)}
  await matches('idle');await tap('.feed-action');await matches('feeding')
  await tap('.pet-action');await matches('petting');const previous=await spoken()
  await tap('.pet-action');await matches('petting');assert.notEqual(await spoken(),previous,'No immediate repeated petting script')
  await tap('[aria-label="Let your pet nap"]');await matches('sleeping')
  await tap('[aria-label="Wake your pet"]');await matches('waking')
  await tap('.pet-talk-orb');await matches('talk');await tap('[aria-label="Close conversation"]')
  assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),stored,'Speech never mutates saved progress')
  assert.deepEqual(await evaluate('__errors'),[])
 }
 console.log('PASS: cat/dog ? all five personalities: actual idle, feed, touch petting, no-repeat, sleep, wake and scripted Talk; saves unchanged')

 for(const [w,h] of [[320,568],[360,800],[390,844],[430,932],[1440,900]]){
  await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<768})
  await navigate('legacy');await waitFor('!!document.querySelector(".home-screen")');await noOverflow()
  assert.equal(await evaluate('document.querySelector(".pet-character").dataset.breed'),'classic-cat')
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("outside-or-else:v1"))'),legacy,'Lazy migration does not rewrite stored pet')
  if(w===390)await shot('existing-pet-after-migration')
  await tap('.wardrobe-trigger');await waitFor('!!document.querySelector(".wardrobe-dialog[open]")');await visiblePet('.wardrobe-stage .pet-character')
  assert.ok(await evaluate('document.querySelector("[data-accessory-option=red-collar]").disabled'),'First-adventure collar locked')
  assert.equal(await evaluate('document.querySelector("[data-accessory-option=pink-bow]").disabled'),false)
  await tap('[data-accessory-option=pink-bow]');await tap('.wardrobe-dialog [aria-label="Orange fur"]')
  assert.ok(await evaluate('!!document.querySelector(".wardrobe-stage .pet-head [data-accessory=pink-bow]")'),'Bow follows animated head')
  if(w===390)await shot('wardrobe-welcome-accessory')
  await tap('.wardrobe-footer .primary-button');await tap('[aria-label="Close wardrobe"]')
  assert.equal(await evaluate('document.querySelector(".pet-character").dataset.fur'),'orange')
  await call('Page.reload');await waitFor('!!document.querySelector(".home-screen")')
  const persisted=await evaluate('JSON.parse(localStorage.getItem("outside-or-else:v1")).profile')
  assert.equal(persisted.id,'old-friend');assert.equal(persisted.affection,73);assert.equal(persisted.name,'Original');assert.equal(persisted.pet.equippedAccessory,'pink-bow');assert.equal(persisted.pet.furVariation,'orange')
  if(w===390)await shot('equipped-pink-bow')
  await tap('.pet-talk-orb');assert.equal(await evaluate('document.querySelector("#conversation-title").textContent'),'Talk to Original');await tap('[aria-label="Close conversation"]')
  for(const species of ['cat','dog']){
   await navigate('new');await waitFor('!!document.querySelector(".skip-splash")');await tap('.skip-splash');await waitFor('!!document.querySelector(".onboarding")');await tap('.onboarding-footer .primary-button')
   if(species==='dog')await tap('.adoption-species button:nth-child(2)')
   assert.equal(await evaluate('document.querySelectorAll("[data-select-breed]").length'),10)
   if(w===390){
    const ids=await evaluate('Array.from(document.querySelectorAll("[data-select-breed]")).map(b=>b.dataset.selectBreed)')
    for(const id of ids){await tap('[data-select-breed='+id+']');assert.equal(await evaluate('document.querySelector(".adoption-stage .pet-character").dataset.breed'),id);await visiblePet('.adoption-stage .pet-character')}
   }
   const breed=species==='cat'?'persian':'golden-retriever'
   await tap('[data-select-breed='+breed+']');await tap('.adoption-center .fur-options button:nth-child(2)')
   const fur=await evaluate('document.querySelector(".adoption-stage .pet-character").dataset.fur');await noOverflow();await visiblePet('.adoption-stage .pet-character')
   if(w===390){await evaluate('document.querySelector(".adoption-stage").scrollIntoView({block:"center",behavior:"instant"})');await shot(species+'-breed-selection')}
   await tap('.onboarding-footer .primary-button');await input('#pet-name',species==='cat'?'Luna':'Sunny');await tap('.personality-options button:nth-child(3)')
   for(let i=0;i<4;i++)await tap('.onboarding-footer .primary-button')
   assert.equal(await evaluate('document.querySelector(".step-label").textContent'),'7 / 7')
   assert.equal(await evaluate('document.querySelector(".meet-pet .pet-character").dataset.breed'),breed)
   await tap('.onboarding-footer .primary-button');await waitFor('!!document.querySelector(".home-screen")')
   const adopted=await evaluate('JSON.parse(localStorage.getItem("outside-or-else:v1")).profile')
   assert.equal(adopted.pet.breed,breed);assert.equal(adopted.pet.furVariation,fur);assert.equal(adopted.pet.personality,'curious');assert.ok(adopted.pet.adoptedAt);assert.equal(adopted.pet.generation,1)
   assert.ok(dialogueOptions(species,'curious','idle',{phase:await evaluate('document.querySelector("[data-pet-speech=idle]").dataset.speechPhase'),affection:10}).includes((await evaluate('document.querySelector(".speech-bubble").textContent')).slice(1,-1)),'Personality affects real Home dialogue')
   await tap('.feed-action');assert.ok(speechOptions(species,'curious','feeding').includes((await evaluate('document.querySelector(".speech-bubble").textContent')).slice(1,-1)),'Personality affects feeding')
   await tap('.pet-action');assert.ok(speechOptions(species,'curious','petting').includes((await evaluate('document.querySelector(".speech-bubble").textContent')).slice(1,-1)),'Personality affects petting')
   await noOverflow();assert.deepEqual(await evaluate('__errors'),[])
  }
  console.log('PASS: '+w+'×'+h+' migrated pet, owned/locked wardrobe, persisted look, cat/dog adoption, breed/fur selection, personality reactions and Talk')
 }
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await navigate('earned');await waitFor('!!document.querySelector(".home-screen")');await tap('.wardrobe-trigger')
 for(const accessory of ['red-collar','blue-collar','green-scarf','flower-crown','backpack']){
  await tap('[data-accessory-option='+accessory+']');assert.ok(await evaluate('document.querySelector("[data-accessory='+accessory+']").closest(".pet-head,.pet-body")!==null'),'Accessory is attached to animated body/head')
  await visiblePet('.wardrobe-stage .pet-character');await tap('.wardrobe-footer .primary-button')
  if(accessory==='backpack')await shot('wardrobe-earned-backpack')
 }
 await tap('[aria-label="Close wardrobe"]');await shot('equipped-backpack');await call('Page.reload');await waitFor('!!document.querySelector(".home-screen")')
 assert.equal(await evaluate('document.querySelector(".pet-character [data-accessory]").dataset.accessory'),'backpack')
 await tap('.nav-item:nth-child(4)');await tap('.appearance-option:nth-child(2)');await tap('.nav-item:nth-child(1)');await tap('.wardrobe-trigger')
 assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');await shot('wardrobe-night')
 await tap('[aria-label="Close wardrobe"]');assert.deepEqual(await evaluate('__errors'),[])
 }
 // Browser-rendered catalogue lets visual inspection cover every breed together.
 const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
 for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023}}).outputText,file)
 const {BREEDS}=require('../src/pets/catalog.ts'),{adoptPet}=require('../src/pets/save.ts'),{PetCharacter}=require('../src/components/PetCharacter.tsx')
 const css=fs.readFileSync('dist/index.html','utf8').match(/href="([^"]+\.css)"/)[1]
 galleryHtml='<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+css+'"><style>body{margin:0;padding:20px;background:var(--canvas);display:grid;grid-template-columns:repeat(5,1fr);gap:12px}figure{margin:0;text-align:center;background:var(--surface);border-radius:20px;padding:8px}.pet-character{width:165px;height:165px}figcaption{font:14px Georgia;margin:6px}</style></head><body>'+BREEDS.map(b=>'<figure>'+renderToStaticMarkup(React.createElement(PetCharacter,{species:b.species,appearance:adoptPet(b.species,b.id,b.fur[0],'curious','preview'),mood:'idle',affectionLevel:10,size:'large'}),{identifierPrefix:'catalogue-'+b.id+'-'})+'<figcaption>'+b.name+'</figcaption></figure>').join('')+'</body></html>'
 await call('Emulation.setDeviceMetricsOverride',{width:1100,height:950,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://127.0.0.1:'+port+'/__pet-gallery'});await waitFor('document.querySelectorAll("figure").length===20')
 assert.ok(await evaluate('(()=>{const ids=Array.from(document.querySelectorAll("svg defs [id]")).map(e=>e.id);return ids.length===60&&new Set(ids).size===ids.length})()'),'Catalogue gradients and clipping paths have unique SVG IDs')
 await shot('all-20-breeds')
 if(!galleryOnly)console.log('PASS: every accessory mounted on animation groups, real saved completion fixture unlocks, generation preservation, refresh and night wardrobe. Fixtures do not assert real-world completion tracking.')
 console.log('PASS: browser-rendered 20-breed catalogue with unique SVG gradient and clipping IDs.')
 console.log('Screenshots: '+screenshots+'; physical Android touch/keyboard testing remains necessary.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 socket?.close();browser?.kill();server.close();await delay(500)
 if(browserProfile){const resolved=path.resolve(browserProfile),temporary=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(temporary)||!path.basename(resolved).startsWith('outside-pets-test-'))throw new Error('Unsafe temporary browser profile path');try{fs.rmSync(resolved,{recursive:true,force:true})}catch{console.error('Temporary browser profile could not be removed:',resolved)}}
})
