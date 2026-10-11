// Offline controller tests: no browser/runtime/weights. Explicit factories only.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {BrainSession,classifyError}=require('../src/ai/brainSession.ts')
const {updateProgress,aggregateProgress}=require('../src/ai/downloadProgress.ts')
async function main(){
 let files={},p=(file,loaded,total,status='progress')=>files=updateProgress(files,{type:'progress',file,loaded,total,status})
 p('tokenizer.json',100,100);p('model.onnx',300,570)
 assert.deepEqual(aggregateProgress(files),{loaded:400,total:670,unknown:0,percent:400/670*100})
 p('config.json',0,0,'initiate');assert.equal(files['model.onnx'].loaded,300);assert.equal(aggregateProgress(files).percent,null)
 p('model.onnx',0,0,'done');assert.equal(files['model.onnx'].loaded,300,'Completion callbacks omit bytes, preserve counters')
 p('config.json',10,10);assert.equal(aggregateProgress(files).loaded,410)
 p('model.onnx',0,570);assert.equal(files['model.onnx'].loaded,0,'Real zero-byte report remains honest')
 let created=0,terminated=0,sends=[],deleted=0
 global.caches={delete:()=>deleted++}
 const session=new BrainSession(),worker=()=>{created++;return {postMessage:m=>sends.push(m),terminate:()=>terminated++}}
 const support=async()=>null
 session.confirm();assert.equal(session.getSnapshot().state,'awaiting_confirmation');assert.equal(created,0)
 let releaseProbe;const probe=new Promise(r=>releaseProbe=r)
 const first=session.load('qwen','webgpu',()=>probe,async()=>worker())
 assert.equal(session.getSnapshot().state,'initializing')
 assert.equal(await session.load('qwen','webgpu',support,async()=>worker()),false)
 // React StrictMode subscriptions and unmount cannot cancel the reserved load.
 const unsubscribe=session.subscribe(()=>{});unsubscribe();session.subscribe(()=>{})()
 releaseProbe(null);await first;assert.equal(created,1);assert.equal(sends.length,1)
 assert.equal(await session.load('smol','wasm',support,async()=>worker()),false,'Lab cannot compete')
 session.stop();assert.equal(terminated,1);assert.equal(session.getSnapshot().state,'cancelled')
 let instance;await session.load('qwen','webgpu',support,async()=>instance=worker())
 instance.onmessage({data:{type:'progress',file:'model.onnx',status:'progress',loaded:300,total:570}})
 assert.equal(session.getSnapshot().state,'downloading')
 instance.onmessage({data:{type:'phase',state:'initializing',stage:'Session creation'}})
 instance.onmessage({data:{type:'diagnostic',event:'cache warning',detail:'QuotaExceededError'}})
 instance.onmessage({data:{type:'error',message:'GPU allocation failed'}})
 assert.equal(session.getSnapshot().state,'failed');assert.equal(session.getSnapshot().errorType,'memory-or-device')
 assert.equal(terminated,2);assert.equal(created,2,'No automatic download retry')
 instance.onmessage({data:{type:'ready',loadMs:99}});assert.equal(session.getSnapshot().state,'failed','Late terminated messages ignored')
 session.confirm();await session.load('qwen','webgpu',support,async()=>instance=worker())
 instance.onmessage({data:{type:'ready',loadMs:123}});assert.equal(session.getSnapshot().state,'ready')
 assert.equal(session.getSnapshot().loadMs,123)
 const request={type:'generate',purpose:'talk',messages:[{role:'user',content:'private chat text'}]}
 const generating=session.generate(request);assert.equal(session.getSnapshot().generating,true)
 await assert.rejects(session.generate(request),/another operation/)
 instance.onmessage({data:{type:'result',text:'private answer'}});await generating
 assert.equal(session.getSnapshot().generating,false)
 assert.ok(!JSON.stringify(session.getSnapshot()).includes('private'),'Diagnostics never record conversations')
 assert.equal(deleted,0)
 session.stop()
 let finish;const delayed=new Promise(r=>finish=r);const loading=session.load('qwen','wasm',support,()=>delayed)
 await Promise.resolve();session.stop();finish(worker());await loading;assert.equal(session.getSnapshot().state,'cancelled','Cancellation during factory import cannot resurrect worker')
 for(const [message,type] of [['QuotaExceededError','storage-quota'],['Unable to add cache','cache'],['Failed to fetch','network'],['WebGPU unavailable','unsupported']])assert.equal(classifyError(message),type)
 console.log('PASS: one initialization, subscription/unmount survival, Lab exclusivity, explicit retry/cancel, late-message protection, file aggregation/unknown totals/real zero, typed errors/cache retention, diagnostics privacy. No model loaded.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
