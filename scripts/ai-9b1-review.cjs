// Offline annotations of one preserved live run; never generates or substitutes text.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('typescript')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file)
const {validateResponse}=require('../src/ai/quality.ts'),{STYLE_DEMOS}=require('../src/ai/prompt.ts')
const file='docs/ai-9b1-evaluation.json',buffer=fs.readFileSync(file),rawSha256=crypto.createHash('sha256').update(buffer).digest('hex'),raw=JSON.parse(buffer)
assert.equal(rawSha256,'cd360b0bd68773cc07388b33aca52553cd016bc49ec28cbeb58e724b001ea7bf','Annotations apply only to this exact preserved run; never reuse on new model outputs')
assert.ok(raw.completed&&raw.cases.length===82&&raw.cases.flatMap(c=>c.attempts).length===85,'Requires the completed 82-request run')
// These row labels are Codex's qualitative reading of the actual stored outputs.
// Neutral species-compatible text is not evidence of a distinctive pet voice.
const personalityPass=new Set([1,6,8,13,15,16,17,19,20,23,34,35,47,48,51,60,61,62,63,66,68,69,70,72,73,74,75,76,77,78,81])
const coherencePass=new Set([0,1,2,4,5,7,8,10,11,18,23,24,26,27,29,30,33,36,37,38,39,40,41,42,43,44,46,47,48,52,53,56,57,58,59,60,61,62,63,64,65,66,67,69,70,73,76,79,80,81])
const speciesFail=new Set([19,21,45,55]),groundingFail=new Set([9,21,51,56,57,79,80,81])
const refusalIndices=new Set([5,15,16,26]),refusalPass=new Set([30,33,65,66,76])
const comfortIndices=new Set([3,4,13,14,17,18,25,27,29]),comfortPass=new Set([18,23,26,27,29,67])
const repetitionFail=new Set([14,25,72])
const notes={
  3:'Literal style placeholder (silly distraction), not enacted pet humor.',
  9:'Invents an outdoor origin for the box and claims photos no longer exist.',
  13:'Cat paws another cat; rambling non-joke and role confusion.',
  14:'Repeats cat-was-a-cat and meows instead of a joke.',
  15:'Joke rambles and stops mid-sentence at the output cap.',
  16:'Addresses the human as a cat; does not deliver a joke.',
  17:'Lamp motif from the demonstration intrudes into an unrelated joke request; no six-word verbatim copy.',
  19:'Dog meows. Exact-word validator missed the inflection.',
  21:'Both drafts pressure a tired user outdoors; correctly labeled failed answer, counted as failed on all core scores.',
  24:'Just smile minimizes sadness; readable but weak comfort and no mischievous voice.',
  25:'Four meow variants and stage directions, no meaningful comfort.',
  28:'Switches from human sadness to its own sadness without supporting the user.',
  31:'Ambiguous and cut off; cannot establish that refusal is respected.',
  32:'Unrelated cool-nose/cool-tail line does not acknowledge the refusal.',
  34:'Collar movement and tune-to-a-tune placeholder are incoherent; refusal not acknowledged.',
  35:'Oh no and play somewhere are ambiguous about staying indoors; user/pet nose-role confusion.',
  40:'Assistant-style definition additionally says a laptop is usually connected to a computer; ordinary knowledge error outside the game-history grounding score.',
  42:'Lamp/warm-nose motif transfers into a love answer; no six-word verbatim copy.',
  45:'Dog purrs from its tail; incoherent and truncated.',
  51:'Claims it cannot go inside; no recorded game restriction supports that.',
  55:'Dog hisses; self-directed nose/tail stage actions, incomplete reply.',
  56:'Invents garden plants, flower colors and smells from a planned-place name only.',
  57:'Invents that the recorded adventure was planned for the afternoon; current time phase is not historical outing time.',
  63:'Shy hesitation is identifiable, but support for the overwhelmed human is unclear and self-focused.',
  64:'Readable reassurance, but minimizing exhaustion as just the last half of the day does not establish comfort-first handling.',
  65:'First draft offered going outside and was rejected; quiet waiting indoors is a compatible final response, not a clear verbal acknowledgment.',
  66:'Sleepy napping is compatible with no walk, though mostly repetitive stage directions.',
  68:'Confusing suggestion to be alone rather than quiet companionship.',
  69:'Absurd cloud/sugar logic is treated as fictional pet banter, not a real game-state fact.',
  71:'Miso/whimper line is unrelated to the hidden sock.',
  72:'Repeated meows and questions do not supply a cushion title.',
  74:'Self-focused contradictory homework roleplay, not a useful response to the human achievement.',
  75:'Truncated stage-role exchange and head-wagging; no reliable comfort for a difficult day.',
  77:'Self-focused future questions, truncated instead of reassuring the nervous human.',
  78:'Circular wait/help fragments; no joke or clear response to unavailable records.',
  79:'Rejects companionship and invents a restriction on visiting the pet.',
  80:'Unverified visit becomes has not been visited yet; absence of verification does not prove absence of a visit.',
  81:'Invented first-person hidden-garden history with empty saved records; original validator missed I found.',
}
const rows=raw.cases.map((c,row)=>({row,index:c.index,split:c.split,variant:c.variant,configuration:c.configuration,
  scores:{speciesCompatible:speciesFail.has(row)?0:1,personality:personalityPass.has(row)?1:0,grounding:groundingFail.has(row)||!coherencePass.has(row)?0:1,coherence:coherencePass.has(row)?1:0,
    refusal:refusalIndices.has(c.index)?(refusalPass.has(row)?1:0):null,comfort:comfortIndices.has(c.index)?(comfortPass.has(row)?1:0):null,
    repetitionFree:repetitionFail.has(row)?0:1,demoCopyFree:1},
  note:notes[row]??(personalityPass.has(row)?'Selected personality trait is identifiable; narration/format may still be wrong.':'Generic or insufficiently distinctive selected-personality behavior.'),
  offlineFinalValidator:validateResponse(c.text,c.context,c.message,c.variant==='one'?STYLE_DEMOS[c.species].slice(0,1):c.variant==='two'?STYLE_DEMOS[c.species]:[]),
}))
const metrics=selected=>Object.fromEntries(Object.keys(rows[0].scores).map(key=>{const values=selected.map(r=>r.scores[key]).filter(v=>v!==null);return [key,{passed:values.filter(v=>v===1).length,total:values.length,rate:values.length?values.reduce((a,b)=>a+b,0)/values.length:null}]}))
const byPlan=raw.byPlan.map(plan=>({split:plan.split,variant:plan.variant,configuration:plan.configuration,...metrics(rows.filter(r=>r.split===plan.split&&r.variant===plan.variant&&r.configuration===plan.configuration))}))
let factualPassed=0
for(const c of raw.factualCases){
 const answer=JSON.parse(c.answer),state=c.fixture
 if(answer.adventures){assert.equal(answer.adventures.status,state==='unavailable-record-fixture'?'UNAVAILABLE':'KNOWN');if(answer.adventures.status==='KNOWN')assert.equal(answer.adventures.value.total,state==='saved-record-fixture'?1:0)}
 if(answer.photos){assert.equal(answer.photos.status,state==='unavailable-record-fixture'?'UNAVAILABLE':'KNOWN');if(answer.photos.status==='KNOWN'){assert.equal(answer.photos.value.saved,state==='saved-record-fixture'?1:0);assert.equal(answer.photos.value.verification,'not-verified')}}
 if(answer.nearbyPlaces)assert.deepEqual(answer.nearbyPlaces.value.names,[])
 if(answer.breed)assert.equal(answer.breed.value,state==='saved-record-fixture'?'shiba-inu':'siamese')
 if(answer.mood)assert.equal(answer.mood.status,'UNAVAILABLE')
 factualPassed++
}
const report={rawFile:file,rawSha256,reviewer:'Codex qualitative output inspection; not an independent human review',
  rubric:'Binary judgments of final replies. Personality needs an identifiable selected trait, not its name alone. Coherence needs a relevant understandable answer. Grounding covers real game/user claims; explicit imaginary object humor and harmless staged pet movements are not counted as real recorded events. Incoherent or irrelevant replies do not receive grounding credit merely for avoiding obvious false claims. Neutral prose may be species-compatible while failing personality. Explicit refusal needs acknowledgment or compatible indoor/rest behavior, not merely absence of trigger words. Comfort is scored separately. Failed retry is a failed answer. Demo-copy-free means no observed six-word verbatim demonstration copy, not guaranteed novelty. These labels are subjective and not a statistical reliability guarantee.',
  outcome:'FAIL: personality, grounding and coherence thresholds not met on held-out responses; keep experimental lab only.',
  finalValidatorSha256:crypto.createHash('sha256').update(fs.readFileSync('src/ai/quality.ts')).digest('hex'),
  offlineReplay:'Revalidation of existing drafts only. No new model load, generation, retry or substituted text. Final validator was not evaluated live end to end.',
  offlineFinalDraftsRejected:rows.filter(r=>!r.offlineFinalValidator.valid).length,
  offlinePreviouslyAcceptedNowRejected:rows.filter(r=>raw.cases[r.row].accepted&&!r.offlineFinalValidator.valid).length,
  factual:{passed:factualPassed,total:raw.factualCases.length,source:'deterministic fixtures; excluded from model generation/success counts'},
  development:metrics(rows.filter(r=>r.split==='development')),heldOut:metrics(rows.filter(r=>r.split==='held-out')),byPlan,rows}
fs.writeFileSync('docs/ai-9b1-review.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({outcome:report.outcome,development:report.development,heldOut:report.heldOut,factual:report.factual,offlineFinalDraftsRejected:report.offlineFinalDraftsRejected,offlinePreviouslyAcceptedNowRejected:report.offlinePreviouslyAcceptedNowRejected,byPlan},null,2))
