# Checkpoint 9C — optional real AI in in-room Talk

11 October 2026. Implemented the optional Qwen conversation path inside the existing room HUD. **Offline pet reactions remain the default.** Game-state answers, local Qwen dialogue and scripted reactions have separate routing and visible source labels. No gameplay/progression rules, saved-pet schema, model selection, dependencies, artwork or animation definitions changed.

**Evidence boundary:** Qwen3-0.6B produced genuine responses in the previously authorized 9B.1 run. This checkpoint connects that same inference worker to Talk. The new integration was tested offline with synthetic worker transport fixtures and blocked model-host requests; **no model was loaded and no new real in-room model response was produced during 9C testing**. No new benchmark, larger-model download or physical Android test occurred. Do not treat fixture replies as inference or quality evidence. The manual live smoke check below remains necessary before demonstrating AI chat.

## Files

Created:

- `src/ai/chatPreference.ts`: independent chat-mode key, session fallback and cross-tab subscriptions.
- `src/ai/workerLease.ts`: one owned inference worker per page, shared by Talk/Lab.
- `src/ai/useTalkBrain.ts`: worker lifecycle, support probe, deadlines, cancellation and progress.
- `src/ai/talkWorker.ts`: dynamically imported worker factory, reached only after explicit wake.
- `src/ai/talkPrompt.ts`: existing compact personality/grounding prompt plus at most two accepted AI turns.
- `src/ai/talkContext.ts`: existing readonly grounding plus actual Home mood and optional readonly reward/memory ledger.
- `src/ai/talkFacts.ts`: conservative fact routing and readable deterministic answers.
- `src/components/PetChatSettings.tsx`: locally persisted conversation preference.
- `scripts/ai-9c-check.cjs`, `scripts/ai-9c-browser-check.cjs`: offline contracts and isolated browser fixtures.
- This report; `artifacts/checkpoint-9c/talk-synthetic-{360x800,390x844,430x932}.png` are explicitly synthetic transport screenshots.

Modified:

- `src/components/ConversationPanel.tsx`: connected the existing transcript/composer to the three response paths.
- `src/screens/Home.tsx`: supplies current companion, actual mood/time and readonly challenge state; keys chat by pet ID.
- `src/screens/Settings.tsx`: mounts the chat-mode setting separately from profile saving.
- `src/components/CozyRoom.tsx`: reserves measured Talk HUD space when conversing; normal room positioning remains unchanged.
- `src/components/PetSpeechBubble.tsx`, `src/styles/scenes.css`: offline greeting caption and compact, theme-aware chat/progress/consent layout.
- `src/ai/models.ts`: optional Talk-purpose protocol flag; **Qwen repo/revision/size unchanged**.
- `src/ai/inference.worker.ts`: Talk fact guard, oldest-turn removal when the input budget is exceeded, and duplicate-load protection.
- `src/ai/AILab.tsx`: shared worker ownership and updated description of optional in-room chat.

No changes to dialogue text/library, `lib/storage.ts`, pet migration, rewards, adventure/photo mutations, challenge rules or theme preference. Existing browser suites also refreshed their usual screenshot folders. Preserved 9B.1 raw evaluation SHA-256: `cd360b0bd68773cc07388b33aca52553cd016bc49ec28cbeb58e724b001ea7bf`.

## Architecture and source separation

On Send, a synchronous lock prevents duplicate submissions, then the router selects:

| Path | Behavior | Displayed source |
|---|---|---|
| A. Game-state questions | Readonly facts; available before wake and in either mode. Never sent to the model or interpreted as game commands. | **Game-state answer · not AI** |
| B. Ordinary conversation, AI enabled and awake | Native Qwen worker generation using the existing 9B.1 bounded retry and validator. Only accepted output becomes a chat reply. | **AI chat · Qwen3-0.6B** |
| C. Ordinary conversation, offline selected | Existing `DialogueSession.next(..., 'talk', ...)`, using species/personality and anti-repeat selection. These are reactions rather than generated answers to arbitrary text. | **Pet reactions — offline** |

Room greetings remain scripted and carry an offline caption during Talk. User messages and failure notices have their own source types. Model text is rendered as escaped React text, never HTML, tool calls, JSON actions or game events. Neither the model nor its controller receives save/reward/challenge mutation callbacks. Deterministic read failures do not become model guesses.

Settings and Talk share `outside-or-else:pet-chat-mode:v1`. No breaking migration; blocked localStorage keeps the preference only for the current session. An existing saved AI preference selects the mode after reload **without waking/downloading anything**. Switching offline explicitly stops the worker. Mode changes in another tab update the UI and release this page's worker.

Transcript retains at most **40 messages in memory only** and survives closing/reopening Talk while Home remains mounted. Navigation/reload or a new pet ID clears it. Prompt history contains only the last **two accepted AI exchanges**, never offline reactions, fact reports, rejected drafts or errors. Fact questions/mode changes/cancellation clear the prompt history. User input is capped at 500 characters; history is additionally trimmed. Native chat template and the 1,024-token limit remain enforced by the worker; oldest whole turns are removed first, never the current fact panel or latest message. Oversized current prompts fail visibly rather than silently discard facts.

## Lazy loading, memory and failure handling

Existing model: **Qwen3-0.6B**, Apache-2.0, `onnx-community/Qwen3-0.6B-ONNX`, revision `1e0a4a196ecabdf9a879664110574563d3f372d3`. Runtime stays **Transformers.js 4.3.1 / ONNX Runtime Web / WebGPU q4f16 or explicit WASM q4**. No other model can be selected from production Talk.

Startup, opening Talk, selecting AI and submitting fact questions do not create an inference worker or fetch its runtime/weights. Opening Talk may request an adapter for a **model-free** support probe. A dynamically imported worker factory is invoked only after **wake tiny brain**, browser checks and a second cancellation check.

Before wake, the panel shows “tiny brain currently sleeping. wake it up? 🧠”, internet/cache requirements, detected WebGPU support, model-file hosts, warm-up and the following **planning estimates, not measured peaks or guarantees**:

| Explicit backend | Weights | Tokenizer/runtime allowance | Additional working memory |
|---|---:|---:|---|
| WebGPU q4f16 | approximately **570 MB** | approximately **37 MB** | **2–4 GiB across RAM/GPU** |
| WASM CPU q4, single thread | approximately **919 MB** | approximately **37 MB** | **3–6 GiB RAM**, potentially much slower |

No automatic GPU-to-CPU fallback. CPU selection requires another explicit choice/wake. GPU availability is not free-memory measurement or proof of NVIDIA selection. Qwen's previous 3.78-second median was measured on the historical evaluation, not this Talk integration. First load previously took several minutes; the existing 10-minute load deadline remains. Generation deadline is 3 minutes, context-read deadline 10 seconds.

Progress percentages/bytes come only from real file-progress messages. Playful loading copy does not simulate a progress bar or fabricated completion. Cache API stays in the worker; no weights/history stored in localStorage. Cache eviction and partial downloads can require later internet access. This is not a new offline PWA/service-worker feature.

The worker serializes operations; the page-level lease and duplicate-load check prevent overlapping owned model instances. Do not open AI simultaneously in multiple tabs—ownership is **per page**, not a browser-wide memory lock. Cancellation terminates the worker, aborting inference/download activity and invalidating late messages. Completed cached files may remain; OS/browser memory reclamation can lag. Close Talk, navigate away, switch offline or background the tab to unload. Reopening needs explicit wake, usually with cache reuse.

Raw streamed drafts are withheld from the conversation log. The shared 9B.1 validator checks empty/long output, repetition, obvious wrong-species sounds, unsupported-history phrases, copied demonstrations, assistant phrasing and pressure on vulnerable/refusing users. There is **at most one retry**, using the existing shorter retry prompt. Two failures produce a friendly notice, not a fabricated reply. Worker load/allocation/crash/timeout errors offer an **explicit** offline switch; no silent scripted replacement. A final UI check also withholds a purported accepted reply if it fails the same validator.

## Grounding and save isolation

The current Home profile supplies name, species, breed, personality and affection; actual Home mood and current dialogue phase augment the existing KNOWN/UNKNOWN/UNAVAILABLE context. Readonly journey/photo-key/cached-place access is reused. No photo blobs, captions, exact GPS coordinates, internal IDs or current-location requests reach the prompt. Relevant saved adventures remain bounded to one/two records with dates, planned destination names and photo status. A destination is a plan, not verified presence; saved images remain unverified.

Talk routes adventure/history, memories/photos, cached nearby places, identity/mood, affection/rewards/unlocks and challenge questions into deterministic reports. Rewards use the completed outing ledger, including earned rewards whose scrapbook entries were deleted; manual memories stay separate and earn no points. Saved memory counts exclude deleted entries and other pets. Challenges report the existing rules and current matching-pet context or “unavailable”; chatting cannot enable/pause/reset them. Wardrobe-specific unlock details direct the user to Wardrobe rather than inventing awards. Unknown fields/storage failures remain explicit.

The fact classifier is conservative keyword/phrase routing, **not complete language understanding**. Complex paraphrases can miss it or be routed too broadly; shared history guards reduce but do not eliminate remaining hallucinations. The existing database opener may initialize its schema when absent; conversation reads do not call progression reconciliation or write outing/photo/reward records. Independent chat preference storage is the only new persisted data.

## Mobile and regression results

Build and lint: **PASS**. All **11 existing offline logic regression suites**, plus new 9C contracts: **PASS**. Existing suites: checkpoint, solar, theme, dialogue, context-dialogue, journey, pets, nearby, challenge, AI 9B.1 contracts, frozen AI 9B contracts.

All **7 existing model-free browser suites PASS**: onboarding, scenes, pets, journey, challenge, contextual dialogue and AI Lab. New Talk browser suite also PASS. It uses an isolated temporary profile, synthetic workers, server CSP on page/worker responses and blocked HTTPS requests; no fixture generation is counted as AI inference.

New browser coverage includes default offline, deterministic answers before/after wake, no download on AI selection or a restored preference, real-progress-shaped transport events, Qwen-only load messages, 2/4/6-message history bounds, actual cat/dog/breed/personality/mood context, withheld drafts/rejected replies, duplicate submission guard, cancellation, allocation failure, explicit offline switching, settings/cross-tab persistence, background unload, unsupported WebGPU, explicit CPU selection and timeout cleanup. Existing profile bytes remain unchanged. Existing journey/pet/challenge suites verify storage/reward/photo/wardrobe/chapter preservation in isolated fixtures.

At **360×800, 390×844 and 430×932**, new browser checks cover offline and synthetic-ready AI transcripts, input/send reachability, ≥44-pixel send targets, no horizontal overflow and pet clearance. Shrinking to 350 pixels simulates keyboard layout. Existing scenes cover 320×568 through desktop, themes, focus restoration, Escape, sleep/feeding and scroll/navigation. Transcript/consent/progress areas scroll independently. One initial caption layout failure was corrected and the scene regression rerun successfully. An initial lint/effect issue and CJS regression-import issue were also corrected. **No outstanding automated test failure.**

These are desktop Chrome emulation/resize results. **Physical Android keyboard, touch, GPU/WASM, camera and thermal/memory behavior are untested.** Screenshots show synthetic transport, not genuine generated responses. The pet's body tap retains its existing scritch behavior; the existing Talk button/speech orb opens the conversation.

## Manual checklist before submission

1. Run `npm.cmd run dev` in this folder, open the printed localhost URL in the intended browser, and verify the existing pet, breed/personality, affection, wardrobe, theme, memories/photos and challenge status. Use a separate browser profile for AI smoke testing if protecting the submission save is important. Do not clear game storage to refresh the model cache.
2. Open the in-room **Talk** button/speech orb. Confirm **Pet reactions — offline**, type “hello”, and see a labeled scripted reply. Ask “how many saved adventures?”, “how many memories?”, “what is my affection?”, “what rewards have I earned?” and “what are the challenge rules?”. Confirm **Game-state answer · not AI**, correct recorded values or unavailable status, and no worker/model download.
3. In Talk or Settings → **PET CHAT MODE**, choose Real AI. Confirm it stays asleep. Reload and verify preference persistence without download. Check the pre-load size/memory/host warning. On this 16 GB laptop, close discretionary memory-heavy applications and inspect Task Manager available RAM/GPU memory before loading; leave approximately 2 GiB system headroom beyond the estimate. Use only one AI tab. CPU's upper 6 GiB estimate warrants approximately 8 GiB available RAM including that reserve. Do not infer free VRAM from the displayed adapter limit.
4. **Only if you explicitly decide to load Qwen**, choose WebGPU when suitable and click **wake tiny brain**. Expect approximately **607 MB** cold weight/tokenizer/runtime payload; CPU about **956 MB**. Observe actual file percentages and wait for completion/warm-up. Cached reload may fetch less. If unsupported, keep offline or explicitly choose the slower, larger-memory CPU path. Never automatically load the 9B.2 recommendation.
5. Type one ordinary message such as “hello little friend”. Confirm an actual **AI chat · Qwen3-0.6B** reply appears only after checks. This is the outstanding genuine **in-room smoke check**, not a requested new benchmark. Follow up with one short related message to exercise recent history. If either reply fails, retain/report the failure rather than describe inference or quality as successful. Do not substitute a scripted response under the AI label.
6. With AI awake, ask the factual questions from step 2 again. Confirm they bypass generation and do not change affection, rewards, records or challenge status. Ask for 100 points and confirm the response reports rules rather than changing state. Treat every ordinary AI reply as untrusted; the historical personality/grounded-coherence/coherence scores were **72.7% / 54.5% / 68.2%**, failing production reliability acceptance.
7. Start an ordinary reply, cancel it or close Talk, and verify the model unloads and late text does not appear. Reopen; explicitly wake again to check cache reuse. Background the tab and verify the unload notice. Select offline after a failure and confirm new replies have the offline label. Verify duplicate Send is disabled during work. Check the original game-state values again.
8. On an **actual Android device**, use HTTPS or USB `adb reverse tcp:5173 tcp:5173` and open `http://localhost:5173` (adjust ports to the printed dev URL). LAN plain HTTP may not expose WebGPU. Test keyboard open/close, portrait/landscape, scrolling longer facts/history, touch Send/Close/Cancel, visible pet, no overflow, low-memory/background behavior and explicit fallback. Record the real browser/device/backend and outcome before claiming Android compatibility. Avoid CPU loading on a small-memory phone merely to discover whether it crashes.

**Known limitation:** optional Qwen integration does not make the model fully coherent, grounded or personality-reliable. Heuristics miss some bad replies and may reject harmless ones, especially repeated phrases from history; saved-fact routing is incomplete. No measured 9C peak RAM/VRAM, inference latency, new quality score or physical-device compatibility claim is made. Chat history is intentionally not persisted. Some missing/complex factual details direct users to the existing game screens.

**Stopped after Checkpoint 9C. No new AI benchmark or larger-model test was started.**
