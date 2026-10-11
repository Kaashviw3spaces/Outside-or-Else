// Grounding/validation/retry contracts. Synthetic drafts are never inference evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {buildGroundedContext,factualIntent,deterministicFacts}=require('../src/ai/grounding.ts')
const {buildGroundedPrompt,PROMPT_VARIANTS,STYLE_DEMOS}=require('../src/ai/prompt.ts')
const {validateResponse}=require('../src/ai/quality.ts'),{runValidatedGeneration}=require('../src/ai/reliability.ts')
const {EVALUATION_PROMPTS,FACTUAL_EVALUATION_PROMPTS}=require('../src/ai/evaluation.ts')
const profile={id:'PRIVATE-PET',name:'Miso',species:'cat',affection:50,pet:{breed:'siamese',personality:'curious'}}
const record={id:'PRIVATE-ID',pet:{id:profile.id},kind:'outing',status:'completed',completedAt:Date.UTC(2026,9,1),memoryDeleted:false,photoId:'PRIVATE-PHOTO',caption:'PRIVATE-CAPTION',destination:{name:'Recorded Garden',latitude:12.345678,longitude:76.543210}}
const other={...record,id:'newer',completedAt:Date.UTC(2026,9,9),destination:{...record.destination,name:'Recorded Park'}}
const records=[other,record,{...record,kind:'manual'},{...record,pet:{id:'other'}},{...record,memoryDeleted:true},{...record,status:'active'}]
const context=buildGroundedContext(profile,'night',records,'remember Recorded Garden',true,'returned',new Set(['PRIVATE-PHOTO']),['Cached Garden'])
assert.equal(context.adventures.value.total,2);assert.equal(context.adventures.value.relevant[0].plannedPlace.value,'Recorded Garden');assert.equal(context.photos.value.saved,1)
assert.equal(context.photos.value.verification,'not-verified');assert.equal(context.adventures.value.relevant[0].photo.value,'saved-unverified');assert.equal(context.adventureState.value,'returned');assert.equal(context.mood.status,'UNAVAILABLE')
for(const secret of ['PRIVATE-ID','PRIVATE-PET','PRIVATE-PHOTO','PRIVATE-CAPTION','12.345678','76.54321'])assert.ok(!JSON.stringify(context).includes(secret))
const empty=buildGroundedContext(profile,'morning',[],'hi',true,'none',new Set(),[])
assert.equal(empty.adventures.value.total,0);assert.deepEqual(empty.nearbyPlaces.value.names,[])
const missing=buildGroundedContext({...profile,pet:undefined},'morning',records,'hi',false)
assert.equal(missing.adventures.status,'UNAVAILABLE');assert.equal(missing.breed.status,'UNKNOWN');assert.equal(missing.personality.status,'UNKNOWN');assert.equal(missing.photos.status,'UNAVAILABLE')
const damaged=buildGroundedContext(profile,'night',[{...record,completedAt:NaN,destination:null,photoId:'missing'}],'hi',true,'none',new Set())
assert.equal(damaged.adventures.value.relevant[0].date.status,'UNKNOWN');assert.equal(damaged.adventures.value.relevant[0].plannedPlace.status,'UNKNOWN');assert.equal(damaged.adventures.value.relevant[0].photo.value,'missing-file')
for(const species of ['cat','dog'])for(const personality of ['playful','sleepy','curious','shy','mischievous'])for(const affection of [10,50,90])for(const variant of PROMPT_VARIANTS){
 const p={...profile,species,affection,pet:{...profile.pet,personality}},c=buildGroundedContext(p,'night',[],'hello',true)
 const messages=buildGroundedPrompt(p,c,'x'.repeat(1000),variant)
 assert.equal(messages.length,variant==='one'?4:variant==='two'?6:2);assert.equal(messages.at(-1).content.length,500)
 assert.ok(messages[0].content.includes('KNOWN recorded, UNKNOWN absent, UNAVAILABLE inaccessible'));assert.ok(messages[0].content.length<6000)
 assert.deepEqual(messages.map(m=>m.role),messages.map((m,i)=>i===0?'system':i%2?'user':'assistant'))
}
for(const [text,reason] of [['','empty'],['x'.repeat(651),'too-long'],['hi hi hi hi hi','repetition'],['woof human','wrong-species'],['as an AI assistant, how can i help','generic-assistant'],['we visited a garden yesterday','unsupported-history'],['go outside now','pressure'],[STYLE_DEMOS.cat[0],'demo-copy']])assert.ok(validateResponse(text,empty,"i don't want to go outside",STYLE_DEMOS.cat).reasons.includes(reason),reason)
assert.equal(validateResponse('okay human. blanket patrol here. mrrp.',empty,"i don't want to go outside").valid,true)
assert.ok(validateResponse('meow!',{...empty,species:{status:'KNOWN',value:'dog'}},'hello').reasons.includes('wrong-species'))
for(const sound of ['meows softly','meowing','purred','hisses softly'])assert.ok(validateResponse(sound,{...empty,species:{status:'KNOWN',value:'dog'}},'hello').reasons.includes('wrong-species'))
for(const sound of ['barks loudly','barking','woofed'])assert.ok(validateResponse(sound,empty,'hello').reasons.includes('wrong-species'))
assert.ok(validateResponse('I found a hidden garden in a forgotten forest.',empty,'invent history').reasons.includes('unsupported-history'))
assert.ok(validateResponse("We don't have the photos of it anymore.",empty,'hello').reasons.includes('unsupported-history'))
assert.ok(validateResponse('Let me know if you need more details.',empty,'hello').reasons.includes('generic-assistant'))
assert.equal(validateResponse('You had a difficult day. soft paws here.',empty,'I had a difficult day').valid,true)
assert.ok(validateResponse('meows at chair. meows at table. meows at toy. meows at wall.',empty,'hello').reasons.includes('repetition'))
assert.equal(new Set(EVALUATION_PROMPTS).size,32)
for(const message of EVALUATION_PROMPTS)assert.equal(factualIntent(message),null,message)
for(const message of FACTUAL_EVALUATION_PROMPTS){const intent=factualIntent(message);assert.ok(intent,message);assert.doesNotThrow(()=>JSON.parse(deterministicFacts(context,intent)))}
async function main(){
 let calls=0;const messages=buildGroundedPrompt(profile,empty,'hello','two'),result=await runValidatedGeneration(messages,empty,async received=>{calls++;if(calls===2){assert.equal(received.length,2);assert.ok(received[0].content.includes('wrong-species'));assert.ok(!received.some(m=>m.role==='assistant'))}return {text:'woof',tokens:1,inputTokens:10,generationMs:5,firstTokenMs:1}})
 assert.equal(calls,2);assert.equal(result.accepted,false);assert.deepEqual(result.retryReasons,['wrong-species']);assert.equal(result.attempts.length,2)
 calls=0;const accepted=await runValidatedGeneration(messages,empty,async()=>{calls++;return {text:'soft paws. hello human.',tokens:6,inputTokens:10,generationMs:5,firstTokenMs:1}})
 assert.equal(calls,1);assert.equal(accepted.accepted,true)
 calls=0;const recovered=await runValidatedGeneration(messages,empty,async()=>{calls++;return {text:calls===1?'':'soft paws. hello human.',tokens:calls===1?0:6,inputTokens:10,generationMs:5,firstTokenMs:1}})
 assert.equal(calls,2);assert.equal(recovered.accepted,true);assert.deepEqual(recovered.retryReasons,['empty']);assert.equal(recovered.attempts[0].text,'')
 console.log('PASS: 150 prompt variants, read-only grounding/privacy/relevant retrieval/empty and unavailable history/photos, validator rejection categories, at-most-one retry, 32 distinct conversational prompts and separate deterministic factual cases. No model loaded.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
