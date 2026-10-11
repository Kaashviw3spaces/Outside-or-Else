const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText,f);
const {talkFactIntent,formatTalkFacts}=require('../src/ai/talkFacts.ts'),{buildGroundedContext}=require('../src/ai/grounding.ts');
const profile={id:'qa',name:'Tashu',species:'cat',affection:11,pet:{breed:'classic-cat',personality:'mischievous'}};
for(const question of ['What is my name?',"What's my name?",'Do you know my name?','Can you remember my name?']){
 const intent=talkFactIntent(question),context=buildGroundedContext(profile,'night',[],question,true);
 assert.equal(intent,'human-name');assert.equal(formatTalkFacts(intent,context,profile,null),"Your name is not recorded in this game. Your companion's saved name is Tashu.");
}
assert.equal(talkFactIntent('What is your name?'),'identity');
assert.equal(talkFactIntent('What did we do on our last adventure?'),'adventures');
assert.equal(talkFactIntent('What would you do if we found a giant butterfly?'),null);
const challengeAnswer=formatTalkFacts('challenge',buildGroundedContext(profile,'night',[],'challenge rules',true),profile,null);
assert.match(challengeAnswer,/completed outing with a saved photo qualifies/);assert.doesNotMatch(challengeAnswer,/completed time-goal outing/);
console.log('PASS: unknown human name is not replaced with the pet name; companion identity, factual adventure routing and creative AI routing remain intact.');
