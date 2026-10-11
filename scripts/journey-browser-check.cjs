// Outdoor journey browser regression and screenshots. Run after npm run build; requires installed Chrome.
// Chrome touch emulation is not a substitute for testing the actual Android phone.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const ts = require('typescript')
const { spawn } = require('node:child_process')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const server = http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'), root=path.resolve('dist')
 // Test-only module endpoint: actual service source, native browser IndexedDB.
 // This endpoint is never included in the app or production server.
 if(url.pathname.startsWith('/__source/')){
  const sourceRoot=path.resolve('src'), source=path.resolve(url.pathname.slice('/__source/'.length))
  if(!source.startsWith(sourceRoot+path.sep)||!fs.existsSync(source)){res.statusCode=404;return res.end()}
  const code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023},fileName:source}).outputText
  const output=code.replace(/(from\s+['"])(\.[^'"]+)(['"])/g,(_,head,spec,tail)=>{const resolved=path.resolve(path.dirname(source),spec+'.ts');return head+'/__source/'+path.relative(process.cwd(),resolved).replace(/\\/g,'/')+tail})
  res.setHeader('Content-Type','text/javascript');return res.end(output)
 }
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname))
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end()}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/svg+xml');res.end(fs.readFileSync(file))
})
let browser, socket, browserProfile
async function main(){
 assert.ok(fs.existsSync(chrome),'Set CHROME_PATH to an installed Chrome executable')
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const port=server.address().port
 browserProfile=fs.mkdtempSync(path.join(os.tmpdir(),'outside-journey-test-'))
 browser=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-proxy-server','--remote-debugging-port=0','--host-resolver-rules=MAP outside-or-else.test 127.0.0.1','--user-data-dir='+browserProfile,'about:blank'],{windowsHide:true,stdio:'ignore'})
 const activePort=path.join(browserProfile,'DevToolsActivePort')
 for(let i=0;!fs.existsSync(activePort)&&i<100;i++)await delay(100)
 assert.ok(fs.existsSync(activePort),'Chrome debugging connection did not start')
 const debugPort=fs.readFileSync(activePort,'utf8').split('\n')[0]
 const targets=await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
 let nextId=0;const pending=new Map()
 const onMessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject,timer}=pending.get(message.id);pending.delete(message.id);clearTimeout(timer);message.error?reject(new Error(message.error.message)):resolve(message.result)}}
 socket.addEventListener('message',onMessage)
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method))},10000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))})
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value}
 const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(50)}throw new Error('Timed out waiting for '+expression+'\n'+await evaluate('JSON.stringify({text:document.body.innerText,errors:window.__errors})'))}
 await call('Page.enable');await call('Runtime.enable')


 const url='http://127.0.0.1:'+port+'/'
 const profile={id:'journey-pet',species:'cat',name:'Miso',activities:['Walking'],outingTime:'17:30',duration:5,affection:10,sound:false,notifications:false,pet:{breed:'siamese',furVariation:'cream',personality:'playful',equippedAccessory:'pink-bow',unlockedAccessories:['pink-bow'],unlockedFurVariations:['cream'],adoptedAt:'2026-10-01T12:00:00.000Z',generation:1,relationshipHistory:[{id:'adopted',type:'adopted',date:'2026-10-01T12:00:00.000Z'}]}}
 const bootstrap=`window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));window.__gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){__gpsCalls++;throw Error('Unexpected GPS request')}},configurable:true});if(!localStorage.getItem('outside-or-else:v1'))localStorage.setItem('outside-or-else:v1',${JSON.stringify(JSON.stringify({version:1,profile}))});if(!localStorage.getItem('outside-or-else:appearance'))localStorage.setItem('outside-or-else:appearance','light');`
 await call('Page.addScriptToEvaluateOnNewDocument',{source:bootstrap})
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
 const tap=async selector=>{
  await waitFor('!!document.querySelector('+JSON.stringify(selector)+')&&!document.querySelector('+JSON.stringify(selector)+').disabled')
  await delay(350)
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await delay(100)
  const point=await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});const r=b.getBoundingClientRect();return {x:r.x+r.width/2-visualViewport.offsetLeft,y:r.y+r.height/2-visualViewport.offsetTop,w:r.width,h:r.height,scale:visualViewport.scale,offset:visualViewport.offsetTop,sy:scrollY,element:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,180),rect:r.toJSON(),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button,label')===b}})()`)
  assert.ok(point.hit,'Touch intercepted '+selector+' '+JSON.stringify(point));assert.ok(point.w>=44&&point.h>=44,'44px touch target '+selector)
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(350)
 }
 let targetId=targets.find(t=>t.type==='page').id
 const reopen=async (width,height)=>{
  const oldId=targetId,{targetId:newId}=await call('Target.createTarget',{url:'about:blank'})
  const list=await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()
  socket.close();socket=new WebSocket(list.find(t=>t.id===newId).webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
  socket.addEventListener('message',onMessage);targetId=newId
  await call('Target.closeTarget',{targetId:oldId});await call('Page.enable');await call('Runtime.enable')
  await call('Page.addScriptToEvaluateOnNewDocument',{source:bootstrap})
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
  await call('Page.navigate',{url})
 }
 const importService=()=>evaluate("(async()=>{window.S=await import('/__source/src/journey/service.ts');window.DB=await import('/__source/src/journey/database.ts');window.P=()=>JSON.parse(localStorage.getItem('outside-or-else:v1')).profile;window.state=()=>S.getJourneyData(P().id);window.age=async(id,ms)=>{const d=await DB.openJourneyDB(),t=d.transaction(['outings'],'readwrite'),done=DB.transactionDone(t),r=await DB.requestValue(t.objectStore('outings').get(id));t.objectStore('outings').put({...r,clock:{...r.clock,ticks:r.clock.ticks-ms}});await done};window.ledger=async()=>{const db=await DB.openJourneyDB();return DB.requestValue(db.transaction(['outings']).objectStore('outings').getAll())};return true})()")
 const artifacts=path.resolve('artifacts/checkpoint-7');fs.mkdirSync(artifacts,{recursive:true})
 const shot=async name=>{const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(data,'base64'))}
 for(const [width,height] of [[320,568],[360,800],[390,844],[430,932]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url});await waitFor('!!document.querySelector(".home-screen")');await importService()
  await tap('.nav-item:nth-child(2)');await tap('.start-free-walk');await waitFor('!!document.querySelector(".return-outing")');assert.equal(await evaluate('document.querySelector(".outdoor-speech [data-pet-speech]").dataset.petSpeech'),'adventure_start')
  const first=await evaluate('(async()=>{const a=(await state()).active;const b=await Promise.all([S.startOuting(P()),S.startOuting(P())]);return {id:a.id,ids:b.map(x=>x.id),status:a.status}})()')
  assert.equal(first.status,'active');assert.deepEqual(first.ids,[first.id,first.id],'Concurrent duplicate starts return the original outing')
  const geometry=await evaluate(`(()=>{window.scrollTo(0,0);const r=x=>document.querySelector(x).getBoundingClientRect();const pet=r('.outdoor-pet'),stage=r('.outdoor-scene'),speech=r('.outdoor-speech');return {pet:{left:pet.left,right:pet.right,top:pet.top,bottom:pet.bottom},stage:{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom},speechBottom:speech.bottom,overflow:document.documentElement.scrollWidth>innerWidth,breed:document.querySelector('.outdoor-pet svg').dataset.breed,bow:!!document.querySelector('.outdoor-pet [data-accessory="pink-bow"]'),animation:getComputedStyle(document.querySelector('.outdoor-pet .pet-body')).animationName}})()`)
  assert.equal(geometry.overflow,false);assert.equal(geometry.breed,'siamese');assert.equal(geometry.bow,true);assert.equal(geometry.animation,'breathe')
  assert.ok(geometry.pet.left>=geometry.stage.left&&geometry.pet.right<=geometry.stage.right&&geometry.pet.bottom<=geometry.stage.bottom&&geometry.pet.top>=geometry.stage.top,'Entire pet in outdoor scene')
  assert.ok(geometry.speechBottom<geometry.pet.top+((geometry.pet.right-geometry.pet.left)*80/300),'Speech above face')
  await shot('active-'+width+'x'+height+'-day')
  if(width===320)await reopen(width,height);else await call('Page.reload');await waitFor('!!document.querySelector(".return-outing")');await importService();assert.equal(await evaluate('(async()=>(await state()).active.id)()'),first.id,'Refresh resumes outing')
  await tap('.return-outing');await waitFor('!!document.querySelector(".photo-composer")');assert.equal(await evaluate('document.querySelector(".outdoor-speech [data-pet-speech]").dataset.petSpeech'),'adventure_early_return');assert.equal(await evaluate('(async()=>(await state()).active.status)()'),'returned')
  await tap('.save-memory-button');await waitFor('!!document.querySelector(".start-free-walk")');assert.equal(await evaluate('P().affection'),10,'Early no-photo return does not award love')
  await tap('.nav-item:nth-child(3)');await waitFor('!!document.querySelector(".scrapbook-entry")');await tap('.memory-open');await waitFor('!!document.querySelector(".memory-dialog[open]")')
  assert.ok(await evaluate('!!document.querySelector(".memory-dialog .memory-no-photo")'),'Photo-less entry renders');assert.equal(await evaluate('document.querySelector(".memory-dialog .pet-character").dataset.breed'),'siamese')
  await tap('[aria-label="Close memory"]');assert.equal(await evaluate('__gpsCalls'),0,'Free Walk never asks for GPS')
  assert.deepEqual(await evaluate('__errors'),[])
  console.log('PASS: '+width+'x'+height+' Free Walk, touch targets, actual breed/bow, face clearance, refresh, early return, photo-less scrapbook')
 }
 // All further records are test-only in Chrome's isolated temporary browser profile.
 await importService()
 await evaluate("(async()=>{const d=await DB.openJourneyDB(),t=d.transaction([...DB.STORES],'readwrite'),done=DB.transactionDone(t);DB.STORES.forEach(s=>t.objectStore(s).clear());await done;localStorage.setItem('outside-or-else:v1',"+JSON.stringify(JSON.stringify({version:1,profile}))+');return true})()')
 await call('Page.navigate',{url});await waitFor('!!document.querySelector(".home-screen")');await importService()
 await tap('.nav-item:nth-child(3)');await waitFor('!!document.querySelector(".scrapbook")');assert.match(await evaluate('document.querySelector(".scrapbook").textContent'),/first memory/)
 // Cached-place fixture tests destination wiring, without asserting a live OSM response.
 await evaluate(`localStorage.setItem('outside-or-else:nearby-v1',JSON.stringify({version:1,coordinates:{latitude:51.51,longitude:-.13,obtainedAt:Date.now()},timestamp:Date.now(),radius:2000,places:[{id:'way/123',name:'Fixture park',category:'Park',latitude:51.511,longitude:-.13,tags:{leisure:'park',name:'Fixture park'}}]}))`)
 await tap('.nav-item:nth-child(2)');await tap('.choose-nearby');await waitFor('!!document.querySelector(".return-outing")')
 assert.equal(await evaluate('(async()=>(await state()).active.destination.osmId)()'),'way/123');assert.match(await evaluate('document.querySelector(".outing-timer").textContent'),/Fixture park/)
 // Set only the test record timestamp back five minutes; UI still uses actual timestamp math.
 await evaluate("(async()=>{const a=(await state()).active,d=await DB.openJourneyDB(),t=d.transaction(['outings'],'readwrite'),done=DB.transactionDone(t);t.objectStore('outings').put({...a,startedAt:Date.now()-305000,clock:{...a.clock,ticks:a.clock.ticks-305000}});await done;window.dispatchEvent(new Event('journey-changed'));return true})()")
 await tap('.nav-item:nth-child(4)');await tap('.appearance-option:nth-child(2)');await tap('.nav-item:nth-child(2)');await delay(800)
 assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-sky-object=moon]")).opacity'),'1');await evaluate('scrollTo(0,0)');await shot('active-430x932-night')
 await tap('.nav-item:nth-child(4)');await tap('.appearance-option:nth-child(1)');await tap('.nav-item:nth-child(2)');await delay(800)
 assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-sky-object=moon]")).opacity'),'0')
 await tap('.return-outing');await waitFor('!!document.querySelector(".photo-composer")');assert.match(await evaluate('document.querySelector(".return-summary").textContent'),/reached your time goal/)
 assert.equal(await evaluate('document.querySelector("[data-photo-input=camera]").getAttribute("capture")'),'environment')
 assert.equal(await evaluate('document.querySelector("[data-photo-input=gallery]").getAttribute("accept")'),'image/*')
 const png=await evaluate("(()=>{const c=document.createElement('canvas');c.width=2200;c.height=1400;const x=c.getContext('2d');x.fillStyle='#97bba0';x.fillRect(0,0,c.width,c.height);x.fillStyle='#f7ebd9';x.fillRect(200,200,1800,1000);return c.toDataURL('image/png').split(',')[1]})()")
 const fixture=path.join(artifacts,'upload-test.png');fs.writeFileSync(fixture,Buffer.from(png,'base64'))
 const upload=async file=>{const {root}=await call('DOM.getDocument');const {nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector:'[data-photo-input=gallery]'});await call('DOM.setFileInputFiles',{nodeId,files:[file]})}
 await evaluate("window.__put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...a){if(this.name==='photos')throw new DOMException('Injected quota','QuotaExceededError');return __put.apply(this,a)}")
 await call('Page.setInterceptFileChooserDialog',{enabled:true})
 const chooser=[];const onChooser=event=>{const m=JSON.parse(event.data);if(m.method==='Page.fileChooserOpened')chooser.push(m.params)};socket.addEventListener('message',onChooser)
 await tap('.photo-input-actions button:first-child');for(let i=0;i<40&&!chooser.length;i++)await delay(50);assert.equal(chooser.length,1,'Camera input opens only after explicit touch')
 await call('DOM.setFileInputFiles',{backendNodeId:chooser[0].backendNodeId,files:[fixture]});socket.removeEventListener('message',onChooser);await call('Page.setInterceptFileChooserDialog',{enabled:false})
 await waitFor('document.querySelector(".photo-save-status")?.textContent.includes("out of storage")')
 assert.equal(await evaluate('!!document.querySelector("[data-pet-speech=photo-saved]")'),false,'Failed photo write never celebrates a save');assert.ok(await evaluate('!!document.querySelector("[data-pet-speech=photo_error]")'),'Failed write has accurate error dialogue');assert.ok(await evaluate('!!document.querySelector(".photo-preview img")'),'Failed write retains photo preview');assert.ok(await evaluate('document.querySelector(".save-memory-button").disabled'))
 assert.equal(await evaluate('(async()=>(await state()).active.draftPhotoId)()'),null,'Quota failure leaves no partial reference')
 await evaluate('IDBObjectStore.prototype.put=__put');await tap('.photo-composer>button.text-button');await waitFor('document.querySelector(".photo-save-status").textContent.includes("Photo saved on this device")');assert.ok(await evaluate('!!document.querySelector("[data-pet-speech=photo-saved]")'),'Successful photo write receives photo dialogue')
 const photo=await evaluate('(async()=>{const a=(await state()).active,p=await S.getPhoto(a.draftPhotoId);return {id:p.id,width:p.width,height:p.height,type:p.blob.type,size:p.blob.size,isBlob:p.blob instanceof Blob}})()')
 assert.equal(photo.width,1600);assert.equal(photo.height,1018);assert.equal(photo.type,'image/jpeg');assert.ok(photo.isBlob&&photo.size>0)
 const invalid=path.join(artifacts,'corrupt-test.png');fs.writeFileSync(invalid,'This is not an image')
 await upload(invalid);await waitFor('document.querySelector(".photo-save-status").textContent.includes("could not")')
 assert.equal(await evaluate('(async()=>(await state()).active.draftPhotoId)()'),photo.id,'Corrupt replacement preserves saved photo');await call('Page.reload');await waitFor('!!document.querySelector(".incomplete-photo")');await importService();assert.ok(await evaluate('document.querySelector(".save-memory-button").disabled'),'Interrupted photo selection remains visible and blocks silent loss');await tap('.abandon-photo-preparation')
 await evaluate(`(()=>{const input=document.querySelector('#memory-caption');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'A chapter in the sunshine');input.dispatchEvent(new Event('input',{bubbles:true}))})()`);await delay(750)
 await call('Page.reload');await waitFor('!!document.querySelector(".photo-composer")');await importService();await waitFor('!!document.querySelector(".photo-preview img")')
 assert.equal(await evaluate('document.querySelector("#memory-caption").value'),'A chapter in the sunshine','Draft caption and photo survive refresh')
 await evaluate('scrollTo(0,document.querySelector(".photo-composer").offsetTop-50)');await shot('returned-photo-draft')
 await evaluate("window.__put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...a){if(this.name==='memories')throw new DOMException('Injected interrupted save','AbortError');return __put.apply(this,a)}")
 await tap('.save-memory-button');await waitFor('document.querySelector(".photo-save-status").textContent.includes("interrupted")')
 assert.equal(await evaluate('(async()=>(await state()).active.status)()'),'returned');assert.equal(await evaluate('(async()=>(await state()).memories.length)()'),0);assert.equal(await evaluate('P().affection'),10)
 await evaluate('IDBObjectStore.prototype.put=__put');await call('Page.reload');await waitFor('!!document.querySelector(".photo-preview img")');await importService()
 const outingId=await evaluate('(async()=>(await state()).active.id)()')
 await tap('.save-memory-button');await waitFor('!!document.querySelector(".completion-note")');assert.ok(await evaluate('!!document.querySelector("[data-pet-speech=accessory-unlocked]")'),'First earned collar announces a real unlock');assert.equal(await evaluate('P().affection'),13)
 const duplicate=await evaluate(`(async()=>{const records=await Promise.all([S.finishMemory(P(),${JSON.stringify(outingId)},'duplicate'),S.finishMemory(P(),${JSON.stringify(outingId)},'duplicate')]);await S.reconcileProgress();return {ids:records.map(r=>r.id),count:(await state()).memories.length,love:P().affection,unlocks:P().pet.unlockedAccessories}})()`)
 assert.deepEqual(duplicate.ids,[outingId,outingId]);assert.equal(duplicate.count,1);assert.equal(duplicate.love,13);assert.ok(duplicate.unlocks.includes('red-collar'))
 await tap('.nav-item:nth-child(3)');await waitFor('!!document.querySelector(".scrapbook-entry .memory-photo")');await evaluate('scrollTo(0,0)');await shot('scrapbook-day');await tap('.memory-open');await shot('memory-detail')
 assert.match(await evaluate('document.querySelector(".memory-caption").textContent'),/sunshine/);await tap('[aria-label="Close memory"]')
 await tap('.add-memory');await waitFor('!!document.querySelector(".memory-dialog .photo-composer")')
 await evaluate(`(()=>{const input=document.querySelector('#memory-caption');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'A separate little moment');input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
 await tap('.save-memory-button');await waitFor('document.querySelectorAll(".scrapbook-entry").length===2');assert.equal(await evaluate('P().affection'),13)
 assert.equal(await evaluate('(async()=>(await state()).memories.find(r=>r.kind==="manual").reward.awarded)()'),0)
 // Fact/scrapbook reads neither depend on the native clock nor write the ledger.
 const readOnly=await evaluate(`(async()=>{const original=window.Capacitor,before=JSON.stringify(await ledger());let calls=0;try{window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android',Plugins:{PetClock:{read:async()=>{calls++;throw Error('Clock deliberately unavailable')}}}};const data=await state();return {calls,unchanged:before===JSON.stringify(await ledger()),memories:data.memories.length}}finally{window.Capacitor=original}})()`)
 assert.equal(readOnly.calls,0);assert.equal(readOnly.unchanged,true);assert.equal(readOnly.memories,2);
 // Phone-clock jump cannot satisfy a time goal: use the actual service and durable ledger.
 const clockJump=await evaluate(`(async()=>{const original=window.Capacitor;let ticks=10000;try{window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android',Plugins:{PetClock:{read:async()=>({ticks,epoch:'android:fixture'})}}};const start=Date.now(),a=await S.startOuting(P(),null,start);ticks+=1000;const returned=await S.returnFromOuting(P(),a.id,start+3600000);const rewards=await import('/__source/src/journey/rewards.ts');const result=rewards.rewardFor(returned,false,0,10);await S.cancelOuting(P(),a.id);return {elapsed:returned.elapsedMs,eligible:result.eligible,reward:result.awarded}}finally{window.Capacitor=original}})()`)
 assert.deepEqual(clockJump,{elapsed:1000,eligible:false,reward:0});
 console.log('PASS: actual IndexedDB/service clock-jump completion prevention (injected clock, isolated profile).')
 // Fifteen distinct duration-goal completions drive the existing accessory thresholds.
 const milestones=await evaluate(`(async()=>{const result=[];for(let n=2;n<=15;n++){const end=Date.now(),a=await S.startOuting(P(),null,end-301000);await age(a.id,301000);await S.returnFromOuting(P(),a.id,end);const r=await S.finishMemory(P(),a.id,'Milestone test '+n);if([3,5,10,15].includes(n))result.push({n,love:P().affection,awarded:r.reward.awarded,unlocks:P().pet.unlockedAccessories,count:new Set(P().pet.relationshipHistory.filter(e=>e.type==='adventure-completed').map(e=>e.adventureId)).size})}return result})()`)
 for(const [n,accessory] of [[3,'blue-collar'],[5,'green-scarf'],[10,'flower-crown'],[15,'backpack']]){const point=milestones.find(p=>p.n===n);assert.equal(point.count,n);assert.equal(point.love,13,'Daily cap across separate outings');assert.equal(point.awarded,0);assert.ok(point.unlocks.includes(accessory),'Unlock '+accessory)}
 assert.equal(await evaluate('P().outdoor.lastQualifyingOutdoorPhotoDate'),null,'Unreviewed upload never becomes verified outdoor proof')
 assert.ok(await evaluate('P().outdoor.lastOutdoorPhotoSubmittedAt>0'))
 // localStorage mirror failures cannot lose the durable reward ledger.
 const recovery=await evaluate(`(async()=>{const end=Date.now()+86400000,a=await S.startOuting(P(),null,end-301000);await age(a.id,301000);await S.returnFromOuting(P(),a.id,end);window.__set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='outside-or-else:v1')throw new DOMException('blocked','QuotaExceededError');return __set.call(this,k,v)};const r=await S.finishMemory(P(),a.id,'Durable reward');const storedLove=P().affection;Storage.prototype.setItem=__set;await S.reconcileProgress();await S.reconcileProgress();return {storedLove,love:P().affection,awarded:r.reward.awarded}})()`)
 assert.equal(recovery.storedLove,13);assert.equal(recovery.awarded,2);assert.equal(recovery.love,15,'Recovery applies pending reward exactly once')
 // Deletion removes blob/memory but retains the minimal reward/milestone tombstone.
 await evaluate(`S.deleteMemory(P(),${JSON.stringify(outingId)})`)
 assert.equal(await evaluate(`(async()=>!!(await S.getPhoto(${JSON.stringify(photo.id)})))()`),false);assert.equal(await evaluate('P().affection'),15)
 assert.equal(await evaluate(`(async()=>(await ledger()).find(r=>r.id===${JSON.stringify(outingId)}).memoryDeleted)()`),true)
 assert.ok(await evaluate('P().pet.unlockedAccessories.includes("backpack")'),'Deletion keeps earned unlocks')
 await call('Page.reload');await waitFor('!!document.querySelector(".home-screen")');await importService();assert.equal(await evaluate('P().affection'),15)
 await tap('.nav-item:nth-child(3)');await waitFor('document.querySelectorAll(".scrapbook-entry").length===16')
 const ceiling=await evaluate(`(async()=>{localStorage.setItem('outside-or-else:v1',JSON.stringify({version:1,profile:{...P(),affection:99}}));const end=Date.now()+2*86400000,a=await S.startOuting(P(),null,end-301000);await age(a.id,301000);await S.returnFromOuting(P(),a.id,end);const r=await S.finishMemory(P(),a.id,'Ceiling test');return {reward:r.reward.awarded,love:P().affection}})()`)
 assert.equal(ceiling.reward,1);assert.equal(ceiling.love,100)
 const cancelled=await evaluate(`(async()=>{const a=await S.startOuting(P());await S.cancelOuting(P(),a.id);await S.reconcileProgress();return {count:new Set(P().pet.relationshipHistory.filter(e=>e.type==='adventure-completed').map(e=>e.adventureId)).size,active:(await state()).active,love:P().affection}})()`)
 assert.equal(cancelled.active,null);assert.equal(cancelled.count,17);assert.equal(cancelled.love,100)
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);assert.deepEqual(await evaluate('__errors'),[])
 // New scrapbook surfaces and active scenery follow all four shared appearance modes.
 await tap('.nav-item:nth-child(4)');await tap('.appearance-option:nth-child(2)');await tap('.nav-item:nth-child(3)');await delay(800)
 assert.equal(await evaluate('getComputedStyle(document.querySelector(".scrapbook-entry")).backgroundColor'),'rgb(41, 57, 83)')
 await evaluate('scrollTo(0,0)');await shot('scrapbook-multiple-night');await tap('.memory-open')
 assert.equal(await evaluate('getComputedStyle(document.querySelector(".memory-dialog")).backgroundColor'),'rgb(24, 36, 61)')
 await tap('[aria-label="Close memory"]');await tap('.nav-item:nth-child(2)');await tap('.start-free-walk')
 await tap('.nav-item:nth-child(4)');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await tap('.appearance-option:nth-child(3)');await tap('.nav-item:nth-child(2)');await delay(800)
 assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-sky-object=moon]")).opacity'),'1')
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});await delay(800)
 assert.equal(await evaluate('document.documentElement.dataset.theme'),'light');assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-sky-object=moon]")).opacity'),'0')
 await tap('.nav-item:nth-child(4)');await tap('.appearance-option:nth-child(4)');await tap('.nav-item:nth-child(2)');await delay(800)
 assert.equal(await evaluate('document.documentElement.dataset.appearance'),'dynamic')
 const dynamic=await evaluate('({theme:document.documentElement.dataset.theme,moon:getComputedStyle(document.querySelector("[data-sky-object=moon]")).opacity})')
 assert.equal(dynamic.moon,dynamic.theme==='dark'?'1':'0')
 await evaluate('(async()=>{await S.cancelOuting(P(),(await state()).active.id);return true})()')
 assert.deepEqual(await evaluate('__errors'),[])
 console.log('PASS: close/reopen, cached nearby destination, all four modes and themed scrapbook/dialog, explicit camera chooser and gallery inputs, resize/JPEG/Blob storage, quota retry, corrupted replacement, draft refresh, atomic failed completion, idempotence, manual memory, daily cap, all accessory milestones, failed localStorage recovery, deletion and refresh persistence.')
 console.log('Screenshots: '+artifacts+'. Browser uses isolated local fixtures. No physical Android camera, live nearby response, or outdoor presence verification was performed by this test.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 socket?.close();browser?.kill();server.close();await delay(500)
 if(browserProfile){const resolved=path.resolve(browserProfile),temporary=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(temporary)||!path.basename(resolved).startsWith('outside-journey-test-'))throw new Error('Unsafe temporary browser profile path');try{fs.rmSync(resolved,{recursive:true,force:true})}catch{console.error('Temporary browser profile could not be removed:',resolved)}}
})
