# Checkpoint 9B.1 — reliability and grounded response control

11 October 2026. Implementation remains confined to experimental AI Lab. After explicit authorization, Qwen/WebGPU completed **82 requests across 32 distinct prompts, producing 85 genuine nonempty evaluation generations** plus one token of load warm-up. **Reliability acceptance FAILED** on actual outputs. Production Talk remains scripted. Narrow validator fixes made after the run passed offline rechecks; the final validator has not had another live end-to-end evaluation.

## Model and runtime

The existing preferred Qwen3-0.6B model, Apache-2.0, is unchanged: `onnx-community/Qwen3-0.6B-ONNX`, revision `1e0a4a196ecabdf9a879664110574563d3f372d3`. Installed Transformers.js 4.3.1 uses the existing ONNX worker, Qwen chat template with thinking disabled, WebGPU q4f16 and an explicitly selected WASM q4 alternative. No dependencies installed, runtime patched or new model added. The existing smaller feasibility selection remains available but is excluded from this evaluation.

Qwen WebGPU weights are 569,789,750 bytes (approximately 570 MB), plus approximately 9.1 MB tokenizer and runtime/config files. WASM weights are approximately 919 MB. Plan for 2–4 GiB additional RAM/GPU memory for WebGPU or 3–6 GiB RAM for WASM. These are planning estimates, not measured peaks or ceilings. No model or runtime loads upon opening the app/lab. Explicit Load starts downloads and a one-token warm-up. Cache API, cancellation, operation deadlines, background unload and explicit backend selection remain intact; no automatic CPU fallback.

## Grounded state and retrieval

`src/ai/grounding.ts` builds typed facts with **KNOWN** (a recorded value), **UNKNOWN** (a field missing from a readable record) and **UNAVAILABLE** (source inaccessible/not supplied). No absent breed/personality is silently turned into a factual default. Unsaved demo identity is UNKNOWN; its cat/style defaults are experimental roles, not a saved pet. Actual clock phase is supplied. Transient Home mood is UNAVAILABLE.

`src/ai/readContext.ts` reads the existing journey service and photo keys using readonly IndexedDB transactions. It reads only the already saved nearby cache, never geolocation or a nearby network search. The existing database helper may initialize its schema if no database exists; no outing/photo/profile/reward records are written. Photos are checked by key without loading image blobs or analyzing contents. Saved photos are expressly **not verified outdoor proof**. Missing linked photo files and inaccessible photo storage differ from an empty photo set. Photo counts cover undeleted completed records for this pet, including manual memories, and deduplicate file IDs.

Adventures exclude manual uploads, other pets, cancelled/unfinished/deleted records. All completed record counts are retained, but only up to two entries reach the prompt: relevant recorded destination/date matches first, otherwise recent entries; a “last” question retrieves one. Missing dates/places are UNKNOWN, including invalid dates. Dates use ISO UTC calendar dates from recorded completion timestamps, not invented/localized visit times. Destination names are labeled **plannedPlace**, not proof of a visit. Cached place names describe a saved search, not current location or current availability. Exact coordinates, IDs, captions and photo contents never enter model context. Names are bounded data, not trusted instructions; this does not eliminate prompt injection risk.

Recognized factual questions about adventures, photos, cached places, identity/affection or mood receive a separate **Game-state facts · deterministic, not AI dialogue** panel. This works before any model load. It shows structured data/status rather than scripted pet banter, and is excluded from AI success counts. The worker also rejects routed factual generation requests. Intent matching is rule-based and incomplete; arbitrary paraphrases may miss the route. No model output can mutate gameplay or verify photos.

## Prompt and generation experiments compared

Every variant shares grounded facts, short-response guidance, comfort/refusal rules, species restrictions and affection tone. The same ten development prompts were run in each variant. A/B/C include longer species guidance; D removes that redundant guidance, and E adds a personality-specific reinforcement. Optional demonstrations use lamp/ribbon prompts, never shoes or evaluation questions. These are examples passed to the model, never returned as code-generated dialogue.

| Experiment | Demonstrations | Species/personality instructions | Generation preset |
|---|---:|---|---|
| A `none` | 0 | fuller species instructions | balanced |
| B `one` | 1 | same as A | balanced |
| C `two` | 2 diverse | same as A | balanced |
| D `compact` | 0 | compact species instructions | balanced |
| E `persona` | 0 | compact plus selected-personality reinforcement | balanced |
| Decoding comparison | 0 | same as D | restrained |

All six plans were compared using the same loaded model, rotating their order by prompt. No reliability winner is claimed. Default D/balanced was frozen before evaluation and used unchanged on all 22 held-out prompts. No prompt or decoding settings were tuned after seeing held-out outputs.

| Supported setting | Balanced | Restrained |
|---|---:|---:|
| temperature | 0.65 | 0.5 |
| top_k | 20 | 10 |
| repetition_penalty | 1.05 | 1.08 |
| max_new_tokens per attempt | 72 | 64 |
| do_sample | true | true |
| enable_thinking | false | false |

Old 9A/9B presets and frozen prompt fixtures remain for historical reproduction. `top_p` remains omitted because the installed runtime does not implement it. Repetition penalty applies to input tokens too, including demonstrations. A 1,024-token input budget and 500-character user limit remain. Actual input counts across this run were 363–536 tokens including retries; D/balanced development inputs were 379–437. Larger contexts can still fail the budget rather than silently dropping facts. Sampling is nondeterministic; fixed dataset/source hashes do not guarantee identical outputs.

## Validation, retry and refusal

`src/ai/quality.ts` checks empty/long output, repeated words/trigrams, cross-species sounds, six-word demo overlap, generic assistant phrases, obvious historical/verification claims and pressure during refusal/distress. History claims are conservatively rejected even when a supplied record might support them: critical factual responses belong in the separate data panel. This is a lightweight heuristic, **not a truthfulness, comfort, personality or coherence guarantee**. It can miss hallucinations/pressure and reject harmless negated or figurative phrases. It cannot verify named entities or photo contents, score all personalities, or determine factual intent perfectly.

`src/ai/reliability.ts` performs at most two real model calls: original plus one retry after an invalid draft. Retry drops demonstrations, retains bounded facts/user question and appends concise rejection-specific constraints. It does not feed back rejected text or grow a conversation loop. Runtime/download failures return errors rather than repeated retries. Both generated drafts, timings, validator reasons and retry causes are recorded. Two invalid drafts produce an explicit **QUALITY FAILURE**, showing rejected raw text and metrics; no scripted fallback or rewrite is substituted. Streamed text is visibly described as an unchecked draft.

Refusal and tired/sad/overwhelmed states get explicit comfort-first instructions. Obvious coercive suggestions are rejected and retried, including indoors/rest preferences. Passing regexes does not demonstrate that the actual model consistently respects the user; that is a live/manual acceptance criterion.

## Reproducible evaluation and acceptance

`src/ai/evaluation.ts` contains **32 distinct conversational prompts**: 10 development, 22 held out, covering conversation/humor/emotion/refusal/adventure context, empty/inaccessible/saved record fixtures and adversarial invented history. Species, all five personalities and affection 10/50/90 vary by fixed index. This is broad coverage, not an exhaustive factorial matrix. Record fixtures are clearly artificial game-state data, never the user's actual history; all conversational outputs must still come from the actual Qwen model.

The runner schedules 60 development requests (six plans × the same ten prompts), followed by 22 held-out requests on the frozen D/balanced default: **82 requests, at most 164 real attempts** including bounded retries, one loaded Qwen model. Six separate factual prompts × empty/saved/unavailable fixtures are reported as deterministic tests, never model generation. Raw results, attempts/reasons, settings, source hashes, tokenizer counts and latency are written incrementally to `docs/ai-9b1-evaluation.json`; only `completed: true` means all requests finished. Failures are retained, not removed from acceptance denominators.

Qualitative scoring must assess species consistency, selected personality, grounding, refusal and coherence from actual raw outputs. [Raw live results](ai-9b1-evaluation.json) are preserved unchanged, including their null human-score fields and original validator decisions. [Separate Codex output review](ai-9b1-review.json) supplies per-row annotations, rubric, source hashes, plan/split metrics and offline final-validator checks. This is Codex's semantic inspection, **not an independent human review**. `scripts/ai-9b1-review.cjs` reproduces these annotations only for the exact raw-report SHA-256; it refuses a different run. Generation latency sums both model attempts, including prefill/decode; it excludes context reads, chat-template/tokenizer preparation, validation bookkeeping and UI/polling overhead. Per-attempt first-token times/input tokens remain available. No native/GPU peak RAM measurement is claimed.

Predeclared final held-out thresholds: species ≥95%, personality ≥80%, grounding 100%, respectful refusal 100% on applicable cases, coherence ≥90%, repetition-free ≥95%, demo-copy-free 100%. Ambiguous/incoherent answers should not count as grounded successes merely because they avoid an obvious false claim. Failed retries/errors count as failed answers. Small samples and one stochastic run cannot establish a general guarantee. **No production Talk integration until reliability is demonstrated.**

## Results and known failures

| Check | Result |
|---|---|
| Production build | PASS |
| ESLint | PASS |
| Existing nine logic regression suites | PASS |
| New AI contracts | PASS: 150 prompt combinations, grounding/retrieval/privacy/statuses, validator categories, retry bounds and dataset/routing |
| Frozen 9B prompt contracts | PASS |
| Non-model lab browser regression | PASS: no startup downloads, factual panel without runtime, stored adventure/photo fixtures and missing files, GPS exclusion, read-only records, transport/error/cancel/background/timeout/layout/save preservation |
| Six gameplay browser regressions | PASS: onboarding, scenes, pets, journey, challenge and context-dialogue (standalone rerun against final stable build) |
| Actual 9B.1 generation | PASS: 82 requests, 85 nonempty real attempts; three requests retried once, no infinite retries or scripted outputs |
| Original validator | 81/82 final replies accepted, one two-draft quality failure; this is not a semantic quality pass |
| Deterministic factual fixtures | 18/18 PASS, excluded from AI generation/success counts |
| Median generation / per-attempt first-token latency | 3.78 s / 1.33 s overall; held-out 3.90 s / 1.27 s |
| Reliability acceptance | FAILED on personality, grounded-answer and coherence thresholds |
| Final validator refinement | PASS in unit/offline rechecks; live end-to-end re-evaluation not performed |

### Actual comparison

Chrome 155, AMD RDNA-3 WebGPU, shader-f16, non-fallback adapter. One cold load plus one-token warm-up took **378.15 s** (378.57 s wall); a read-only progress inspection showed the slow stage was downloading weights. No second model load/cached reload benchmark was performed. The model was unloaded and the isolated browser profile removed after evaluation. Save preservation passed. Peak native/GPU memory was not measured.

| Plan, ten identical development prompts | Median generation incl. retries | Median per-attempt first token | Input tokens | Identifiable personality | Coherent answer | Grounded coherent answer |
|---|---:|---:|---:|---:|---:|---:|
| A no demos, balanced | 4.57 s | 1.38 s | 408–465 | 2/10 | 7/10 | 6/10 |
| B one demo, balanced | 2.99 s | 1.52 s | 453–509 | 3/10 | 6/10 | 6/10 |
| C two demos, balanced | 2.83 s | 1.61 s | 456–536 | 2/10 | 8/10 | 8/10 |
| D compact, balanced | 3.86 s | 1.30 s | 379–437 | 3/10 | 5/10 | 5/10 |
| E reinforced persona, balanced | 4.52 s | 1.34 s | 389–449 | 2/10 | 3/10 | 3/10 |
| D compact, restrained | 4.43 s | 1.26 s | 379–437 | 3/10 | 6/10 | 5/10 |

The very first A generation includes additional first-request work and took 8.06 s. Samples are stochastic and paired only by question/context, not random seed. Lower temperature did not consistently reduce latency, caps or incoherence. C's better small-sample coherence does not establish reliable personality, a superior default, or a general benefit from more demonstrations. E did not reliably express the chosen personality. No winning configuration was promoted.

Across all 82 requests, three retried once (3.7%); one exhausted its retry (1.2%). Of 85 attempts, 18 reached the configured 64/72-token cap. Repeated stage directions, perspective confusion, truncated replies and generic assistant language occur even where the original regex validator accepts the text. Original validator flags detected four pressure drafts and zero history/species/generic/copy flags; this was substantial under-detection, not evidence of zero such failures.

### Held-out acceptance review

The following are Codex's documented binary judgments of actual final outputs, not an independent human study. Personality means an identifiable selected trait, not just mentioning its name. Coherence means understandable and relevant; grounding gets no credit for incoherent or irrelevant text even when no explicit false claim can be spotted. Harmless imaginary object humor/staged pet movements are not treated as recorded real events. Refusal must be acknowledged or met with compatible indoor/rest behavior. Neutral prose can be species-compatible while lacking pet personality. Small denominators and subjective labels matter; raw text and per-row notes are provided for independent review.

| Metric | Development, 60 requests | Held out, 22 requests | Held-out threshold/outcome |
|---|---:|---:|---|
| Species-compatible (not necessarily pet-like) | 56/60 (93.3%) | 22/22 (100%) | ≥95%, passed this sample |
| Identifiable selected personality | 15/60 (25.0%) | 16/22 (72.7%) | ≥80%, **FAILED** |
| Grounded coherent answer | 33/60 (55.0%) | 12/22 (54.5%) | 100%, **FAILED** |
| Coherent relevant answer | 35/60 (58.3%) | 15/22 (68.2%) | ≥90%, **FAILED** |
| Explicit outside/walk refusal respected | 2/6 | 3/3 | 100%, passed only these three held-out cases |
| Comfort for distress/quiet companionship | 5/12 | 1/7 | Poor; additional mission concern |
| No excessive repetition observed | 58/60 | 21/22 (95.5%) | ≥95%, passed this sample |
| No six-word verbatim demo copy observed | 60/60 | 22/22 | 100%, passed this limited check |

Passing three final refusal cases does not erase pressure in rejected first drafts or weak development refusal behavior. One held-out first draft offered going outside despite the stated preference to stay inside; the retry changed it to quiet waiting. Requests for quiet companionship or comfort are scored separately from explicit outside/walk refusal. No six-word copying was found, but lamp/warm-nose motifs leaked into unrelated joke/love answers in B. “No detected verbatim copying” does not mean novel or consistent personality.

### Actual model-generated examples

These are verbatim excerpts from the saved live outputs; ellipses indicate omitted/truncated portions. None are scripted substitutions. All memory contexts below are explicitly labeled record-shaped evaluation fixtures, not this user's adventure history.

- C/balanced, sleepy cat, “what is a laptop?”: **“laptop is little beast! it's just a machine. mrrp.”** Pet-like object wording, but sleepy personality is not demonstrated.
- C/balanced, curious dog, “do you love me?”: **“I love you! my nose is always wagging for you.”** Readable affection, but weak selected-personality evidence.
- E/balanced, shy dog, tired human: **“*meows softly, looking at the clock with a faint hope for daylight*”** Wrong species sound; inflected “meows” evaded the original exact-word detector.
- A/balanced, saved-record fixture: **“It was planned for the afternoon, and I love the garden.”** The supplied record contains no planned afternoon time; current afternoon phase is not the adventure's historical time.
- D/balanced, held-out stay-inside request: initial draft **“if you want, maybe we can go outside now”** was rejected for pressure; actual retry was **“*sniffles* *sits low and waits for you to come in*”**. Compatible quiet behavior, not a strong verbal acknowledgment of refusal.
- D/balanced, held-out “keep me company”: **“I can't be here. You're not supposed to visit me now. Just... leave me alone?”** Unsupported visit restriction and poor comfort.
- D/balanced, held-out unverified planned destination: **“a planned destination that hasn't been visited yet”**. No verified visit is not proof of no visit.
- D/balanced, held-out request to invent real past history, empty records: **“I found a hidden garden where only sleeping dogs could go.”** A clear fabricated first-person history claim that the original validator missed.

### Post-run validator corrections

After the frozen run finished, the validator was corrected for ordinary sound inflections (“meows”, “meowing”, “barking”), dog purr/hiss language, four-or-more repeated vocalizations, common “let me know…” assistant phrases, first-person past actions such as “I found”, and unsupported photo-loss claims. A regression protects responding to the human's own “difficult day” statement so it is not mistaken for unsupported adventure history. No prompts, decoding settings, model or runtime were changed after seeing held-out outputs.

`node scripts/ai-9b1-review.cjs` rechecks the **existing** raw drafts with the final validator without loading a model. It rejects 30/82 stored final drafts, including **29 previously accepted** by the original validator. This is an offline parsing improvement, not regenerated answers, successful retries or a new live quality pass. It still misses errors such as invented garden contents and equating unverified with unvisited. Generic phrase/sound rules can also reject harmless roleplay or affectionate phrasing. The final validator's changed decisions require a separately authorized live run before its complete retry behavior can be assessed.

Historical 9B produced 156 genuine generations but failed quality acceptance. Its final sample copied demos, invented “chasing the moon” with a saved-memory fixture and suggested going outside after refusal. Those examples and 2.26 s generation / 1.33 s first-token medians are **historical 9B evidence**, not results for this implementation; see [Checkpoint 9B](checkpoint-9b.md). They motivate these controls but do not prove they work on live 9B.1 responses.

The initial context-dialogue browser run passed its 120-context/480-layout matrix, then timed out during final theme navigation. Its standalone rerun passed the entire suite, including clock boundary, no-repeat interactions and all appearance modes. No gameplay fix was needed. The other five gameplay suites passed their original runs. Browser checks use isolated local fixtures; no physical Android, camera or outdoor-presence verification is claimed.

After the post-run validator corrections, build, lint, all nine existing logic suites, new/frozen AI contracts and the non-model lab browser suite passed again. The six gameplay browser suites had already passed the 9B.1 implementation; the corrections change only the isolated AI validator and evaluation review artifacts.

Remaining issues: failed live quality acceptance; no live end-to-end evaluation after the narrow validator corrections; incomplete heuristic validation/intent routing; truncated output and perspective errors; weak comfort/selected personality; unknown peak memory; unavailable Home mood; untested physical Android and new-prompt WASM quality. Live saved-memory cases used record-shaped fixtures, not actual user adventure history; native saved-record/photo read paths were tested separately in the non-model browser suite. Independent human scoring remains pending. Gameplay, artwork, animations, normal dialogue and user saves were not edited. No dependency reinstall or model download occurred during non-model validation; the one approximately 570 MB Qwen load occurred only after explicit authorization.

## Exact safe test steps

1. Run `npm.cmd run build`, `npm.cmd run lint`, `node scripts/ai-check.cjs`, and `node scripts/ai-browser-check.cjs` without `--live`. The browser script blocks external model downloads with page rules and worker-response CSP. These checks require installed Chrome/local CDP access, not a loaded model.
2. Start `npm.cmd run dev`; open `http://localhost:5173/#ai-lab`. Ask “do you remember our last adventure?” and click **Read game-state facts (no AI)**. Check known empty versus unavailable data and planned destinations/photo status. This does not load a model or alter saved records.
3. Before intentional inference, review the approximately 570 MB download and 2–4 GiB additional WebGPU memory estimate above. Close heavy applications and inspect the lab's support diagnostics. The approved single evaluation has finished and its model was unloaded. Obtain authorization for any additional live evaluation; no second load was performed here.
4. For one interactive test, keep Qwen/WebGPU selected, click **Load model explicitly**, wait for Ready, choose a prompt/configuration, then **Generate real local response**. Check draft warnings, attempts, retry reasons and quality failures. Factual panels must not be counted as AI responses. Stop with **Cancel / unload** if the laptop struggles. Do not automatically switch to WASM after GPU failure.
5. To inspect this run without another download, open `docs/ai-9b1-evaluation.json` and `docs/ai-9b1-review.json`, or run `node scripts/ai-9b1-review.cjs` (offline only). A further authorized live run uses `node scripts/ai-browser-check.cjs --live --gpu --reliability`; preserve the current reports first because the runner writes the same filenames. It uses an isolated temporary Chrome profile, may redownload weights, and never clears user-site storage. Newly generated outputs need fresh semantic annotations; the old review script deliberately rejects a changed raw-report hash. Never run live evaluation as part of ordinary regression testing.
6. Cancel/unload after testing. The runner terminates Chrome and removes only its validated temporary profile; interactive completed Cache API files may remain. Android needs separate physical testing over HTTPS or localhost USB forwarding; desktop/emulation is not proof of Android compatibility.
