const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText,f);
const {elapsed,rewardFor}=require('../src/journey/rewards.ts');
const start=1000000,active={kind:'outing',plannedMinutes:5,startedAt:start,endedAt:null,elapsedMs:0,clock:{ticks:10000,epoch:'android:8'}};
for(const wall of [start+1000,start+3600000,start-3600000]){
 const ms=elapsed(active,wall,{ticks:11000,epoch:'android:8'});
 assert.equal(ms,1000);assert.equal(rewardFor({...active,elapsedMs:ms},false,0,10).eligible,false);
}
const complete=elapsed(active,start+1000,{ticks:310000,epoch:'android:8'});
assert.equal(complete,300000);assert.equal(rewardFor({...active,elapsedMs:complete},false,0,10).awarded,2);
assert.equal(elapsed(active,start+86400000,{ticks:310000,epoch:'android:9'}),0,'Reboot cannot credit unverifiable time');
const checkpoint={...active,elapsedMs:120000,clock:{ticks:130000,epoch:'android:8'}};
assert.equal(elapsed(checkpoint,start+1,{ticks:310000,epoch:'android:8'}),300000,'Persisted progress is added exactly once');
assert.equal(elapsed({...checkpoint,endedAt:start+300000,elapsedMs:300000},start+86400000,{ticks:900000,epoch:'android:8'}),300000,'Returned timer is frozen');
assert.equal(elapsed(active,start,{ticks:9000,epoch:'android:8'}),0,'Negative ticks never subtract progress');
(async()=>{
 const {readElapsedClock}=require('../src/journey/clock.ts');
 global.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android',Plugins:{PetClock:{read:async()=>({ticks:42,epoch:'android:8'})}}};
 assert.deepEqual(await readElapsedClock(),{ticks:42,epoch:'android:8'});
 Capacitor.Plugins.PetClock.read=async()=>{throw Error('Unavailable')};await assert.rejects(readElapsedClock(),/Unavailable/);
 Capacitor.Plugins.PetClock.read=async()=>({ticks:NaN,epoch:'android:8'});await assert.rejects(readElapsedClock(),/unavailable/);
 console.log('PASS: forward/backward clock jumps, duration threshold, reboot safety, persistent progress, frozen return, native bridge and failure handling.');
})().catch(e=>{console.error(e);process.exitCode=1});
