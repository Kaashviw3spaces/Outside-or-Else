// Browser regression without dependencies. Run after npm run build.
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
 browserProfile=fs.mkdtempSync(path.join(os.tmpdir(),'outside-onboarding-test-'))
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
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__errors=[];addEventListener('error',event=>__errors.push(event.message));const scenario=new URLSearchParams(location.search).get('scenario');if(sessionStorage.getItem('onboarding-test-case')!==scenario){localStorage.clear();sessionStorage.setItem('onboarding-test-case',scenario);if(scenario==='existing')localStorage.setItem('outside-or-else:v1',${JSON.stringify(JSON.stringify(savedProfile))});}if(scenario==='blocked'){const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='outside-or-else:v1')throw new DOMException('blocked','QuotaExceededError');return original.call(this,key,value)}}if(scenario==='no-crypto')Object.defineProperty(window,'crypto',{value:undefined,configurable:true});`})
 const tap=async selector=>{
  await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`)
  const point=await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});button.scrollIntoView({block:'center',behavior:'instant'});const r=button.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===button}})()`)
  assert.ok(point.hit,'Tap is intercepted: '+selector);assert.ok(point.width>=44&&point.height>=44,'Touch target too small: '+selector)
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,radiusX:1,radiusY:1,force:1}]})
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(350)
 }
 const scenarios=[{name:'lan-cat',w:360,h:800,species:'cat'},{name:'lan-dog',w:390,h:844,species:'dog'},{name:'blocked',w:360,h:800,species:'cat'},{name:'retry',w:390,h:844,species:'cat'},{name:'no-crypto',w:360,h:800,species:'dog'},{name:'late-existing',w:390,h:844,species:'cat'},{name:'existing',w:360,h:800,species:'cat'},{name:'secure',w:390,h:844,species:'cat'}]
 for(const scenario of scenarios){
  await call('Emulation.setDeviceMetricsOverride',{width:scenario.w,height:scenario.h,deviceScaleFactor:1,mobile:true})
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
  await call('Network.setUserAgentOverride',{userAgent:'Mozilla/5.0 (Linux; Android 13; moto g) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'})
  const host=scenario.name==='secure'?'127.0.0.1':'outside-or-else.test'
  await call('Page.navigate',{url:`http://${host}:${port}/?scenario=${scenario.name}`})
  await waitFor("!!document.querySelector('.app-shell')")
  const context=await evaluate('({secure:isSecureContext,uuid:typeof window.crypto?.randomUUID})')
  if(scenario.name!=='secure'){assert.equal(context.secure,false);assert.equal(context.uuid,'undefined')}
  else {assert.equal(context.secure,true);assert.equal(context.uuid,'function')}
  if(scenario.name==='existing'){
   await waitFor("!!document.querySelector('.home-screen')")
   assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('outside-or-else:v1'))"),savedProfile)
   console.log('PASS: existing save loads unchanged');continue
  }
  await tap('.skip-splash')
  for(let step=0;step<6;step++){
   assert.equal(await evaluate("document.querySelector('.step-label').textContent"),`${step+1} / 7`)
   if(step===1&&scenario.species==='dog')await tap('.companion-card:nth-child(2)')
   if(step===2)await evaluate(`(()=>{const input=document.querySelector('#pet-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Journey');input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
   if(step===3)await tap('.activity-option:nth-child(4)')
   if(step===5)await tap('.duration-options button:nth-child(3)')
   await tap('.onboarding-footer .primary-button')
  }
  assert.equal(await evaluate("document.querySelector('.step-label').textContent"),'7 / 7')
  if(scenario.name==='late-existing')await evaluate(`localStorage.setItem('outside-or-else:v1',${JSON.stringify(JSON.stringify(savedProfile))})`)
  if(scenario.name==='retry'){
   await evaluate("window.__originalCrypto=window.crypto;Object.defineProperty(window,'crypto',{configurable:true,get(){throw new Error('injected creation failure')}});void 0")
   await tap('.onboarding-footer .primary-button')
   assert.match(await evaluate("document.querySelector('.onboarding-footer [role=alert]').textContent"),/retry/)
   assert.equal(await evaluate("document.querySelector('.step-label').textContent"),'7 / 7')
   await evaluate("Object.defineProperty(window,'crypto',{configurable:true,value:window.__originalCrypto});void 0")
  }
  await tap('.onboarding-footer .primary-button')
  await waitFor("!!document.querySelector('.home-screen')")
  assert.equal(await evaluate("!!document.querySelector('.onboarding')"),false)
  assert.equal(await evaluate('scrollY'),0)
  assert.deepEqual(await evaluate('__errors'),[],'No unhandled completion exception')
  if(scenario.name==='blocked'){
   assert.match(await evaluate("document.querySelector('.storage-warning').textContent"),/storage.*unavailable/i)
   assert.equal(await evaluate("localStorage.getItem('outside-or-else:v1')"),null)
  }else{
   const saved=await evaluate("JSON.parse(localStorage.getItem('outside-or-else:v1'))")
   if(scenario.name==='late-existing')assert.deepEqual(saved,savedProfile)
   else{assert.ok(saved.profile.id);assert.equal(saved.profile.species,scenario.species);assert.equal(saved.profile.name,'Journey');assert.equal(saved.profile.duration,15);assert.deepEqual(saved.profile.activities,['Walking','Reading outdoors']);assert.equal(saved.profile.affection,10)}
   await call('Page.reload');await waitFor("!!document.querySelector('.home-screen')")
   assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('outside-or-else:v1'))"),saved)
  }
  console.log(`PASS: ${scenario.name} ${scenario.w}×${scenario.h}, all seven steps, touch completion, Home${scenario.name==='blocked'?', visible storage warning':', profile and refresh persistence'}`)
 }
 console.log('PASS: real insecure HTTP origin confirmed; randomUUID is unavailable. Physical Android verification remains required.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 socket?.close();browser?.kill();server.close();await delay(500)
 if(browserProfile){const resolved=path.resolve(browserProfile),temporary=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(temporary)||!path.basename(resolved).startsWith('outside-onboarding-test-'))throw new Error('Unsafe temporary browser profile path');try{fs.rmSync(resolved,{recursive:true,force:true})}catch{console.error('Temporary browser profile could not be removed:',resolved)}}
})
