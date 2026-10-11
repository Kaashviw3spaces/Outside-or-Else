const ts=require('typescript');require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(require('node:fs').readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {speechOptions}=require('../src/pets/dialogue.ts')
﻿// Scene browser regression and screenshots. Run after npm run build; requires installed Chrome.
// Chrome touch emulation is not a substitute for testing the actual Android phone.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const savedProfile = { version:1, profile:{id:'existing-pet',species:'cat',name:'Original',activities:['Walking'],outingTime:'09:30',duration:30,affection:45,sound:false,notifications:false} }
const server = http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'), root=path.resolve('dist')
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname))
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end()}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/svg+xml');res.end(fs.readFileSync(file))
})
let browser, socket, browserProfile
async function main(){
 assert.ok(fs.existsSync(chrome),'Set CHROME_PATH to an installed Chrome executable')
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const port=server.address().port
 browserProfile=fs.mkdtempSync(path.join(os.tmpdir(),'outside-scenes-test-'))
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

 const base={version:1,profile:{id:'scene-pet',species:'cat',name:'Miso',activities:['Walking','Reading outdoors'],outingTime:'17:30',duration:10,affection:10,sound:false,notifications:false}}
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.__errors=[];addEventListener('error',event=>__errors.push(event.message));Object.defineProperty(navigator,'geolocation',{value:undefined,configurable:true});const params=new URLSearchParams(location.search);const save="+JSON.stringify(base)+";save.profile.species=params.get('species')||'cat';save.profile.name=save.profile.species==='cat'?'Miso':'Maple';localStorage.setItem('outside-or-else:v1',JSON.stringify(save));localStorage.setItem('outside-or-else:appearance',params.get('mode')||'light');"})
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
 const tap=async selector=>{
  await waitFor('!!document.querySelector('+JSON.stringify(selector)+')');
  const point=await evaluate('(()=>{const button=document.querySelector('+JSON.stringify(selector)+');button.scrollIntoView({block:"center",behavior:"instant"});const r=button.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest("button,label,a")===button,w:r.width,h:r.height}})()');
  assert.ok(point.hit,'Control intercepted: '+selector);assert.ok(point.w>=44&&point.h>=44,'Touch target: '+selector)
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(350)
 }
 const screenshots=path.resolve('artifacts/ui-fixes');fs.mkdirSync(screenshots,{recursive:true});
 const shot=async name=>{const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(screenshots,name+'.png'),Buffer.from(data,'base64'))}
 const views=[[320,568],[360,800],[390,844],[430,932],[1440,900]]
 const cases=views.flatMap(([w,h])=>['cat','dog'].map(species=>({w,h,species,mode:'light'}))).concat(['dark','system','dynamic'].map(mode=>({w:390,h:844,species:'cat',mode})))
 for(const c of cases){
  await call('Emulation.setDeviceMetricsOverride',{width:c.w,height:c.h,deviceScaleFactor:1,mobile:c.w<768})
  await call('Page.navigate',{url:'http://127.0.0.1:'+port+'/?species='+c.species+'&mode='+c.mode});await waitFor('!!document.querySelector(".home-screen")');await delay(350)
  const result=await evaluate('(()=>{const r=el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};return {viewport:{width:innerWidth,height:innerHeight},scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,home:r(document.querySelector(".home-screen")),room:r(document.querySelector(".cozy-room")),pet:r(document.querySelector(".pet-touch")),hud:r(document.querySelector(".room-hud")),actions:r(document.querySelector(".room-actions")),nav:r(document.querySelector(".bottom-nav")),bubble:r(document.querySelector(".speech-bubble")),love:document.querySelector("[role=progressbar]").getAttribute("aria-valuenow")}})()')
  assert.ok(result.scrollWidth<=c.w,'Horizontal overflow');assert.ok(result.scrollHeight<=c.h,'Unwanted Home scrolling '+JSON.stringify(result))
  if(c.w<768){assert.equal(result.home.width,c.w);assert.equal(result.home.height,c.h)}
  assert.ok(await evaluate('(()=>{const svg=document.querySelector(".room-art"),room=document.querySelector(".cozy-room").getBoundingClientRect();return Math.abs(svg.getBoundingClientRect().height-room.height)<1&&Math.abs(svg.viewBox.baseVal.height/480-room.height/room.width)<.01})()'),'Room illustration fills scene rather than a centered strip')
  assert.ok(result.pet.left>=result.room.left&&result.pet.right<=result.room.right&&result.pet.top>=result.room.top&&result.pet.bottom<=result.actions.top,'Full pet clear of controls '+JSON.stringify(result))
  assert.ok(result.bubble.bottom<result.pet.top+result.pet.width*80/300,'Speech above face')
  assert.ok(result.hud.bottom<result.pet.top+result.pet.width*80/300,'HUD above face')
  assert.ok(result.actions.bottom<result.nav.top,'Actions clear of dock');assert.ok(result.nav.bottom<=c.h,'Dock accessible')
  await tap('.pet-touch');assert.equal(await evaluate('document.querySelector("[role=progressbar]").getAttribute("aria-valuenow")'),result.love)
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("outside-or-else:v1")).profile.affection'),10)
  await tap('.pet-talk-orb');assert.equal(await evaluate('document.activeElement.id'),'conversation-input')
  const petName=c.species==='cat'?'Miso':'Maple'
  assert.equal(await evaluate('document.querySelector("#conversation-title").textContent'),'Talk to '+petName)
  assert.ok(speechOptions(c.species,'shy','talk').includes((await evaluate('document.querySelector(".speech-bubble").textContent')).slice(1,-1)),'Talk uses a species-specific scripted greeting')
  assert.equal(await evaluate('!!document.querySelector(":modal")'),false,'Conversation is not a modal')
  assert.ok(await evaluate('document.querySelector(".conversation-hud").closest(".home-screen")!==null'),'Conversation belongs to game scene')
  assert.ok(await evaluate('document.querySelector(".pet-touch").getBoundingClientRect().bottom<document.querySelector(".conversation-hud").getBoundingClientRect().top'),'Pet clear of conversation')
  await evaluate('(()=>{const input=document.querySelector("#conversation-input");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"Hello, little friend!");input.dispatchEvent(new Event("input",{bubbles:true}))})()')
  await tap('[aria-label="Send message"]');assert.equal(await evaluate('document.querySelector(".user-speech-bubble p").textContent'),'Hello, little friend!')
  assert.equal(await evaluate('document.querySelectorAll(".user-speech-bubble").length'),1,'Only actual user messages')
  assert.ok(await evaluate('document.querySelector(".conversation-compose button").disabled'),'Empty messages disabled')
  assert.ok(await evaluate('document.querySelector(".pet-touch").getBoundingClientRect().bottom<document.querySelector(".conversation-hud").getBoundingClientRect().top'),'Pet clear of message history')
  if(c.w===390&&['light','dark'].includes(c.mode)&&c.species==='cat')await shot('conversation-390x844-'+c.mode)
  if(c.w===1440&&c.species==='cat')await shot('conversation-desktop')
  // Shrink and restore the viewport as a keyboard-layout regression, not a physical keyboard claim.
  await call('Emulation.setDeviceMetricsOverride',{width:c.w,height:Math.min(350,c.h),deviceScaleFactor:1,mobile:c.w<768});await delay(400)
  assert.ok(await evaluate('document.querySelector(".conversation-compose").getBoundingClientRect().bottom<=visualViewport.height+visualViewport.offsetTop'),'Compose stays visible with smaller viewport')
  if(c.w<768){
   assert.ok(await evaluate('document.querySelector(".pet-touch").getBoundingClientRect().bottom<document.querySelector(".conversation-hud").getBoundingClientRect().top'),'Keyboard simulation keeps entire pet clear of input')
   await shot('keyboard-diagnostic-'+c.w+'-'+c.species+'-'+c.mode)
   assert.ok(await evaluate('document.querySelector(".speech-bubble").getBoundingClientRect().bottom<document.querySelector(".pet-touch").getBoundingClientRect().top+document.querySelector(".pet-touch").getBoundingClientRect().width*80/300'),'Keyboard speech clear of face')
  }
  if(c.w===390&&c.mode==='light'&&c.species==='cat')await shot('conversation-keyboard-simulation')
  await call('Emulation.setDeviceMetricsOverride',{width:c.w,height:c.h,deviceScaleFactor:1,mobile:c.w<768});await delay(100)
  await tap('[aria-label="Close conversation"]');assert.equal(await evaluate('document.activeElement.classList.contains("pet-talk-orb")'),true,'Focus restored')
  await tap('.pet-talk-orb');assert.equal(await evaluate('document.querySelector(".user-speech-bubble p").textContent'),'Hello, little friend!','Session survives close and reopen')
  await tap('[aria-label="Close conversation"]')
  await tap('.environment-controls button');assert.ok(await evaluate('document.querySelector(".pet-character").classList.contains("mood-sleepy")'),'Sleeping preserved')
  await tap('.pet-talk-orb');assert.ok(await evaluate('document.querySelector(".pet-character").classList.contains("mood-idle")'),'Attentive awake expression during Talk')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".pet-head")).animationName'),'attentive-listen')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".pet-body")).animationName'),'breathe')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".pet-eyes")).animationName'),'blink')
  await tap('[aria-label="Close conversation"]');assert.ok(await evaluate('document.querySelector(".pet-character").classList.contains("mood-sleepy")'),'Closing restores sleep')
  await tap('.environment-controls button');await tap('.feed-action');assert.ok(await evaluate('document.querySelector(".food-bowl")!==null'),'Feeding preserved')
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("outside-or-else:v1")).profile.affection'),10,'Interactions do not change progression')
  if(c.mode==='light'||c.mode==='dark')await shot('home-'+c.species+'-'+c.w+'x'+c.h+'-'+c.mode)
  for(const [page,index] of [['adventure',2],['memories',3],['settings',4]]){
   await tap('.nav-item:nth-child('+index+')');assert.ok(await evaluate('!!document.querySelector(".'+page+'-screen")'),'Scene navigation '+page)
   assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Scene horizontal overflow '+page)
   if(page==='adventure'){assert.ok(await evaluate('document.querySelector(".nearby-section .primary-button").getAttribute("aria-label")==="Find adventures near me"'),'Discovery still available');await tap('.nearby-section .primary-button');assert.match(await evaluate('document.querySelector(".nearby-status").textContent'),/browser/)}
   if(c.w===390&&c.mode==='light'&&c.species==='cat')await shot(page+'-390x844')
  }
  if(c.w===390&&c.mode==='light'&&c.species==='cat'){
   await evaluate('localStorage.setItem("outside-or-else:nearby-v1","fixture")');await tap('.clear-nearby-cache');assert.equal(await evaluate('localStorage.getItem("outside-or-else:nearby-v1")'),null)
   await evaluate('(()=>{const input=document.querySelector("#settings-name");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"Miso Moon");input.dispatchEvent(new Event("input",{bubbles:true}))})()')
   await tap('.duration-options button:nth-child(4)');await tap('.settings-screen .primary-button[type=submit]')
   const saved=await evaluate('JSON.parse(localStorage.getItem("outside-or-else:v1")).profile');assert.equal(saved.name,'Miso Moon');assert.equal(saved.duration,30);assert.equal(saved.id,'scene-pet');assert.equal(saved.affection,10)
  }
  await tap('.appearance-option:nth-child(2)');assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark')
  await tap('.nav-item:nth-child(1)');assert.equal(await evaluate('document.querySelector(".cozy-room").dataset.roomTheme'),'dark')
  assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-scenery=day]")).opacity'),'0')
  await tap('.nav-item:nth-child(4)');await tap('.appearance-option:nth-child(1)');await tap('.nav-item:nth-child(1)')
  assert.equal(await evaluate('document.querySelector(".cozy-room").dataset.roomTheme'),'light')
  assert.equal(await evaluate('getComputedStyle(document.querySelector("[data-sky-object=moon]")).opacity'),'0')
  if(c.w===390&&c.mode==='light'&&c.species==='cat'){
   await tap('.pet-talk-orb');assert.equal(await evaluate('document.querySelector("#conversation-title").textContent'),'Talk to Miso Moon','Settings rename updates conversation identity')
   for(let i=0;i<4;i++){
    await evaluate('(()=>{const input=document.querySelector("#conversation-input");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"Earlier message '+i+'");input.dispatchEvent(new Event("input",{bubbles:true}))})()');await tap('.conversation-compose button')
   }
   assert.ok(await evaluate('document.querySelector(".conversation-scroll").scrollHeight>document.querySelector(".conversation-scroll").clientHeight'),'Earlier history scrolls inside compact HUD')
   assert.ok(await evaluate('document.querySelector(".pet-touch").getBoundingClientRect().bottom<document.querySelector(".conversation-hud").getBoundingClientRect().top'),'History does not cover pet')
   await tap('[aria-label="Close conversation"]')
   await tap('.talk-action');assert.equal(await evaluate('document.activeElement.id'),'conversation-input','Bottom Talk action focuses composer')
   await tap('[aria-label="Close conversation"]');assert.ok(await evaluate('document.activeElement.classList.contains("pet-talk-orb")'),'Focus restored when original action was unmounted')
  }
  assert.deepEqual(await evaluate('__errors'),[])
  console.log('PASS: '+c.w+'×'+c.h+' '+c.species+' '+c.mode+'; full room, HUD, touch, chat/focus/keyboard resize, navigation, discovery and theme switching')
 }
 console.log('Screenshots: '+screenshots+'; no physical Android testing performed.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 socket?.close();browser?.kill();server.close();await delay(500)
 if(browserProfile){const resolved=path.resolve(browserProfile),temporary=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(temporary)||!path.basename(resolved).startsWith('outside-scenes-test-'))throw new Error('Unsafe temporary browser profile path');try{fs.rmSync(resolved,{recursive:true,force:true})}catch{console.error('Temporary browser profile could not be removed:',resolved)}}
})
