const ts=require('typescript');require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(require('node:fs').readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {dialogueOptions}=require('../src/dialogue/index.ts')
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
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__errors=[];addEventListener('error',event=>__errors.push(event.message));Object.defineProperty(navigator,'geolocation',{value:undefined,configurable:true});const params=new URLSearchParams(location.search);const NativeDate=Date;window.__clock=new NativeDate(2026,9,10,Number(params.get('hour')||9),0,0).getTime();window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[window.__clock]))}static now(){return window.__clock}};Math.random=()=>0;const save=${JSON.stringify(base)};save.profile.species=params.get('species')||'cat';save.profile.name=save.profile.species==='cat'?'Miso':'Maple';save.profile.affection=Number(params.get('affection')||10);save.profile.pet={breed:save.profile.species==='cat'?'siamese':'shiba-inu',furVariation:'orange',personality:params.get('personality')||'playful',generation:1,relationshipHistory:[],adoptedAt:null};localStorage.setItem('outside-or-else:v1',JSON.stringify(save));localStorage.setItem('outside-or-else:appearance',params.get('mode')||'light');`})
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
 const tap=async selector=>{
  await waitFor('!!document.querySelector('+JSON.stringify(selector)+')');
  const point=await evaluate('(()=>{const button=document.querySelector('+JSON.stringify(selector)+');button.scrollIntoView({block:"center",behavior:"instant"});const r=button.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest("button,label,a")===button,w:r.width,h:r.height}})()');
  assert.ok(point.hit,'Control intercepted: '+selector);assert.ok(point.w>=44&&point.h>=44,'Touch target: '+selector)
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(350)
 }

 const hours=[[9,'morning'],[13,'afternoon'],[18,'golden-hour'],[21,'night']]
 let cases=0
 for(const species of ['cat','dog'])for(const personality of ['playful','sleepy','curious','shy','mischievous'])for(const affection of [10,50,90])for(const [hour,phase] of hours){
  const width=[360,390,430][cases%3],height=width===360?800:width===390?844:932
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:`http://127.0.0.1:${port}/?species=${species}&personality=${personality}&affection=${affection}&hour=${hour}`})
  await waitFor('!!document.querySelector(".home-screen [data-pet-speech=idle]")');await delay(350) // Existing room arrival/pet position transition is 280 ms.
  const actual=await evaluate('(()=>{const line=document.querySelector("[data-pet-speech=idle]"),bubble=document.querySelector(".speech-bubble").getBoundingClientRect(),pet=document.querySelector(".pet-touch").getBoundingClientRect();return {text:line.textContent,phase:line.dataset.speechPhase,band:line.dataset.affectionBand,clear:bubble.bottom<pet.top+pet.width*80/300,overflow:document.documentElement.scrollWidth>innerWidth,stored:localStorage.getItem("outside-or-else:v1")}})()')
  assert.equal(actual.phase,phase);assert.equal(actual.band,affection===10?'new':affection===50?'familiar':'bonded')
  assert.ok(dialogueOptions(species,personality,'idle',{phase,affection}).includes(actual.text),'Actual contextual Home speech')
  assert.ok(actual.clear,'Speech clear of face: '+JSON.stringify({species,personality,affection,hour,width,text:actual.text}));assert.equal(actual.overflow,false)
  // Actual React selection is verified above. Stress each alternative through native layout,
  // then restore the selected text before React continues; no saved game state is changed.
  const candidates=dialogueOptions(species,personality,'idle',{phase,affection})
  const layoutFailures=await evaluate('(()=>{const line=document.querySelector("[data-pet-speech=idle]"),original=line.textContent,failures=[];for(const copy of '+JSON.stringify(candidates)+'){line.textContent=copy;const bubble=document.querySelector(".speech-bubble").getBoundingClientRect(),pet=document.querySelector(".pet-touch").getBoundingClientRect();if(bubble.bottom>=pet.top+pet.width*80/300)failures.push(copy)}line.textContent=original;return failures})()')
  assert.deepEqual(layoutFailures,[],'All idle variations clear the pet face: '+JSON.stringify({species,personality,affection,hour,width}))

  assert.equal(JSON.parse(actual.stored).profile.affection,affection)
  assert.deepEqual(await evaluate('__errors'),[])
  cases++
 }
 console.log('PASS: '+cases+' actual Home contexts across both species, five personalities, three affection bands and four controlled times; 360x800/390x844/430x932; 480 alternative layouts, readable bubbles, visible pets and unchanged saves')
 // A clock boundary updates dialogue immediately on app focus; manual Day does not change palette.
 await call('Page.navigate',{url:`http://127.0.0.1:${port}/?species=cat&personality=curious&affection=50&hour=9&mode=light`})
 await waitFor('document.querySelector("[data-pet-speech=idle]")?.dataset.speechPhase==="morning"')
 const before=await evaluate('localStorage.getItem("outside-or-else:v1")')
 await evaluate('window.__clock+=12*3600000;window.dispatchEvent(new Event("focus"))')
 await waitFor('document.querySelector("[data-pet-speech=idle]")?.dataset.speechPhase==="night"')
 assert.equal(await evaluate('document.documentElement.dataset.theme'),'light','Dialogue clock never overrides manual Day')
 for(const event of ['petting','feeding']){
  const heard=[]
  for(let i=0;i<4;i++){await tap(event==='petting'?'.pet-action':'.feed-action');const line=(await evaluate('document.querySelector(".speech-bubble").textContent')).slice(1,-1);assert.ok(dialogueOptions('cat','curious',event).includes(line));heard.push(line)}
  assert.equal(new Set(heard).size,4,'Actual common interactions avoid recent repeats')
 }
 assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before)
 for(const mode of ['light','dark','system','dynamic']){
  await call('Page.navigate',{url:`http://127.0.0.1:${port}/?species=dog&personality=mischievous&affection=90&hour=21&mode=${mode}`})
  await waitFor('!!document.querySelector(".home-screen")');await delay(350);assert.deepEqual(await evaluate('__errors'),[])
  assert.ok(await evaluate('document.querySelector(".speech-bubble").getBoundingClientRect().bottom<document.querySelector(".pet-touch").getBoundingClientRect().top+document.querySelector(".pet-touch").getBoundingClientRect().width*80/300'))
 }
 console.log('PASS: live time boundary, manual-theme priority, four actual no-repeat interactions, unchanged storage and all four appearance modes. No physical Android test.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{socket?.close();browser?.kill();server.close();await delay(500);if(browserProfile)fs.rmSync(browserProfile,{recursive:true,force:true,maxRetries:10,retryDelay:200})})
