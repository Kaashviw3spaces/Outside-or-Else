// Uses installed TypeScript/React only. --live additionally queries a public London sample area.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 }, fileName: filename }).outputText, filename)
const storage = new Map()
global.localStorage = { getItem:key=>storage.get(key)??null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key) }
Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:true}})
global.window = { addEventListener(){}, removeEventListener(){} }
const origin = { latitude:51.5, longitude:-.12, obtainedAt:Date.now() }
const n = require('../src/lib/nearby.ts')
const freshModule = () => { delete require.cache[require.resolve('../src/lib/nearby.ts')]; return require('../src/lib/nearby.ts') }
const element = (id,name,tags={},lat=51.501,lon=-.12) => ({type:'node',id,lat,lon,tags:{name,leisure:'park',...tags}})
const data={elements:[element(1,'Sample park'),element(1,'Sample park'),element(2,'Sample park'),element(3,'Private park',{access:'private'}),element(4,'Closed',{foot:'no'}),element(5,'Far',{},52),element(6,'Sample garden',{leisure:'garden'}),element(7,'Sample café',{leisure:'',amenity:'cafe'}),{type:'way',id:8,center:{lat:51.502,lon:-.12},tags:{name:'Sample monument',historic:'monument'}},element(9,'Permit only',{access:'permit'}),element(10,'Indoor',{indoor:'yes'})]}
const places=n.parsePlaces(data,origin)
assert.equal(places.length,4);assert.deepEqual(places.map(p=>p.id),['node/1','node/6','node/7','way/8'])
assert.equal(n.distanceMeters(origin,origin),0)
assert.ok(Math.abs(n.distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:1})-111194.9)<1)
assert.ok(n.distanceMeters({latitude:0,longitude:179.99},{latitude:0,longitude:-179.99})<2300)
assert.equal(n.rankPlaces(places,origin,['Reading outdoors'])[0].category,'Park')
assert.equal(n.rankPlaces(places,origin,['Exploring'])[0].category,'Outdoor landmark')
assert.equal(n.rankPlaces(places,origin,['Visiting a cafe'])[0].category,'Café')
assert.equal(n.rankPlaces(places,origin,['Walking']).some(p=>p.category==='Café'),false)
assert.equal(n.formatDistance(452),'450 m')
assert.equal(n.parsePlaces({elements:[]},origin).length,0)
assert.throws(()=>n.parsePlaces({elements:[],remark:'runtime error'},origin))
const cache={version:1,coordinates:origin,timestamp:Date.now(),radius:2000,places}
assert.equal(n.saveNearbyCache(cache),true);assert.deepEqual(n.loadNearbyCache(),cache)
assert.equal(n.isStale(cache,cache.timestamp+n.CACHE_TTL-1),false);assert.equal(n.isStale(cache,cache.timestamp+n.CACHE_TTL),true)
assert.equal(n.loadNearbyCache(cache.timestamp+8*24*3600000),null)
const { NearbyAdventures }=require('../src/components/NearbyAdventures.tsx')
const profile={id:'test',species:'cat',name:'Miso',activities:['Walking'],outingTime:'17:30',duration:10,affection:10,sound:false,notifications:false}
let calls=0
const nativeFetch=global.fetch, nativeTimeout=global.setTimeout
async function main(){
 global.fetch=async()=>{calls++;return {ok:true,status:200,json:async()=>data}}
 let service=freshModule()
 assert.equal((await service.searchNearby(origin)).cached,true);assert.equal(calls,0)
 n.clearNearbyCache()
 const result=await service.searchNearby(origin);assert.equal(result.cache.places.length,4);assert.equal(calls,1)
 assert.equal((await service.searchNearby(origin)).cached,true);assert.equal(calls,1)
 await assert.rejects(()=>service.searchNearby(origin,true),/wait/)
 const markup=renderToStaticMarkup(React.createElement(NearbyAdventures,{profile,now:Date.now()}))
 assert.ok(markup.includes('Sample park')&&markup.includes('straight-line')&&markup.includes('Open directions')&&markup.includes('node/1'))
 assert.ok(!markup.includes('Sample café'))
 assert.equal(calls,1,'render never fetches or asks for location')
 navigator.onLine=false
 assert.equal((await service.searchNearby(origin)).cached,true)
 await assert.rejects(()=>service.searchNearby(origin,true),/offline/)
 navigator.onLine=true;n.clearNearbyCache()
 service=freshModule();global.fetch=async()=>({ok:false,status:429})
 await assert.rejects(()=>service.searchNearby(origin),/rate limit/)
 await assert.rejects(()=>service.searchNearby(origin),/wait/)
 service=freshModule();global.fetch=async()=>({ok:false,status:503})
 await assert.rejects(()=>service.searchNearby(origin),/unavailable/)
 service=freshModule();global.fetch=async()=>{throw new TypeError('network')}
 await assert.rejects(()=>service.searchNearby(origin),/connection/)
 service=freshModule();global.setTimeout=fn=>nativeTimeout(fn,0)
 global.fetch=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))
 await assert.rejects(()=>service.searchNearby(origin),/timed out/)
 global.setTimeout=nativeTimeout
 service=freshModule();global.fetch=async()=>({ok:true,status:200,json:async()=>({elements:[]})})
 assert.equal((await service.searchNearby(origin)).cache.places.length,0)
 const location=require('../src/lib/location.ts')
 let requests=0
 navigator.geolocation={getCurrentPosition:success=>{requests++;success({coords:{latitude:51.5034,longitude:-.1234}})}}
 assert.equal(requests,0)
 assert.deepEqual(await location.requestAdventureLocation(),location.getLocation().coordinates)
 assert.equal(requests,1);assert.equal(location.getLocation().coordinates.latitude,51.5)
 for(const [code,message] of [[1,/permission/],[2,/unavailable/],[3,/too long/]]) {
  navigator.geolocation={getCurrentPosition:(_success,error)=>error({code})}
  assert.equal(await location.requestAdventureLocation(),null)
  assert.match(location.getLocation().message,message)
 }
 delete navigator.geolocation;assert.equal(await location.requestAdventureLocation(),null)
 assert.match(location.getLocation().message,/browser/)
 storage.set(n.NEARBY_KEY,'{broken');assert.equal(n.loadNearbyCache(),null)
 console.log('PASS: granted/denied/unavailable/timeout/unsupported location, explicit-only requests, real component card rendering, no render-time fetch, empty results, API failures/timeout/rate limiting, offline cached results, duplicate/access filtering, preference ranking, Haversine distance, cache freshness/expiry/corruption and request cooldown.')
 if(process.argv.includes('--live')) {
  global.fetch=(url, options)=>nativeFetch(url, {...options, headers:{...options?.headers, 'User-Agent':'OutsideOrElseCheckpoint/1.0'}});n.clearNearbyCache();service=freshModule()
  const response=await service.searchNearby(origin)
  assert.ok(response.cache.places.length>0)
  console.log('LIVE PASS: Overpass returned '+response.cache.places.length+' validated named places around public sample coordinates 51.50, -0.12; examples: '+response.cache.places.slice(0,3).map(p=>p.name+' ['+p.id+']').join('; '))
 }
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{global.fetch=nativeFetch;global.setTimeout=nativeTimeout})
