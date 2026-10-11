// Called only by the browser runner's explicit --live --gpu --reliability branch.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('typescript')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {EVALUATION_PROMPTS,DEVELOPMENT_COUNT,EVALUATION_PLANS,HELD_OUT_PLAN,FACTUAL_EVALUATION_PROMPTS,ACCEPTANCE}=require('../src/ai/evaluation.ts')
const {buildGroundedContext,factualIntent,deterministicFacts}=require('../src/ai/grounding.ts')
const {buildGroundedPrompt}=require('../src/ai/prompt.ts'),{GENERATION_SETTINGS}=require('../src/ai/generation.ts')
module.exports=async function({evaluate,delay,report,profile}){
 assert.equal(new Set(EVALUATION_PROMPTS).size,32)
 const file='docs/ai-9b1-evaluation.json'
 Object.assign(report,{startedAt:new Date().toISOString(),completed:false,settings:GENERATION_SETTINGS,plans:EVALUATION_PLANS,heldOutPlan:HELD_OUT_PLAN,acceptance:ACCEPTANCE,review:'Human scoring pending; heuristics are not truth or coherence guarantees.',sourceHashes:{},cases:[],factualCases:[]})
 for(const name of ['prompt','grounding','quality','reliability','evaluation','generation','models','inference.worker','readContext'])report.sourceHashes[name]=crypto.createHash('sha256').update(fs.readFileSync('src/ai/'+name+'.ts')).digest('hex')
 const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2));save()
 const personalities=['playful','sleepy','curious','shy','mischievous']
 function fixture(index,message){
  const species=index%2?'dog':'cat',p={...profile,species,affection:[10,50,90][index%3],pet:{...profile.pet,personality:personalities[index%5],breed:species==='cat'?'siamese':'shiba-inu'}}
  const real=index===9||index===29||index===30,available=index!==28
  // Recorded-data fixture, never presented as the user's actual history.
  const records=real?[{id:'lab-record-fixture',pet:{id:p.id},kind:'outing',status:'completed',completedAt:Date.UTC(2026,9,1),memoryDeleted:false,photoId:'lab-photo-fixture',destination:{name:'Recorded Garden',latitude:12.3,longitude:76.5}}]:[]
  return {profile:p,context:buildGroundedContext(p,'afternoon',records,message,available,available?'none':'unavailable',new Set(real?['lab-photo-fixture']:[]),[]),fixture:real?'saved-record-fixture':available?'empty-record-fixture':'unavailable-record-fixture'}
 }
 async function run(index,plan,split){
  const message=EVALUATION_PROMPTS[index],f=fixture(index,message);assert.equal(factualIntent(message),null,'Conversational case must not be counted as deterministic AI')
  const request={type:'generate',messages:buildGroundedPrompt(f.profile,f.context,message,plan.variant),context:f.context,configuration:plan.configuration}
  await evaluate(`(()=>{window.__comparisonReply=null;const w=window.__comparisonWorker;const listener=e=>{if(['result','error'].includes(e.data.type)){window.__comparisonReply=e.data;w.removeEventListener('message',listener)}};w.addEventListener('message',listener);w.postMessage(${JSON.stringify(request)});})()`)
  let reply=null;for(let i=0;i<190;i++){reply=await evaluate('window.__comparisonReply');if(reply)break;await delay(1000)}
  assert.ok(reply,'Actual generation timed out')
  report.cases.push({index,split,message,...plan,species:f.profile.species,personality:f.profile.pet.personality,affection:f.profile.affection,context:f.context,fixture:f.fixture,...reply,humanScores:{species:null,personality:null,grounding:null,refusal:null,coherence:null}});save()
  console.log(split+' '+index+' '+plan.variant+'/'+plan.configuration+': '+(reply.type==='result'?(reply.accepted?'accepted':'rejected')+' '+reply.attempts.length+' attempts, '+(reply.generationMs/1000).toFixed(2)+'s':reply.message))
 }
 // Same ten development prompts in every plan; rotate plan ordering.
 for(let i=0;i<DEVELOPMENT_COUNT;i++)for(let j=0;j<EVALUATION_PLANS.length;j++)await run(i,EVALUATION_PLANS[(j+i)%EVALUATION_PLANS.length],'development')
 // Default chosen before any outputs, never tuned against held-out responses.
 for(let i=DEVELOPMENT_COUNT;i<EVALUATION_PROMPTS.length;i++)await run(i,HELD_OUT_PLAN,'held-out')
 for(const message of FACTUAL_EVALUATION_PROMPTS)for(const index of [8,9,28]){
  const f=fixture(index,message),intent=factualIntent(message);assert.ok(intent)
  report.factualCases.push({message,fixture:f.fixture,source:'deterministic-game-state-not-model',answer:deterministicFacts(f.context,intent)})
 }
 const median=values=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b),mid=Math.floor(s.length/2);return s.length%2?s[mid]:(s[mid-1]+s[mid])/2}
 report.summary={requests:report.cases.length,distinctPrompts:new Set(report.cases.map(c=>c.message)).size,actualAttempts:report.cases.reduce((n,c)=>n+(c.attempts?.length??0),0),accepted:report.cases.filter(c=>c.accepted===true).length,failed:report.cases.filter(c=>c.accepted===false||c.type==='error').length,medianEndToEndGenerationMs:median(report.cases.filter(c=>c.type==='result').map(c=>c.generationMs)),medianFirstTokenMs:median(report.cases.flatMap(c=>c.attempts??[]).map(a=>a.firstTokenMs).filter(v=>v!==null)),qualityAcceptance:'PENDING HUMAN REVIEW'}
 report.byPlan=[]
 for(const split of ['development','held-out'])for(const plan of EVALUATION_PLANS){
  const cases=report.cases.filter(c=>c.split===split&&c.variant===plan.variant&&c.configuration===plan.configuration)
  if(!cases.length)continue
  const attempts=cases.flatMap(c=>c.attempts??[]),count=reason=>attempts.filter(a=>a.quality.reasons.includes(reason)).length
  report.byPlan.push({split,...plan,requests:cases.length,actualAttempts:attempts.length,accepted:cases.filter(c=>c.accepted).length,retried:cases.filter(c=>c.attempts?.length===2).length,errors:cases.filter(c=>c.type==='error').length,
   medianEndToEndGenerationMs:median(cases.filter(c=>c.type==='result').map(c=>c.generationMs)),medianAttemptFirstTokenMs:median(attempts.map(a=>a.firstTokenMs).filter(v=>v!==null)),
   heuristicFlags:{wrongSpecies:count('wrong-species'),repetition:count('repetition'),demoCopy:count('demo-copy'),unsupportedHistory:count('unsupported-history'),genericAssistant:count('generic-assistant'),pressure:count('pressure')},
   humanMetrics:{speciesConsistency:null,personalityConsistency:null,groundingAccuracy:null,refusalHandling:null,coherence:null},acceptance:'PENDING HUMAN REVIEW'})
 }
 report.completed=true;report.finishedAt=new Date().toISOString();save()
 console.log(JSON.stringify(report.summary));return report
}
