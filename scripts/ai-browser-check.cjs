// Scene browser regression and screenshots. Run after npm run build; requires installed Chrome.
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
 // Apply to worker responses too: CDP page blocking alone may miss worker targets.
 if(!process.argv.includes('--live'))res.setHeader('Content-Security-Policy',"connect-src 'self'");
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.wasm')?'application/wasm':'image/svg+xml');res.end(fs.readFileSync(file))
})
let browser, socket, browserProfile
async function main(){
 if(process.argv.includes('--compare'))assert.ok(process.argv.includes('--live')&&process.argv.includes('--gpu'),'--compare requires explicit --live --gpu (Qwen WebGPU only)');
 if(process.argv.includes('--reliability'))assert.ok(process.argv.includes('--live')&&process.argv.includes('--gpu'),'--reliability requires explicit authorization and --live --gpu (Qwen only)');
 assert.ok(fs.existsSync(chrome),'Set CHROME_PATH to an installed Chrome executable')
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const port=server.address().port
 browserProfile=fs.mkdtempSync(path.join(os.tmpdir(),'outside-scenes-test-'))
 browser=spawn(chrome,['--headless', ...(process.argv.includes('--gpu') ? [] : ['--disable-gpu']),'--no-first-run','--no-proxy-server','--remote-debugging-port=0','--host-resolver-rules=MAP outside-or-else.test 127.0.0.1','--user-data-dir='+browserProfile,'about:blank'],{windowsHide:true,stdio:'ignore'})
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
 const waitFor=async expression=>{for(let i=0;i<400;i++){if(await evaluate(expression))return;await delay(50)}throw new Error('Timed out waiting for '+expression)}
 await call('Page.enable');await call('Runtime.enable')


 const live=process.argv.includes('--live'), gpu=process.argv.includes('--gpu');
 const base={version:1,profile:{id:'ai-fixture',species:'cat',name:'Miso',activities:['Walking'],outingTime:'17:30',duration:10,affection:10,sound:false,notifications:false,pet:{breed:'siamese',furVariation:'cream',personality:'playful',generation:1,relationshipHistory:[],adoptedAt:null}}};
 await call('Page.addScriptToEvaluateOnNewDocument',{source: `const mode=new URLSearchParams(location.search).get('mode');if(mode)localStorage.setItem('outside-or-else:appearance',mode);window.__errors=[];addEventListener('error',e=>__errors.push(e.message));localStorage.setItem('outside-or-else:v1',JSON.stringify(${JSON.stringify(base)}));if(location.search.includes('no-gpu'))Object.defineProperty(navigator,'gpu',{value:undefined});`});
 const requests=[];socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url)});await call('Network.enable');
 // Non-live audit runs never permit model-host downloads, even if lazy loading regresses.
 if(!live)await call('Network.setBlockedURLs',{urls:['https://*','http://huggingface.co/*','http://cdn.jsdelivr.net/*']});
 const url='http://127.0.0.1:'+port+'/';
 await call('Page.navigate',{url});await waitFor('!!document.querySelector(".home-screen")');await delay(500);
 assert.equal(requests.some(x=>/huggingface|inference.worker|ort-wasm|AILab-/.test(x)),false,'Normal game never loads lab/runtime/model');
 const before=await evaluate('localStorage.getItem("outside-or-else:v1")');
 await evaluate('location.hash="ai-lab"');await waitFor('!!document.querySelector("#ai-load")');assert.equal(await evaluate('!!document.querySelector(".home-screen")'),false,'Lab does not mount gameplay');assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before);
 await delay(300);assert.equal(requests.some(x=>/huggingface|inference.worker|ort-wasm/.test(x)),false,'Opening lab never loads runtime or weights');
 assert.ok(await evaluate('document.querySelector("#ai-memory-budget").textContent.includes("2–4 GiB")'),'Memory estimate is visible before explicit load');
 await evaluate('location.hash=""');await waitFor('!!document.querySelector(".home-screen")');
 await call('Page.navigate',{url:url+'?no-gpu#ai-lab'});await waitFor('!!document.querySelector("#ai-load")');
 await evaluate('document.querySelector("#ai-load").click()');await waitFor('document.querySelector("[role=alert]")?.textContent.includes("WebGPU unavailable")');
 assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before);
 console.log('PASS: lazy isolation, unchanged pet save, explicit load, unsupported GPU error.');
 await call('Page.navigate',{url:url+'#ai-lab'});await waitFor('!!document.querySelector("#ai-model")');
 const set=async(selector,value)=>evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLSelectElement.prototype,"value").set;setter.call(el,'+JSON.stringify(value)+');el.dispatchEvent(new Event(el instanceof HTMLTextAreaElement?"input":"change",{bubbles:true}));})()');
 if(process.argv.includes('--probe')){console.log(await evaluate('navigator.gpu?.requestAdapter().then(a=>a?({info:a.info,fp16:a.features.has("shader-f16"),maxBufferSize:a.limits.maxBufferSize,maxStorageBufferBindingSize:a.limits.maxStorageBufferBindingSize}):null)'));return;}
 if(!live){
  await set('#ai-input','do you remember our last adventure?');await delay(100);
  assert.equal(await evaluate('document.querySelector("#ai-generate").disabled'),false);
  await evaluate('document.querySelector("#ai-generate").click()');await waitFor('!!document.querySelector("#ai-facts")');
  assert.equal(JSON.parse(await evaluate('document.querySelector("#ai-facts").textContent')).adventures.value.total,0);
  assert.equal(requests.some(x=>/huggingface|inference.worker|ort-wasm/.test(x)),false,'Facts can be inspected without loading model/runtime');
  // Fixture records live only in this isolated temporary Chrome profile.
  await evaluate(`(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('outside-or-else:journey-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const tx=db.transaction(['memories','photos'],'readwrite');const memory={id:'recorded-fixture',pet:{id:'ai-fixture'},kind:'outing',status:'completed',completedAt:Date.UTC(2026,9,1),memoryDeleted:false,photoId:'photo-fixture',destination:{name:'Recorded Garden',latitude:12.345678,longitude:76.543210}};tx.objectStore('memories').put(memory);tx.objectStore('memories').put({...memory,id:'missing-photo-fixture',completedAt:Date.UTC(2026,9,2),photoId:'absent-file',destination:null});tx.objectStore('memories').put({...memory,id:'manual-fixture',kind:'manual',photoId:'manual-photo-fixture'});tx.objectStore('memories').put({...memory,id:'deleted-fixture',memoryDeleted:true});tx.objectStore('memories').put({...memory,id:'other-pet-fixture',pet:{id:'other-pet'}});for(const id of ['photo-fixture','manual-photo-fixture'])tx.objectStore('photos').put({id,blob:new Blob(['test-image-fixture']),width:1,height:1,createdAt:Date.UTC(2026,9,1)});await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});db.close()})()`);
  const readRecords=()=>evaluate(`(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('outside-or-else:journey-v1',1);r.onsuccess=()=>resolve(r.result)});const tx=db.transaction('memories','readonly');const values=await new Promise(resolve=>{const r=tx.objectStore('memories').getAll();r.onsuccess=()=>resolve(r.result)});db.close();return JSON.stringify(values)})()`);
  const recordsBefore=await readRecords();
  await set('#ai-input','how many saved adventures do we have?');await delay(100);await evaluate('document.querySelector("#ai-generate").click()');await waitFor('document.querySelector("#ai-facts")?.textContent.includes("Recorded Garden")');
  const adventureFacts=JSON.parse(await evaluate('document.querySelector("#ai-facts").textContent'));
  assert.equal(adventureFacts.adventures.value.total,2);assert.equal(adventureFacts.adventures.value.relevant[0].photo.value,'missing-file');assert.equal(adventureFacts.adventures.value.relevant[1].photo.value,'saved-unverified');
  assert.equal(JSON.stringify(adventureFacts).includes('12.345678'),false);assert.equal(JSON.stringify(adventureFacts).includes('76.54321'),false);
  await set('#ai-input','do saved photos prove we went outside?');await delay(100);await evaluate('document.querySelector("#ai-generate").click()');await waitFor('document.querySelector("#ai-facts")?.textContent.includes("not-verified")');
  const photoFacts=JSON.parse(await evaluate('document.querySelector("#ai-facts").textContent'));assert.equal(photoFacts.photos.value.saved,2);assert.equal(photoFacts.photos.value.verification,'not-verified');
  assert.equal(await readRecords(),recordsBefore,'Fact reads do not change saved fixture records');
  await set('#ai-input','hello');await delay(100);
  // Synthetic worker is only a UI transport fixture, never evidence of real inference.
  await evaluate(`window.__NativeWorker=window.Worker;window.__terminated=0;window.Worker=class {constructor(){window.__fixtureWorker=this}postMessage(m){if(m.type==='load'){this.onmessage({data:{type:'progress',file:'fixture.onnx',status:'progress',loaded:50,total:100}});setTimeout(()=>this.onmessage({data:{type:'ready',loadMs:100}}),100)}else{this.onmessage({data:{type:'error',message:'Synthetic allocation failure'}})}}terminate(){window.__terminated++}}`);
  await set('#ai-backend','wasm');await evaluate('document.querySelector("#ai-load").click()');await waitFor('document.querySelector("[data-ai-status]").dataset.aiStatus==="ready"');
  assert.ok(await evaluate('document.querySelector("ul[aria-label]").textContent.includes("50%")'));
  await evaluate('document.querySelector("#ai-generate").click()');await waitFor('document.querySelector("[role=alert]")?.textContent.includes("Synthetic allocation failure")');
  assert.ok(await evaluate('document.querySelector("#ai-output").textContent.includes("No model response")'));
  await evaluate('document.querySelector("#ai-load").click()');await waitFor('document.querySelector("[data-ai-status]").dataset.aiStatus==="ready"');
  await evaluate('document.querySelector("#ai-unload").click()');await waitFor('document.querySelector("[data-ai-status]").dataset.aiStatus==="idle"');
  assert.ok(await evaluate('__terminated>=2'));
  await evaluate('document.querySelector("#ai-load").click()');await waitFor('document.querySelector("[data-ai-status]").dataset.aiStatus==="ready"');
  await evaluate('Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"))');await delay(100);assert.equal(await evaluate('document.querySelector("[data-ai-status]").dataset.aiStatus'),"ready","Backgrounding retains the requested session");await evaluate('document.querySelector("#ai-unload").click()');
  await evaluate('Object.defineProperty(document,"hidden",{value:false,configurable:true});const nativeTimer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>nativeTimer(fn,ms>=180000?20:ms,...args)');
  await evaluate('document.querySelector("#ai-load").click()');await waitFor('document.querySelector("[role=alert]")?.textContent.includes("timed out")');
  await call('Page.navigate',{url:url+'#ai-lab'});await waitFor('!!document.querySelector("#ai-backend")');await set('#ai-backend','wasm');
  await evaluate('document.querySelector("#ai-load").click()');await waitFor('!!document.querySelector("[role=alert]")');
  assert.ok(await evaluate('document.querySelector("#ai-output").textContent.includes("No model response")'));
  for(const [width,height] of [[360,800],[390,844]]){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false)}
  assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before);assert.deepEqual(await evaluate('__errors'),[]);
  for(const mode of ['light','dark','system','dynamic']){await call('Page.navigate',{url:url+'?mode='+mode+'#ai-lab'});await waitFor('!!document.querySelector("#ai-load")');assert.equal(await evaluate('document.documentElement.dataset.appearance'),mode);assert.ok(await evaluate('getComputedStyle(document.querySelector(".ai-lab")).color!==getComputedStyle(document.querySelector(".ai-lab")).backgroundColor'));assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before)}
  console.log('PASS: synthetic transport progress/error/unload, no fake reply fallback, background retention, explicit unload, timeout, actual blocked-download failure, responsive lab, unchanged saves.');return;
 }
 if(process.argv.includes('--compare')||process.argv.includes('--reliability'))await evaluate('window.Worker=class extends window.Worker {constructor(...args){super(...args);window.__comparisonWorker=this}}');
 await set('#ai-model',gpu?'qwen':'smol');await set('#ai-backend',gpu?'webgpu':'wasm');
 await evaluate('window.__ticks=0;window.__maxGap=0;let last=performance.now();setInterval(()=>{window.__ticks++;window.__maxGap=Math.max(window.__maxGap,performance.now()-last);last=performance.now()},100)');
 const started=Date.now();await evaluate('document.querySelector("#ai-load").click()');
 const waitOperation=async(max)=>{for(let i=0;i<max;i++){const s=await evaluate('document.querySelector("[data-ai-status]").dataset.aiStatus');if(s==='error')throw new Error(await evaluate('document.querySelector("[role=alert]").textContent'));if(s==='ready')return;await delay(1000);if(i%30===0)console.log('Live model: '+await evaluate('document.querySelector("[data-ai-status]").textContent')+' ('+i+'s)')}throw new Error('Live test timeout')};
 await waitOperation(620);
 const report={backend:gpu?'webgpu':'wasm',model:gpu?'qwen':'smol',browser:await evaluate('navigator.userAgent'),coldLoadWallMs:Date.now()-started,load:await evaluate('document.querySelector("#ai-load-time").textContent'),progress:await evaluate('document.querySelector("ul[aria-label]").textContent'),diagnostics:await evaluate('document.querySelector("#ai-diagnostics").textContent'),cases:[]};
 if(process.argv.includes('--reliability')){
  const runReliability=require('./ai-9b1-evaluate.cjs');
  const {MODELS}=require('../src/ai/models.ts');report.repository=MODELS.qwen.repo;report.revision=MODELS.qwen.revision;
  await runReliability({evaluate,delay,report,profile:base.profile});
  assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before);assert.deepEqual(await evaluate('__errors'),[]);
  report.saveUnchanged=true;fs.writeFileSync('docs/ai-9b1-evaluation.json',JSON.stringify(report,null,2));
  await evaluate('document.querySelector("#ai-unload").click()');return;
 }
 if(process.argv.includes('--compare')){
  const ts=require('typescript');require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  const {buildLabPrompt}=require('./fixtures/ai-9b-prompt.ts'),{buildLabPrompt:oldPrompt}=require('./fixtures/ai-9a-prompt.ts');
  const {TEST_MESSAGES,MODELS}=require('../src/ai/models.ts'),{GENERATION_SETTINGS}=require('../src/ai/generation.ts');
  report.revision=MODELS.qwen.revision;report.sampling=GENERATION_SETTINGS;report.promptVariant='structured species/personality demonstrations';report.promptSourceSha256=require('node:crypto').createHash('sha256').update(fs.readFileSync('src/ai/prompt.ts')).digest('hex');report.qualityReview='Pending human review. Flags are heuristics, not quality acceptance.';report.cases=[];report.completed=false;report.startedAt=new Date().toISOString();
  fs.writeFileSync('docs/ai-9b-comparison.json',JSON.stringify(report,null,2));
  const cases=TEST_MESSAGES.map(message=>({message,profile:base.profile,records:[],label:'playful-cat-no-memories'}));
  for(const species of ['cat','dog'])for(const personality of ['playful','sleepy','curious','shy','mischievous'])cases.push({message:'why do you hate my shoes?',profile:{...base.profile,species,affection:50,pet:{...base.profile.pet,breed:species==='cat'?'siamese':'shiba-inu',personality}},records:[],label:species+'-'+personality});
  for(const species of ['cat','dog'])for(const affection of [10,90])cases.push({message:'do you love me?',profile:{...base.profile,species,affection,pet:{...base.profile.pet,breed:species==='cat'?'siamese':'shiba-inu'}},records:[],label:species+'-affection-'+affection});
  for(const species of ['cat','dog'])cases.push({message:'do you remember our last adventure?',profile:{...base.profile,species,pet:{...base.profile.pet,breed:species==='cat'?'siamese':'shiba-inu'}},records:[{id:'synthetic-completed-record',pet:{id:base.profile.id},kind:'outing',status:'completed',completedAt:Date.UTC(2026,9,1),caption:'excluded',photoId:'unverified-fixture',memoryDeleted:false}],label:species+'-saved-memory-fixture'});
  for(let index=0;index<cases.length;index++){
   const c=cases[index];
   // Alternate ordering to limit warm-up/order bias; sampling remains nondeterministic.
   for(const configuration of index%2?['checkpoint-9b','checkpoint-9a']:['checkpoint-9a','checkpoint-9b']){
    const messages=(configuration==='checkpoint-9a'?oldPrompt:buildLabPrompt)(c.profile,'afternoon',c.records,c.message,true);
    await evaluate(`(()=>{window.__comparisonReply=null;const worker=window.__comparisonWorker;const listener=e=>{if(e.data.type==='result'||e.data.type==='error'){window.__comparisonReply=e.data;worker.removeEventListener('message',listener)}};worker.addEventListener('message',listener);worker.postMessage(${JSON.stringify({type:'generate',messages,configuration})});})()`);
    let reply=null;for(let i=0;i<190;i++){reply=await evaluate('window.__comparisonReply');if(reply)break;await delay(1000)}
    assert.ok(reply,'Comparison generation timed out');if(reply.type==='error')throw new Error(reply.message);assert.ok(reply.text.trim()&&reply.tokens>0,'Actual nonempty model response required');
    const flags={outsideTargetLength:reply.tokens<15||reply.tokens>55,outputCap:reply.tokens>=80,exactDemoCopy:messages.filter(m=>m.role==='assistant').some(m=>m.content.trim()===reply.text.trim()),wrongSpeciesSound:c.profile.species==='dog'?/\b(meow|mrrp|mrow|emwoe|prrr|skrrrt)\b/i.test(reply.text):/\b(woof|bork|arf|ruff)\b/i.test(reply.text)};
    report.cases.push({label:c.label,species:c.profile.species,personality:c.profile.pet.personality,affection:c.profile.affection,phase:'afternoon',memoryFixture:c.records.length>0,message:c.message,...reply,flags});
    fs.writeFileSync('docs/ai-9b-comparison.json',JSON.stringify(report,null,2));console.log(configuration+' '+c.label+' '+c.message+': '+reply.inputTokens+' input, '+reply.tokens+' output, '+(reply.generationMs/1000).toFixed(2)+'s');
   }
  }
  report.uiHeartbeatTicks=await evaluate('__ticks');report.maxMainThreadHeartbeatGapMs=await evaluate('__maxGap');assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before);assert.deepEqual(await evaluate('__errors'),[]);report.saveUnchanged=true;
  await evaluate('document.querySelector("#ai-unload").click()');await delay(300);const cacheRequestStart=requests.length,cacheStart=Date.now();await evaluate('document.querySelector("#ai-load").click()');await waitOperation(620);report.cachedReloadWallMs=Date.now()-cacheStart;report.cachedReloadTiming=await evaluate('document.querySelector("#ai-load-time").textContent');report.cachedReloadModelNetworkRequests=requests.slice(cacheRequestStart).filter(url=>/huggingface|hf\.co|xethub/.test(url));assert.equal(report.cachedReloadModelNetworkRequests.length,0,'Cached reload requests no model hosts');
  report.completed=true;report.finishedAt=new Date().toISOString();fs.writeFileSync('docs/ai-9b-comparison.json',JSON.stringify(report,null,2));
  await evaluate('document.querySelector("#ai-unload").click()');console.log('PASS: actual old/new generation captured for 26 paired cases. Review raw outputs; no automatic quality pass.');return;
 }
 for(const message of ['hello','i feel tired today','where should we go?','do you remember our last adventure?','why do you hate my shoes?']){
  await set('#ai-input',message);await delay(100);await evaluate('document.querySelector("#ai-generate").click()');await waitOperation(190);
  if(await evaluate('!!document.querySelector("#ai-facts")')){report.cases.push({message,source:'deterministic-game-state-not-model',answer:await evaluate('document.querySelector("#ai-facts").textContent')});continue;}
  const result=JSON.parse(await evaluate('document.querySelector("#ai-metrics").textContent'));assert.ok(result.tokens>0);assert.ok(result.text.trim());report.cases.push({message,...result});console.log(JSON.stringify(report.cases.at(-1)));
 }
 report.uiHeartbeatTicks=await evaluate('__ticks');report.maxMainThreadHeartbeatGapMs=await evaluate('__maxGap');assert.ok(report.uiHeartbeatTicks>10,'Main thread remains responsive');
 assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),before);assert.deepEqual(await evaluate('__errors'),[]);
 await evaluate('document.querySelector("#ai-unload").click()');await delay(300);const warmRequestStart=requests.length;const warmStart=Date.now();await evaluate('document.querySelector("#ai-load").click()');await waitOperation(620);report.cachedReloadWallMs=Date.now()-warmStart;report.cachedReloadTiming=await evaluate('document.querySelector("#ai-load-time").textContent');report.cachedReloadModelNetworkRequests=requests.slice(warmRequestStart).filter(url=>url.includes('huggingface.co/'));assert.equal(report.cachedReloadModelNetworkRequests.length,0,'Warm reload uses cached model artifacts');
 if(gpu)report.adapter=await evaluate('navigator.gpu.requestAdapter().then(a=>({vendor:a.info.vendor,architecture:a.info.architecture,isFallbackAdapter:a.info.isFallbackAdapter}))');
 fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/ai-live-'+report.backend+'.json',JSON.stringify(report,null,2));
 console.log('PASS: actual model outputs and separately labeled deterministic facts captured; responsive main thread, unchanged saves. Measurements in docs/ai-live-'+report.backend+'.json. Not physical Android.');
}
main().catch(error=>{console.error(error);if(process.argv.includes('--live')){fs.mkdirSync('docs',{recursive:true});fs.writeFileSync(process.argv.includes('--reliability')?'docs/ai-9b1-evaluation-failure.json':process.argv.includes('--compare')?'docs/ai-9b-comparison-failure.json':'docs/ai-live-'+(process.argv.includes('--gpu')?'webgpu':'wasm')+'-failure.json',JSON.stringify({error:error.message,physicalAndroidTested:false},null,2))}process.exitCode=1}).finally(async()=>{socket?.close();browser?.kill();server.close();await delay(500);if(browserProfile){assert.ok(path.resolve(browserProfile).startsWith(path.resolve(os.tmpdir())+path.sep));assert.ok(path.basename(browserProfile).startsWith('outside-scenes-test-'));fs.rmSync(browserProfile,{recursive:true,force:true,maxRetries:10,retryDelay:200})}})

