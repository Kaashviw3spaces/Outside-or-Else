const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText,f)
function mock(file,exports){const name=require.resolve(file);require.cache[name]={id:name,filename:name,loaded:true,exports}}
let android=true,current=0,settings=0,browser=0,locationResult={latitude:28.613987,longitude:77.209013},locationError=null,cameraResult={cancelled:true},cameraError=null,httpCalls=[],httpResult={status:200,data:{elements:[]}},httpError=null
mock('../src/native/platform.ts',{isAndroid:()=>android,nativePostJSON:async(url,data)=>{httpCalls.push({url,data});if(httpError)throw httpError;return httpResult},PetLocation:{current:async()=>{current++;if(locationError)throw locationError;return locationResult},openSettings:async()=>{settings++}},PetCamera:{capture:async()=>{if(cameraError)throw cameraError;return cameraResult}}})
const values=new Map();global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
global.window={addEventListener(){},removeEventListener(){}}
Object.defineProperty(global,'navigator',{value:{geolocation:{getCurrentPosition:()=>browser++}},configurable:true})
const location=require('../src/lib/location.ts'),{captureAndroidPhoto}=require('../src/native/camera.ts'),{BrainSession}=require('../src/ai/brainSession.ts')
const settle=()=>new Promise(r=>setImmediate(r))
async function main(){
 assert.equal(current,0,'No permission request on module load')
 const coordinates=await location.requestAdventureLocation()
 assert.equal(current,1);assert.equal(browser,0,'Android never invokes browser geolocation')
 assert.equal(coordinates.latitude,28.61);assert.equal(coordinates.longitude,77.21)
 assert.equal(JSON.parse(values.get(location.LOCATION_KEY)).longitude,77.21,'Only rounded coordinates persisted')
 const saved=values.get(location.LOCATION_KEY)
 for(const code of ['DENIED','BLOCKED','SERVICES_DISABLED','TIMEOUT','UNAVAILABLE']){
   locationError={code,message:'actionable '+code};assert.equal(await location.requestAdventureLocation(),null,'Failure cannot silently use cached coordinates')
   assert.equal(location.getLocation().settingsAvailable,['DENIED','BLOCKED'].includes(code));assert.equal(location.getLocation().message,'actionable '+code);assert.equal(values.get(location.LOCATION_KEY),saved)
 }
 location.openLocationSettings();await settle();assert.equal(settings,1)
 locationError=null;assert.ok(await location.requestAdventureLocation(),'Retry after denial succeeds')
 locationResult={latitude:NaN,longitude:1};assert.equal(await location.requestAdventureLocation(),null);assert.equal(location.getLocation().status,'unavailable')
 locationResult={latitude:12.345,longitude:67.89};const set=localStorage.setItem;localStorage.setItem=()=>{throw Error('full')};assert.ok(await location.requestAdventureLocation());assert.ok(location.getLocation().message.includes('storage'));localStorage.setItem=set
 android=false;location.requestLocation();assert.equal(browser,1);android=true
 assert.equal(await captureAndroidPhoto(),null,'Cancel leaves existing draft untouched')
 cameraError=new Error('Camera unavailable');await assert.rejects(captureAndroidPhoto(),/Camera unavailable/);cameraError=null
 cameraResult={};await assert.rejects(captureAndroidPhoto(),/did not return/)
 cameraResult={base64:Buffer.from([255,216,255,217]).toString('base64')};const photo=await captureAndroidPhoto();assert.equal(photo.type,'image/jpeg');assert.equal(photo.size,4)
 const nearbyPath=require.resolve('../src/lib/nearby.ts'),freshNearby=()=>{delete require.cache[nearbyPath];return require(nearbyPath)}
 const originalFetch=global.fetch;global.fetch=()=>{throw Error('WebView fetch must not be used for Android Nearby')}
 let nearby=freshNearby();assert.equal(httpCalls.length,0,'No request on module load');const origin={latitude:28.613987,longitude:77.209013,obtainedAt:Date.now()}
 assert.equal((await nearby.searchNearby(origin,true)).cache.places.length,0);assert.equal(httpCalls[0].url,'https://overpass-api.de/api/interpreter');assert.ok(decodeURIComponent(httpCalls[0].data).includes('28.61,77.21'));assert.equal(httpCalls[0].data.includes('613987'),false,'Exact coordinates never enter HTTP payload')
 for(const [status,pattern] of [[429,/rate limit/],[503,/unavailable/]]){httpResult={status,data:{}};nearby=freshNearby();await assert.rejects(nearby.searchNearby(origin,true),pattern)}
 httpResult={status:200,data:{unexpected:true}};nearby=freshNearby();await assert.rejects(nearby.searchNearby(origin,true),/invalid response/)
 httpError={message:'network failed'};nearby=freshNearby();await assert.rejects(nearby.searchNearby(origin,true),/connection/);httpError=null
 const nativeTimeout=global.setTimeout;global.setTimeout=fn=>nativeTimeout(fn,0);httpResult=new Promise(()=>{})
 nearby=freshNearby();await assert.rejects(nearby.searchNearby(origin,true),/timed out/);global.setTimeout=nativeTimeout;global.fetch=originalFetch
 const session=new BrainSession();let ended=0;const transport={postMessage(){},terminate(){ended++},generationTimeoutMs:15}
 await session.load('qwen','wasm',async()=>null,async()=>transport);transport.onmessage({data:{type:'ready',loadMs:1}})
 await assert.rejects(session.generate({type:'generate',messages:[]}),/timed out/);assert.equal(ended,1);assert.equal(session.getSnapshot().generating,false);assert.equal(session.getSnapshot().state,'failed')
 transport.onmessage({data:{type:'result',text:'late'}});assert.equal(session.getSnapshot().state,'failed','Late replies cannot resurrect failed session')
 await session.load('qwen','wasm',async()=>null,async()=>transport);transport.onmessage({data:{type:'ready',loadMs:1}});assert.equal(session.getSnapshot().state,'ready');session.stop()
 console.log('PASS: native location routing, rounding, no automatic permission request, denial/blocked/settings/services/timeout/unavailable/storage errors and retry; camera cancel/unavailable/malformed result/local File; native Nearby POST routing with same endpoint/rounded coordinates, no render request, HTTP errors/rate limit/invalid data/network failure/deadline; bounded native session timeout, late result protection and recovery. Native APIs mocked; real device NOT TESTED by this suite.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
