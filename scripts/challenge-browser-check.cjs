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
 browserProfile=fs.mkdtempSync(path.join(os.tmpdir(),'outside-challenge-test-'))
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
 const bootstrap=`window.__NativeDate=Date;class ControlledDate extends Date{constructor(...a){super(...(a.length?a:[Number(localStorage.getItem('__challenge-test-now'))||new __NativeDate(2026,9,10,12).getTime()]))}static now(){return Number(localStorage.getItem('__challenge-test-now'))||new __NativeDate(2026,9,10,12).getTime()}}window.Date=ControlledDate;window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));window.__gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){__gpsCalls++;throw Error('Unexpected GPS request')}},configurable:true});if(!localStorage.getItem('outside-or-else:v1'))localStorage.setItem('outside-or-else:v1',${JSON.stringify(JSON.stringify({version:1,profile}))});if(!localStorage.getItem('outside-or-else:appearance'))localStorage.setItem('outside-or-else:appearance','light');`
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
 const importService=()=>evaluate("(async()=>{window.S=await import('/__source/src/journey/service.ts');window.DB=await import('/__source/src/journey/database.ts');window.P=()=>JSON.parse(localStorage.getItem('outside-or-else:v1')).profile;window.state=()=>S.getJourneyData(P().id);window.ledger=async()=>{const db=await DB.openJourneyDB();return DB.requestValue(db.transaction(['outings']).objectStore('outings').getAll())};return true})()")
 const artifacts=path.resolve('artifacts/checkpoint-8');fs.mkdirSync(artifacts,{recursive:true})
 const shot=async name=>{const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(data,'base64'))}

 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await call('Page.navigate',{url});await waitFor('!!document.querySelector(".home-screen")');await importService()
 const importChallenge=()=>evaluate("(async()=>{window.C=await import('/__source/src/challenge/service.ts');window.R=await import('/__source/src/challenge/rules.ts');window.clock=d=>({now:new __NativeDate(2026,9,d,12).getTime(),timezone:C.clockNow().timezone,mono:d*86400000,session:'controlled-test'});window.date=d=>localStorage.setItem('__challenge-test-now',clock(d).now);return true})()")
 await importChallenge()
 assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(20))).enabled)()'),false)
 await tap('.nav-item:nth-child(4)');await tap('.challenge-enable');assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(10))).enabled)()'),false,'First button only asks explicit opt-in')
 await tap('.confirm-challenge');assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(10))).enabled)()'),true)
 await evaluate("(async()=>{date(11);return C.evaluateChallenge(P(),clock(11))})()");assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(11))).missedDayStreak)()'),0)
 await evaluate("(async()=>{date(12);const s=await C.evaluateChallenge(P(),clock(12));window.dispatchEvent(new Event('challenge-changed'));return s})()");await tap('.nav-item:nth-child(1)');await waitFor('document.querySelector(".challenge-status")?.textContent.includes("One missed day")')
 assert.ok(await evaluate('document.querySelector(".home-screen .pet-character").classList.contains("mood-sad")'),'Gentle reminder mood')
 await shot('first-missed-day-390x844');await reopen(390,844);await waitFor('document.querySelector(".challenge-status")?.textContent.includes("One missed day")');await importService();await importChallenge()
 await tap('.nav-item:nth-child(4)');await tap('.challenge-pause');await evaluate('date(25)')
 assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(25))).separatedAt)()'),null)
 await tap('.challenge-pause');assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(26))).missedDayStreak)()'),0,'Resume grace; pause interval excluded')
 // Restart the test grace on day 10 and create a real native IndexedDB manual photo.
 await evaluate("(async()=>{date(10);await C.configureChallenge(P(),'disable',clock(10));await C.configureChallenge(P(),'enable',clock(10));const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;canvas.getContext('2d').fillRect(0,0,100,100);window.photo={blob:await new Promise(r=>canvas.toBlob(r,'image/jpeg')),width:100,height:100};const m=await S.manualDraft(P());await S.attachPhoto(P(),m.id,photo);await S.finishMemory(P(),m.id,'Manual photo');return true})()")
 assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(12))).missedDayStreak)()'),1,'Manual photo does not qualify')
 // A completed early-return outing with a saved photo qualifies; duration goal is not required.
 await evaluate("(async()=>{date(12);const a=await S.startOuting(P(),null,Date.now()-1000);await S.returnFromOuting(P(),a.id);await S.attachPhoto(P(),a.id,photo);window.qualified=await S.finishMemory(P(),a.id,'Unverified outdoor photo');return C.evaluateChallenge(P(),clock(12))})()")
 assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(12))).missedDayStreak)()'),0)
 assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(12))).lastQualifyingDate)()'),'2026-10-12')
 await evaluate("(async()=>{await S.finishMemory(P(),qualified.id,'Duplicate');return C.evaluateChallenge(P(),clock(12))})()")
 assert.equal(await evaluate('(async()=>(await state()).memories.filter(r=>r.id===qualified.id).length)()'),1)
 // A missing photo blocks evaluation rather than treating a lost file as a missed day.
 await evaluate("(async()=>{window.backupPhoto=await S.getPhoto(qualified.photoId);const db=await DB.openJourneyDB(),t=db.transaction(['photos'],'readwrite'),done=DB.transactionDone(t);t.objectStore('photos').delete(qualified.photoId);await done;date(15);return true})()")
 const missing=await evaluate('(async()=>{try{await C.evaluateChallenge(P(),clock(15));return "unexpected"}catch(e){return e.message}})()');assert.match(missing,/missing/)
 assert.equal(await evaluate("(async()=>{const d=await DB.openJourneyDB();return (await DB.requestValue(d.transaction(['meta']).objectStore('meta').get('challenge'))).value.separatedAt})()"),null)
 await evaluate("(async()=>{const d=await DB.openJourneyDB(),t=d.transaction(['photos'],'readwrite'),done=DB.transactionDone(t);t.objectStore('photos').put(backupPhoto);await done;return true})()")
 // Failed archive transaction and failed localStorage confirmation must not commit separation.
 await evaluate("window.__put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,...a){if(this.name==='meta'&&v.id.startsWith('legacy:'))throw new DOMException('Archive quota test','QuotaExceededError');return __put.call(this,v,...a)}")
 assert.match(await evaluate('(async()=>{try{await C.evaluateChallenge(P(),clock(15));return "unexpected"}catch(e){return e.name}})()'),/Quota/)
 await evaluate('IDBObjectStore.prototype.put=__put')
 await evaluate("window.__set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='outside-or-else:v1')throw new DOMException('Profile quota test','QuotaExceededError');return __set.call(this,k,v)}")
 assert.match(await evaluate('(async()=>{try{await C.evaluateChallenge(P(),clock(15));return "unexpected"}catch(e){return e.message}})()'),/protected/)
 await evaluate('Storage.prototype.setItem=__set')
 assert.equal(await evaluate('(async()=>(await C.legacyPets()).length)()'),0)
 // Change timezone and clock safely, then resume from a new grace day.
 const zone=await evaluate('(async()=>{const s=await C.evaluateChallenge(P(),{...clock(15),timezone:"Changed/Zone"});return {missed:s.missedDayStreak,separated:s.separatedAt}})()');assert.equal(zone.missed,0);assert.equal(zone.separated,null)
 const backward=await evaluate('(async()=>(await C.evaluateChallenge(P(),clock(14))).paused)()');assert.equal(backward,true)
 await evaluate("(async()=>{date(15);await C.configureChallenge(P(),'resume',clock(15));date(18);const s=await C.evaluateChallenge(P(),clock(18));window.dispatchEvent(new Event('challenge-changed'));return s})()")
 await waitFor('!!document.querySelector(".farewell-screen")')
 const separation=await evaluate('(async()=>{const first=await C.evaluateChallenge(P(),clock(18)),second=await C.evaluateChallenge(P(),clock(19));return {at:first.separatedAt,again:second.separatedAt,legacy:await C.legacyPets()}})()')
 assert.equal(separation.at,separation.again);assert.equal(separation.legacy.length,1);assert.equal(separation.legacy[0].profile.pet.breed,'siamese');assert.equal(separation.legacy[0].profile.pet.equippedAccessory,'pink-bow')
 assert.equal(await evaluate('document.querySelector(".farewell-pet svg").dataset.breed'),'siamese')
 for(const [width,height] of [[320,568],[360,800],[390,844],[430,932]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(350)
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Farewell no horizontal overflow')
  assert.ok(await evaluate('(()=>{const p=document.querySelector(".farewell-pet").getBoundingClientRect(),r=document.querySelector(".farewell-screen .cozy-room").getBoundingClientRect();return p.left>=r.left&&p.right<=r.right&&p.top>=r.top&&p.bottom<=r.bottom})()'),'Farewell pet fully visible')
  await evaluate('scrollTo(0,0)');await shot('farewell-'+width+'x'+height)
 }
 await call('Page.reload');await waitFor('!!document.querySelector(".farewell-screen")');await importService();await importChallenge()
 assert.equal(await evaluate('(async()=>(await C.legacyPets()).length)()'),1,'Refresh does not repeat archive')
 await tap('.nav-item:nth-child(3)');await waitFor('document.querySelectorAll(".scrapbook-entry").length===2')
 assert.equal(await evaluate('document.querySelector(".legacy-generation").dataset.generation'),'1');assert.ok(await evaluate('!!document.querySelector(".scrapbook-entry img")'))
 await tap('.nav-item:nth-child(4)');await tap('.appearance-option:nth-child(2)');await tap('.nav-item:nth-child(1)');await delay(800);await shot('farewell-night')
 assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark')
 await tap('.open-readoption');await waitFor('!!document.querySelector(".readoption-screen")');await tap('.adoption-species button:nth-child(2)');await tap('[data-select-breed="corgi"]')
 await evaluate("(()=>{const input=document.querySelector('#new-companion-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Maple');input.dispatchEvent(new Event('input',{bubbles:true}))})()")
 await tap('.personality-options button:nth-child(3)');await shot('readoption-center')
 const previous=await evaluate('P()')
 await evaluate("window.__oldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='outside-or-else:v1')throw new DOMException('Adoption mirror test','QuotaExceededError');return __oldSet.call(this,k,v)}");await tap('.adopt-again');await waitFor('!!document.querySelector(".home-screen")');await waitFor('document.querySelector(".pet-name").textContent==="Maple"')
 assert.ok(await evaluate('!!document.querySelector(".storage-warning")'),'Failed adoption mirror is visible');await evaluate('Storage.prototype.setItem=__oldSet');await call('Page.reload');await waitFor('document.querySelector(".pet-name")?.textContent==="Maple"');await importService();await importChallenge();const next=await evaluate('P()');assert.notEqual(next.id,previous.id);assert.equal(next.affection,10);assert.equal(next.pet.generation,2);assert.equal(next.pet.breed,'corgi');assert.equal(next.pet.personality,'curious');assert.equal(next.pet.relationshipHistory.length,1)
 assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark','Global appearance preserved')
 await importService();await importChallenge();assert.equal(await evaluate('(async()=>(await C.evaluateChallenge(P())).currentPetId)()'),next.id)
 assert.equal(await evaluate('(async()=>!!(await S.getPhoto((await state()).memories.find(r=>r.kind==="outing").photoId)))()'),true)
 await call('Page.reload');await waitFor('document.querySelector(".pet-name")?.textContent==="Maple"');await importService();await importChallenge()
 await tap('.nav-item:nth-child(3)');await waitFor('!!document.querySelector(".legacy-generation")');assert.match(await evaluate('document.querySelector(".legacy-chapter").textContent'),/Generation 1/);await shot('legacy-scrapbook-night')
 // Duplicate/stale re-adoption returns the existing active identity instead of another generation.
 const twice=await evaluate(`(async()=>{const old=${JSON.stringify(previous)},choice={species:'cat',breed:'orange-tabby',fur:'orange',personality:'playful',name:'Other'};const a=await Promise.all([C.readopt(old,choice),C.readopt(old,choice)]);return a.map(r=>r.profile.id)})()`)
 assert.deepEqual(twice,[next.id,next.id]);assert.equal(await evaluate('P().name'),'Maple')
 // Corrupt challenge metadata must produce an error without a new separation/legacy record.
 const corrupt=await evaluate("(async()=>{const d=await DB.openJourneyDB(),t=d.transaction(['meta'],'readwrite'),done=DB.transactionDone(t),store=t.objectStore('meta');window.goodState=(await DB.requestValue(store.get('challenge'))).value;store.put({id:'challenge',value:{...goodState,lastEvaluationDate:'invalid'}});await done;try{await C.evaluateChallenge(P());return 'unexpected'}catch(e){return e.message}})()")
 assert.match(corrupt,/invalid|protected/);assert.equal(await evaluate('(async()=>(await C.legacyPets()).length)()'),1)
 await evaluate("(async()=>{const d=await DB.openJourneyDB(),t=d.transaction(['meta'],'readwrite'),done=DB.transactionDone(t);t.objectStore('meta').put({id:'challenge',value:goodState});await done;return true})()")
 assert.deepEqual(await evaluate('__errors'),[])
 console.log('PASS: default OFF/explicit opt-in, grace/missed/reset/manual exclusion, pause/resume, duplicates, missing photo protection, atomic archive/storage failures, timezone/back-clock protection, one-time farewell, all mobile sizes, refresh, existing adoption picker, new ID/generation/10%/history, legacy photo preservation and night compatibility. No physical Android test performed.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 socket?.close();browser?.kill();server.close();await delay(500)
 if(browserProfile){const resolved=path.resolve(browserProfile),temporary=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(temporary)||!path.basename(resolved).startsWith('outside-challenge-test-'))throw new Error('Unsafe temporary browser profile path');try{fs.rmSync(resolved,{recursive:true,force:true})}catch{console.error('Temporary browser profile could not be removed:',resolved)}}
})
