// Real browser checks for locally loaded fonts and text fit; isolated fixture saves.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const artifactDir=process.env.CHECKPOINT_ARTIFACT_DIR||'artifacts/checkpoint-10b';
let browser,socket,temp;
const results=[];
const server=http.createServer((req,res)=>{
 const root=path.resolve('dist'),url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(file));
});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));temp=fs.mkdtempSync(path.join(os.tmpdir(),'outside-type-test-'));
 browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run','--no-proxy-server','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{windowsHide:true,stdio:'ignore'});
 const portFile=path.join(temp,'DevToolsActivePort');for(let i=0;!fs.existsSync(portFile)&&i<100;i++)await delay(100);assert.ok(fs.existsSync(portFile));
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0],targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout: '+method));},15000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Timed out: '+expression);};
 const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
 const shot=async name=>{const s=await call('Page.captureScreenshot',{captureBeyondViewport:true});fs.writeFileSync(artifactDir+'/'+name+'.png',Buffer.from(s.data,'base64'));};
 await call('Page.enable');await call('Network.enable');
 await call('Network.setBlockedURLs',{urls:['*://fonts.googleapis.com/*','*://fonts.gstatic.com/*']});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.hostname==='127.0.0.1'){const species=new URLSearchParams(location.search).get('species');localStorage.clear();if(species)localStorage.setItem('outside-or-else:v1',JSON.stringify({version:1,profile:{id:'typography-fixture',species,name:'Tiny Boss With Long Name',activities:['Walking'],outingTime:'17:30',duration:10,affection:10,sound:false,notifications:false}}));window.__errors=[];addEventListener('error',e=>__errors.push(e.message));}`});
 const fit=async label=>{
  await delay(350);
  const info=await evaluate(`(()=>{const visible=e=>{if(!e.getClientRects().length||e.closest('[hidden]')||getComputedStyle(e).visibility==='hidden')return false;for(let a=e;a;a=a.parentElement)if(a.matches('details:not([open])')&&!a.querySelector(':scope > summary')?.contains(e))return false;return true;};const wrong=[...document.querySelectorAll('h1,h2,h3,p,label,button,input,select,textarea,summary')].filter(visible).filter(e=>!getComputedStyle(e).fontFamily.includes('Gaegu')).map(e=>e.tagName+': '+e.textContent.slice(0,40));const clipped=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode,e=n.parentElement;if(!n.textContent.trim()||!visible(e)||e.closest('svg,script,style,.sr-only'))continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects()){let scrollableY=false;for(let a=e;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);if(a.classList.contains('splash-copy'))continue;const b=a.getBoundingClientRect();if(['auto','scroll'].includes(s.overflowY)&&a.scrollHeight>a.clientHeight)scrollableY=true;if((['hidden','clip'].includes(s.overflowX)&&(r.left<b.left-2||r.right>b.right+2))||(!scrollableY&&['hidden','clip'].includes(s.overflowY)&&(r.top<b.top-2||r.bottom>b.bottom+2))){clipped.push(n.textContent.trim().slice(0,60));break;}}}}return {width:innerWidth,height:innerHeight,horizontal:document.documentElement.scrollWidth>innerWidth+1,wrong,clipped:[...new Set(clipped)],headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({text:e.textContent,size:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight})),errors:__errors};})()`);
  results.push({label,...info});fs.writeFileSync(artifactDir+'/typography-browser.json',JSON.stringify(results,null,2));
  assert.equal(info.horizontal,false,label+' horizontal overflow');assert.deepEqual(info.wrong,[],label+' uses Gaegu');assert.deepEqual(info.clipped,[],label+' clipped text');assert.deepEqual(info.errors,[]);assert.ok(info.headings.every(h=>h.weight==='700'),label+' bold headings');
 };
 for(const [w,h] of [[320,568],[360,800],[412,915],[915,412],[1280,800]]){
  await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<768});
  for(const species of ['cat','dog']){
   await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/?species=${species}`});await wait('!!document.querySelector(".home-screen")');
   await evaluate(`(async()=>{await document.fonts.load('400 16px Gaegu');await document.fonts.load('700 32px Gaegu');await document.fonts.ready;})()`);
   assert.equal(await evaluate('document.title'),'Outside or Else!');
   assert.deepEqual(await evaluate(`[...document.fonts].filter(f=>f.family==='Gaegu').map(f=>({weight:f.weight,status:f.status})).sort((a,b)=>a.weight.localeCompare(b.weight))`),[{weight:'400',status:'loaded'},{weight:'700',status:'loaded'}]);
   const saved=await evaluate('localStorage.getItem("outside-or-else:v1")');
   await fit(`${species} home ${w}x${h}`);if(w===412)await shot(species+'-home');
   await click('.pet-talk-orb');await wait('!document.querySelector(".conversation-hud").hidden');await fit(`${species} talk ${w}x${h}`);if(w===412)await shot(species+'-talk');await click('[aria-label="Close conversation"]');
   await click('.wardrobe-trigger');await wait('!!document.querySelector(".wardrobe-dialog[open]")');await fit(`${species} wardrobe ${w}x${h}`);await click('[aria-label="Close wardrobe"]');
   for(const page of ['adventure','memories','settings']){await click('[aria-label='+page+']');await wait('!!document.querySelector(".'+page+'-screen")');await fit(`${species} ${page} ${w}x${h}`);if(w===412)await shot(species+'-'+page);}
   assert.equal(await evaluate('localStorage.getItem("outside-or-else:v1")'),saved,'Read-only navigation preserves fixture save');
  }
 }
 await call('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
 await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});await wait('!!document.querySelector(".splash")');await evaluate('document.fonts.ready');await delay(2200);await fit('splash 320x568');await shot('splash-320');await click('.skip-splash');await wait('!!document.querySelector(".onboarding")');await fit('onboarding 320x568');await shot('onboarding-320');
 assert.deepEqual(await(await fetch(`http://127.0.0.1:${server.address().port}/manifest.webmanifest`)).json(),{name:'Outside or Else!',short_name:'Outside or Else!',start_url:'/',display:'standalone'});
 console.log('PASS: Gaegu 400/700 loaded locally with Google font hosts blocked; exact title/manifest; cat and dog across five screen sizes, Talk/wardrobe/main screens, narrow splash/onboarding, bold headings, no detected text clipping/overflow, fixture saves unchanged.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{socket?.close();browser?.kill();server.close();await delay(700);if(temp){assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));assert.ok(path.basename(temp).startsWith('outside-type-test-'));try{fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}}});
