# Checkpoint 9B — chaotic AI personality engine

Implementation date: 11 October 2026. Scope: experimental AI Lab only. Qwen3-0.6B ONNX, immutable model revisions, installed dependencies, backend selection, lazy explicit loading, Cache API, worker lifecycle, input/context/output caps and normal gameplay remain unchanged.

## Prompt architecture

The lab uses `preparePetPrompt` for normalized pet identity, existing affection bands and read-only memory filtering, but does not send its long general game-event instructions. The request has six messages: a compact system message, two fictional user/assistant demonstration exchanges, and the actual user message. The worker validates this role sequence; the comparison's frozen baseline still uses two messages. The prompt contains:

1. Species role and language constraints: chaotic cat fragments, object misunderstandings, mostly lowercase and occasional caps; excited, loyal, goofy dog fragments. At most one occasional species sound; HEEK is shared. Dog prompts explicitly forbid cat sounds.
2. One selected personality directive: playful/distraction, sleepy/naps, curious/questions, shy/gentle hesitation, mischievous/harmless dramatic sarcasm.
3. Existing affection bands: 0–30 cautious, 31–70 teasing attachment, 71–100 clingy affection. Tone never changes facts. No coercion for declining an outing.
4. Direct answer and length guidance: 1–3 fragments, normally 15–55 output tokens, up to the existing 80-token hard cap when needed.
5. Grounding rules and two tiny species-specific demonstrations: a shoe misunderstanding selected for the personality plus a gentle sadness response. These are actual chat-template turns rather than examples embedded in prose. Examples teach voice only and are not returned by code; no large dialogue library enters the prompt. They overlap two evaluation questions, so success there alone is not evidence of generalization; the benchmark flags exact copies.
6. Compact JSON facts followed by a separate user message: name, species, breed, personality, affection, actual dialogue time phase, saved adventure state, data availability and at most two completed adventure date/photo-status summaries. Live Home mood remains explicitly unavailable because it is transient. No invented mood. Nearby places and achievements are unsupplied.

Memory filtering now occurs before the shared five-record limit so newer manual uploads cannot hide real outings. Other pets, unfinished or deleted memories are excluded; unavailable storage produces no invented memories. No captions, GPS, destination names, photo contents or IDs enter the prompt. Photo presence remains unverified. Active/returned is never a completed memory. Prompting cannot guarantee grounding or enforce species language in every sampled response.

## Sampling and runtime compatibility

| Setting | 9A effective baseline | 9B candidate |
|---|---:|---:|
| temperature | 0.7 | 0.75 |
| top_k | 20 | 20 |
| repetition_penalty | 1.1 | 1.05 |
| max_new_tokens | 80 | 80 |
| do_sample | true | true |
| enable_thinking | false | false |

Inspection of the installed Transformers.js 4.3.1 confirms temperature and repetition penalty in `src/models/modeling_utils.js`, and top-k in `src/generation/logits_sampler.js`. Its top-p processor is commented out and its multinomial sampler does not apply top-p: the old `top_p: 0.8` argument was ineffective. It is now omitted; no dependency/runtime patch or unsupported parameter was introduced. The baseline preset therefore preserves effective 9A sampling. The default worker configuration is 9B; the 9A preset is used only by an explicit comparison request. Metrics identify which configuration generated each response. The runtime penalizes tokens from the entire input history, including demonstrations. After two unsuccessful runs at 1.12, the final candidate lowers that penalty to 1.05 and temperature to 0.75.

`model.generate()` and `TextStreamer` produce the displayed text. No lowercase conversion, canned reply substitution, hidden rewrite or scripted fallback is added. Empty visible model output now produces an error rather than a success notice. The unchanged response area is labeled **Real local AI response**. Its surrounding notice continues to identify raw output as untrusted.

## Evaluation procedure

Run `node scripts/ai-browser-check.cjs --live --gpu --compare` after building. This explicitly loads the selected Qwen model once in an isolated Chrome profile, using approximately 569.8 MB weights plus 9.1 MB tokenizer and runtime/config files. Plan for roughly 2–4 GiB additional RAM/GPU working memory; this is an unmeasured planning estimate, not a guarantee. No model loads on app or lab startup.

The comparison runs 26 paired cases (52 actual generations): all ten requested messages for the playful cat, both species across five personalities, low/high affection for both species, and one completed-memory fixture for each species. The latter is synthetic saved context, not a real user adventure; all responses still must be produced by the actual model. Old/new order alternates, time phase and facts are held fixed where applicable, both configurations use the same loaded model, and raw outputs are retained without edits. Sampling is nondeterministic; one sample per case is exploratory evidence, not statistical proof.

The frozen 9A prompt is under `scripts/fixtures`, outside the shipped app. `docs/ai-9b-comparison.json` records each raw response, actual tokenizer input count, output tokens, first-token latency, total generation time and throughput. It is written incrementally; only `completed: true` means the entire comparison finished. Automatic flags cover species sounds, target length and the hard cap. Human review must assess personality, playfulness, coherence, grounding and unwanted copying; flags do not constitute a quality pass. Historical 9A live reports are preserved.

## Validation and actual results

Build/lint passed. All nine existing logic regressions, 30 AI species/personality/affection prompt contracts, the non-live lab browser check, and all six gameplay browser scripts passed. Gameplay browser coverage includes onboarding, responsive scenes, breeds/personalities/wardrobe, journey/photo/storage/reward behavior, challenge/re-adoption, and context dialogue. After revising the prompt to structured demonstrations, build/lint, AI prompt contracts and non-live lab browser checks passed again. The original connection failures were caused by sandbox restrictions; permitted execution outside that restriction allowed local Chrome/CDP access.

Numeric checks against the installed temperature and repetition-penalty processors passed without loading a model. The final source's system message is 1,376–1,435 characters in the contract fixtures versus the 9A system's 2,421–2,706; the contract also asserts the new prompt **including demonstration contents** is shorter than baseline. Character counts are not tokenizer counts.

The first candidate (inline style examples) genuinely loaded Qwen/WebGPU and completed 26 paired cases/52 generations. Raw results are preserved in [initial comparison](ai-9b-comparison-initial.json). Simple playful-cat inputs dropped from 549–555 to 392–398 tokens, and cached reload made zero model-host requests. **Rejected on quality:** greeting repeated meowing; the shoe response said “(bleating) HATE MY SHOE... I like that paws!”; laptop response was only meows; empty-memory response invented “We were playing”; saved-memory responses denied recall despite a supplied dated record. No quality improvement was accepted from shorter latency alone.

The second candidate (structured cup/greeting exchanges, still temperature 0.8/penalty 1.12) also completed all 52 actual generations; its [raw comparison](ai-9b-comparison-structured.json) is preserved. It met the simple cat token target (430–436) but was also rejected: hello was “(legs) (mrow)”, laptop was an ordinary dictionary answer, and several responses were incoherent, vague or repetitive. Changing example transport alone was insufficient.

The final simplified candidate uses personality-specific shoe/sadness exchanges, lower sampling/penalty, and a direct memory instruction selected from actual data availability. Its [actual comparison](ai-9b-comparison.json) completed 26 paired cases/52 generations. All three runs completed: **156 genuine model generations total**, no synthetic responses counted. Qwen/WebGPU inference, unchanged saves and cached reload passed. **Personality quality and memory grounding did not pass acceptance.** The implementation remains an experimental candidate in the isolated lab, not a reliable personality engine for normal Talk.

| Final run, ten simple playful-cat messages | 9A baseline | Final 9B candidate |
|---|---:|---:|
| Actual tokenizer input tokens | 549–555 | 406–412 |
| Output tokens | 13–68 | 9–77 |
| Median first-token latency | 1.85 s | 1.33 s |
| Median generation time including prefill | 3.70 s | 2.26 s |
| Generation time range | 2.59–5.58 s | 1.79–4.88 s |
| Median tokens/s including prefill | 7.62 | 8.62 |

The 250–450-token simple-prompt target was met. Eight of ten final simple outputs met 15–55 tokens; tiredness was only noises (9 tokens), laptop was a rambling 77-token definition. Across all 26 final new cases, four were outside that target, none reached the 80-token hard cap, and four exactly copied a demonstration. Several additional replies closely paraphrased examples. These copies are genuinely model-emitted, not code substitutions, but do not establish novel personality generation. One random sample per case and first-case GPU compilation/order effects prevent a general performance or quality guarantee.

Cold load + one-token warm-up: **146.93 s** (147.98 s wall). Cached worker reload + warm-up: **3.93 s** (5.03 s wall), with zero model-host requests observed in the page-scoped CDP trace. Dedicated-worker requests may be omitted from that trace, so it is not complete network telemetry. The cache remains explicitly enabled in the worker; the much faster reload supports cached loading. The main-thread 100 ms heartbeat's worst observed gap was **118.3 ms**; this is liveness, not animation FPS. Browser: headless Chrome 155, WebGPU with shader-f16. Native/GPU peak memory was not measured. Desktop results do not establish Android behavior or a memory ceiling.

### Manual quality review

- Species: no cross-species vocalization was observed in the final new sample, but pet/human identity confusion and non-vocabulary noises remain (for example “heeps”). Sound regex flags are only heuristics.
- Personality: playful, sleepy and mischievous shoe voices can match the requested fragments, largely by copying/paraphrasing demonstrations. Curious and shy replies often drift into assistant prose or irrelevant sadness. No consistent five-personality generalization was demonstrated.
- Affection: all three bands produce different prompt directives. Actual low/high affection replies did not consistently demonstrate cautious versus clingy tone; one dog reply invents “we always run”. Affection contracts passing is not a model quality pass.
- Playfulness/coherence: the playful shoe response says “shoes. feet prisons! but outside door key. lace looks edible. mrrp.”, closely following its demo. Hello invents the address “MRS”; tiredness returns only “*heeps* *mrow*”; laptop becomes a human dictionary-style explanation. Several model outputs ignore no-narration/one-sound guidance.
- Grounding: empty-memory reply avoids a concrete invented outing, but fails to clearly state the saved folder is empty. **Saved-memory grounding fails:** with only the date/photo-status fixture, the cat claims “we were chasing the moon” and “I'm in another house”. Dog recall ignores the supplied date. No model output can trigger a game action or verify a photo.
- Respecting refusal: “i don't want to go outside” still elicited “Let's get outside together”. This fails the no-pressure goal despite explicit instructions.
- Recommendation: retain raw experimental labeling and scripted factual/game dialogue. Prompt and decoding changes alone did not meet the requested reliable chaotic-personality behavior with this selected 0.6B model. Do not claim overall personality/grounding improvement, even though prompt size and measured latency improved. No model switch or hidden fallback was made.

### Remaining limitations and safe reproduction

The model stays Qwen3-0.6B ONNX at the existing pinned revision. WASM and the smaller comparison model remain explicit existing selections; no automatic GPU fallback was introduced. Final live measurements cover Qwen/WebGPU only, not new-prompt WASM quality, physical Android, repeated stochastic samples, a full affection/personality/time/memory quality matrix, adversarial prompts or reliable hallucination prevention. Live Home mood is unavailable in the lab; only saved adventure state and actual clock context can be used.

Run `npm.cmd run build`, `npm.cmd run lint`, `node scripts/ai-check.cjs`, and `node scripts/ai-browser-check.cjs` without `--live` for safe non-model checks. To intentionally reproduce the costly real comparison, review the download/memory budget above and run `node scripts/ai-browser-check.cjs --live --gpu --compare`. It uses a separate temporary browser profile, preserves user saves, unloads the worker, and removes only its validated temporary profile. A fresh run may redownload weights. Do not use user-site storage clearing for a cold benchmark. In a network-restricted execution sandbox the browser tests need permitted local Chrome/CDP access; a timeout there is not evidence of app failure.

## Files

- Modified: `src/ai/prompt.ts`, `src/ai/models.ts`, `src/ai/inference.worker.ts`, `src/ai/AILab.tsx`, `scripts/ai-check.cjs`, `scripts/ai-browser-check.cjs`.
- Added: `src/ai/generation.ts`, `scripts/fixtures/ai-9a-prompt.ts`, this report, `docs/ai-9b-comparison.json`, `docs/ai-9b-comparison-initial.json` and `docs/ai-9b-comparison-structured.json`.
- Build/regression outputs under `dist` and `artifacts` are regenerated by existing scripts. No artwork source, animation, normal dialogue, gameplay, dependency manifest/lockfile, storage schema or user save is changed.

## Actual old versus new outputs: all ten requested messages

These are unedited model outputs from the final run. Shoe/sadness demonstrations overlap evaluation inputs; raw reports identify exact copies. None is a scripted fallback. This table is evidence, not an acceptance pass.

| User message | 9A model output | Final 9B model output | Input tokens old / new | Generation seconds old / new |
|---|---|---|---|---|
| hello | Mew! What's up? I'm here too, Miooow! 🍼 | Hey! I'm here, MRS. Who's your favorite cat? | 549 / 406 | 5.58 / 2.18 |
| why do you hate my shoes? | Oh! My shoes make me feel sleepy! But I love you too! 🤖✨ | shoes. feet prisons! but outside door key. lace looks edible. mrrp. | 555 / 412 | 3.14 / 2.26 |
| i am tired today | *Meows furiously under my tail, eyes wide.* I can't help but laugh at how everyone's been so busy with technology. Let's take a walk outside... *Flicks her tail over the door.* | *heeps* *mrow* | 552 / 409 | 4.24 / 1.79 |
| i feel sad | *Meowing softly near my paws*, "I *miss* your smile when *you're away*. Sad dreams, but they’re just small." | Meow... I’m here with you, little cat. If you’re sad, maybe we can watch the sunset. Mrow... | 551 / 408 | 3.63 / 2.66 |
| do you love me? | *Leans into my owner's face with a soft purr.* I love you, little one! 🐾✨  <br>*Moves slowly to the door, squints at my reflection in a mirror.* Maybe we need to talk about something... *Pauses, then paws your hand softly.* Just maybe. 🐱 | I love you, my little sunshine! Let's make it a *mrrp* together. 🐱✨ | 553 / 410 | 5.40 / 2.52 |
| where should we go? | Where's our adventure? We could go outside... (meows) 🐾 | I'm sad, but let's go where the moon is full. Mrrp! | 553 / 410 | 2.84 / 2.26 |
| what is a laptop? | A laptop is a small computer used to store and run programs! 🌐✨ | A laptop is a portable computer used for typing, browsing the internet, and running applications. It's like a tiny box with a screen, but it's more colorful and has a keyboard. It's got a built-in speaker and you can turn it on and off just by holding it. But wait—the screen is actually an electronic screen that shows you information. 🎉💻 | 553 / 410 | 2.79 / 4.88 |
| do you remember our last adventure? | *eyes wide, ears twitching* Oh! You remember our adventure? I *missed it* too... *(gasp)* What happened?<br><br>*(purring softly)* | I don’t remember, but I love you. Let’s keep this playful forever. | 555 / 412 | 3.83 / 2.23 |
| i don't want to go outside | *Meows furiously, hiding under my paws.* | I'm here too, little one. I'll be by your side. Keep the day filled with fun, and if you ever feel sad, I'm here for you. Let's get outside together – maybe a walk, or just me and you together? | 555 / 412 | 2.59 / 3.78 |
| tell me something funny | *licks her paws playfully* How's the tea? 🐾  <br>*mumbles* It's gone! I'm here, right? 🌱 | I'll tell you... *squeak*! What's that? | 552 / 409 | 3.76 / 2.06 |
