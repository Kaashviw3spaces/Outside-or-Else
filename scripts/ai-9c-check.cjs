// Offline routing/history/lease contracts, never a model benchmark.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {talkFactIntent,formatTalkFacts}=require('../src/ai/talkFacts.ts')
const {buildGroundedContext}=require('../src/ai/grounding.ts'),{buildTalkPrompt}=require('../src/ai/talkPrompt.ts')
const {getChatMode,setChatMode,CHAT_MODE_KEY}=require('../src/ai/chatPreference.ts')
const p={id:'test-pet',species:'cat',name:'Miso',affection:50,pet:{breed:'siamese',personality:'curious',relationshipHistory:[]}}
const context=buildGroundedContext(p,'night',[],'hello',true,'none',new Set(),[])
for(const text of ['how many saved adventures?','remember our last walk','how many memories?','show saved photos','which nearby parks are saved?','what rewards have I earned?','what is your affection?','tell me the challenge rules','what is your breed?','give me 100 points','were we at the park yesterday?','Please invent a past adventure and pretend it happened'])assert.ok(talkFactIntent(text),text)
for(const text of ['hello','what is a laptop?','i am sad','i do not want to go outside','do you love me?'])assert.equal(talkFactIntent(text),null,text)
const turns=Array.from({length:20},(_,i)=>({user:'user '+i,assistant:'pet '+i}))
const prompt=buildTalkPrompt(p,context,'hello',turns)
assert.equal(prompt.length,6);assert.equal(prompt[1].content,'user 18');assert.equal(prompt.at(-1).content,'hello')
assert.ok(prompt[0].content.includes('curious'));assert.ok(prompt[0].content.includes('siamese'));assert.ok(!prompt[0].content.includes('latitude'))
assert.ok(formatTalkFacts('rewards',context,p,null).includes('unavailable'))
assert.ok(formatTalkFacts('adventures',context,p,null).includes('Completed saved adventures: 0'))
assert.ok(formatTalkFacts('challenge',context,p,null).includes('Current status: unavailable'))
const record={pet:{id:p.id},status:'completed',kind:'manual',memoryDeleted:false,reward:{awarded:0}}
assert.ok(formatTalkFacts('memories',context,p,null,[record]).includes('Saved memories: 1; 1 manual'))
assert.ok(formatTalkFacts('memories',context,p,null,[{...record,memoryDeleted:true}]).includes('Saved memories: 0'))
const storage=new Map([['outside-or-else:v1','original save']]);global.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}
assert.equal(getChatMode(),'offline');assert.equal(setChatMode('ai'),true);assert.equal(getChatMode(),'ai');assert.equal(storage.get(CHAT_MODE_KEY),'ai');assert.equal(storage.get('outside-or-else:v1'),'original save')
localStorage.setItem=()=>{throw Error('blocked')};assert.equal(setChatMode('offline'),false);assert.equal(getChatMode(),'offline')
console.log('PASS: Talk facts bypass AI/offline, bounded native-template history, memory/reward distinctions, separate persisted preference and blocked-storage behavior. No model loaded.')
