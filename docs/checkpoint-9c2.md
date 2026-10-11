# Checkpoint 9C.2 — download reliability and cozy Talk

11 October 2026. **Offline implementation and verification only. No genuine in-room Qwen load or new model-generated response was produced during this checkpoint. The reported restart near 300 MB is not yet proven resolved.** No larger model, new benchmark, dependency installation, deployment, or GPU-setting change was performed.

This document supersedes the Close/navigation/background unload policy in Checkpoint 9C. Model identity, reliability controls, saved-fact routing and gameplay rules remain unchanged.

## Investigation: confirmed defects and unknown cause

The existing AI Lab, Talk hook, inference worker, model manifest, installed Transformers.js download/cache implementation, React Strict Mode entry, Home mounting, dialogue routing and regression tests were inspected before editing.

**Confirmed in the previous code:**

- Talk's `close()` and Escape handler explicitly terminated its worker. Its hook effect also called `stop()` on cleanup, including changes to `enabled = open && mode === 'ai'`. Closing/reopening therefore destroyed initialization. Ordinary renders with unchanged effect dependencies did not independently restart it.
- Navigating away unmounted Home (`App` keys its main content by page), destroying the component-owned worker. A background visibility event also terminated it. Returning to Talk required a fresh explicit load.
- Lab and Talk had independent loading controllers. The shared lease prevented two owned workers by terminating the previous owner when another acquired it. It could interrupt a requested load instead of sharing it.
- Both progress views used truthiness-based byte merging. Zero byte reports could not be distinguished from omitted bytes. Progress was shown as separate technical panels; there was no clearly scoped aggregate, initialization phase, or lifecycle trace.
- Talk's history, consent/progress and notice each had independent overflow areas. These caused the nested scroll behavior the user reported.

**Unverified hypotheses:** the three approximately 300 MB incidents could involve one of these interruption paths, network failure, worker/browser memory pressure, cache failure/eviction, or progress from another file/cache read. No network trace, worker termination record, GPU allocation error, cache error or genuine reproduction from those incidents was available. A byte counter moving to zero on a different file is not evidence of a full model restart. The application had no automatic failed-download retry loop; the existing one retry applies to response validation, not downloading.

The known GPU weight artifact is approximately 570 MB, not an intentionally configured pair of 300 MB downloads. File-level diagnostics are needed to determine what actually occurred. The code defects above have offline regression evidence; attributing the user's specific failure to them would exceed that evidence.

## AI Lab and Talk comparison

| Configuration | Before 9C.2 | After 9C.2 |
|---|---|---|
| Model | Talk fixed Qwen; Lab defaults Qwen, retains its existing optional Smol feasibility selection | Unchanged; Talk refuses to use a different Lab model under a Qwen label |
| Qwen repository | `onnx-community/Qwen3-0.6B-ONNX` | Unchanged |
| Pinned revision | `1e0a4a196ecabdf9a879664110574563d3f372d3` | Unchanged |
| Weights / license | Manifest: 569,789,750 bytes GPU; 919,096,585 bytes CPU; upstream Apache-2.0 | Unchanged; no artifacts downloaded or revalidated here |
| Dtype / runtime device | Explicit WebGPU `q4f16` or WASM `q4` | Unchanged; no automatic backend fallback |
| Support probe | Talk requested high-performance adapter; Lab probe omitted a preference | Both probes request high-performance; this does not guarantee NVIDIA selection |
| Worker / tokenizer | Same `inference.worker.ts`, pinned `AutoTokenizer.from_pretrained`; model-specific chat template | Same implementation and worker factory, shared session |
| Runtime | Installed Transformers.js 4.3.1 / ONNX Runtime Web `1.31.0-dev.20260914-8d85527a0` | Unchanged |
| Cache | Worker `env.useBrowserCache` when Cache API exists, no local model search | Unchanged, best effort; warnings exposed |
| WASM settings | Single thread, proxy disabled because inference already runs in a worker | Unchanged |
| Initialization | Tokenizer → model/session → one real warm-up token | Unchanged, now with phase messages |
| Lifecycle | Separate component-owned controllers; lease takeover terminated prior owner | One page-owned controller used by both views; no takeover or duplicate model session |
| Response handling | Lab shows explicitly unchecked drafts; Talk withholds drafts and accepts only validated final output | Unchanged |

The stored artifact/size information and previous live Qwen results are historical evidence. The frozen `docs/ai-9b1-evaluation.json` still has SHA-256 `cd360b0bd68773cc07388b33aca52553cd016bc49ec28cbeb58e724b001ea7bf`. No new latency, peak memory, adapter measurement or quality improvement is claimed.

## Actual changes and lifecycle

`src/ai/brainSession.ts` owns the single worker, operation reservation, immutable subscriber snapshot, timeout, generation promise and bounded diagnostics. `useTalkBrain.ts` subscribes through `useSyncExternalStore`; subscribing, rerendering, Strict Mode effect replay and unsubscribing never create or terminate the worker. `AILab.tsx` uses the same session. The obsolete takeover-based `workerLease.ts` was removed. `models.ts` adds phase/diagnostic/error-category reply types; `inference.worker.ts` emits them and throttles progress; `chatPreference.ts` unloads only on an explicit offline choice. Choosing AI from offline retains a Qwen session already loaded in Lab. Existing AI/Lab/scene tests were updated for these intentional lifecycle and scroll changes, and `ai-9c2-check.cjs` adds controller/progress regression coverage.

The lifecycle is `idle → awaiting_confirmation → initializing` (support/runtime setup), then `downloading ↔ initializing → ready`. Failure becomes `failed`; explicit cancel/unload becomes `cancelled`. Retry opens confirmation again; a second explicit **Download & wake** starts a new attempt. Generation is a separate busy flag while the loaded model remains `ready`. Reservation happens synchronously before support checks or lazy imports, blocking duplicate requests from either UI. Cancel invalidates the epoch; workers returned after cancellation are terminated without receiving a model load. Messages from terminated workers are ignored.

- Choosing AI chat or opening Talk loads no inference runtime or weights. **Wake tiny brain** only opens consent. **Download & wake** authorizes initialization, downloading and the one-token warm-up.
- Closing Talk, Escape, Home unmount, navigation, switching to Lab and backgrounding retain an already requested initialization/session. Browser reload, document closure or browser/OS termination naturally ends it. The browser may throttle background work.
- **Cancel download**, **Cancel reply / unload**, **Let tiny brain sleep / unload**, or an explicit switch to **Pet reactions** terminates it. Settings and cross-tab changes to the separate chat preference also unload. No save/progression key is used for runtime state.
- Lab adopts a loading/ready Qwen session. Its model/backend selectors and Load button are disabled while that session is busy/ready. A different Lab model must be explicitly unloaded before Talk can wake Qwen; it cannot produce Qwen-labeled replies.
- Closing Talk invalidates pending UI work; an already sent generation may finish in the shared worker, but its late result is not inserted into a closed/remounted transcript. Transcripts remain in memory, bounded to 40 bubbles; two accepted exchanges feed AI history. Home remount resets the transcript, not the loaded model.
- Load deadline: 10 minutes; generation: 3 minutes; Talk grounding read: 10 seconds. Timeout unloads and shows a recoverable failure. No automatic download retry.

Keeping the page-owned session alive also keeps its memory allocated after leaving Talk. Use the explicit unload/offline control when finished. Ownership is per page, **not a memory lock across browser tabs**; use one AI tab. Browser memory reclamation may lag worker termination.

## Download progress, cache and errors

`downloadProgress.ts` tracks each actual file identifier independently. Lifecycle callbacks preserve earlier byte counts because they omit counts; genuine `progress` callbacks reporting zero remain zero. A new file never resets another file's counters. Known total sizes come from the runtime callback, not invented percentages.

The card displays the current file and its loaded/total MB, or “total unknown.” Its aggregate is explicitly **of reported files**: it sums each known total once and clamps each contribution to that total. A newly reported unknown-total file makes the bar indeterminate. This is not a prediction of unannounced files or exact network traffic. Cached reads can emit the same byte callbacks as network reads, so file progress does not prove those bytes were downloaded again. After weight-file completion, worker phase messages expose session creation and warm-up instead of implying that 100% bytes means a usable model.

Worker progress messages are limited to approximately one per file per 150 ms, with completion and file/state transitions retained. The UI does not fake loading progress.

The installed library reads completed browser responses into cache and treats cache writes as best effort. Its cache-open/write warnings are captured narrowly in the worker and relayed as technical diagnostics; cache write failure can allow the current initialization to succeed while preventing a future cached reload. Network, storage quota, cache, allocation/device loss, unsupported browser, runtime, worker crash/message and timeout errors have explicit diagnostic categories. A fatal error terminates the worker and leaves a friendly Retry/offline choice. Successful cached files are never automatically deleted by these paths. Interrupted partial transfers are not guaranteed resumable; a later explicit retry may need that entire unfinished file again.

**About AI → Technical details** contains model/revision, dtype, backend, state/busy flag, current file, per-file counters, aggregate scope, initialization timing, error category/message and up to 120 lifecycle/file/cache events. No prompts, generated replies, GPS coordinates or photos are deliberately recorded in this trace. It is an in-memory diagnostic view, not telemetry or a persistent chat log. Cache-vs-network provenance and native/GPU peak memory cannot be measured reliably from these callbacks.

## Cozy Talk and preserved response paths

Only `ConversationPanel.tsx` and Talk-specific rules in `src/styles/scenes.css` were redesigned. Existing Home room art, SVG pets, bed, animation implementation, typography and theme tokens are reused. The panel uses cream paper, peach player bubbles, sage controls and brown accents in light mode, with existing night tokens. Pet replies have small tails; player messages have softer distinct fill. Labels still identify **Game-state answer · not AI**, **AI chat · Qwen3-0.6B**, and **Pet reactions — offline**. The separate room greeting remains labeled offline, including with AI awake.

The compact header has the pet name, **Pet reactions / AI chat** selector and Close. A small sleeping/failure card replaces always-visible technical disclosure. Consent still clearly shows weight/tokenizer/runtime size, first-download internet, estimated memory and device limitations before downloading. Loading has a small genuine progress card; failure offers explicit Retry, offline reactions and technical details. About/diagnostics are collapsed normally.

There is **one primary `.conversation-scroll`** containing cards, bubbles, notices and disclosures. None of its child panels or transcript adds another scrollbar. Header and composer stay outside that scroll area; the input is 16 px with 44 px targets and safe-area spacing. Reduced-motion disables the new bubble entrances and three-dot thinking animation. The shorter keyboard panel and wider compact caption keep the pet and its face clear. Caption labeling uses themed paper/ink for contrast.

Deterministic saved-fact routing, readonly grounding, personality prompt, accepted-history bounds, withholding unchecked streamed drafts, shared validation and at most one response retry are preserved. AI cannot call progression functions or award affection/rewards/change adventures or challenges. No scripted substitute is inserted as an accepted AI reply. No saved-data schema, gameplay, challenge, scrapbook, wardrobe, artwork or dialogue library was changed.

## Automated verification

Final `npm.cmd run build`: **PASS**. Final `npm.cmd run lint`: **PASS**. Initial app output is approximately 433 kB / 137 kB gzip; inference runtime remains in the lazy worker. Opening the normal game/Lab/Talk/AI mode does not request it or model weights, as checked by browser tests.

UTF-8/NUL/replacement-character/conflict-marker checks also passed for the audited AI, Talk and report files. Historical evaluation/review and metadata-research scripts are not regression suites and were not rerun or used to overwrite their evidence.

All **13 offline code suites passed**:

`checkpoint-check`, `solar-check`, `theme-check`, `dialogue-check`, `context-dialogue-check`, `journey-check`, `pets-check`, `nearby-check`, `challenge-check`, `ai-check`, `ai-9b-check`, `ai-9c-check`, and new `ai-9c2-check` (each `node scripts/<name>.cjs`).

All **eight browser regression suites passed**; there are no outstanding automated failures. Browser suites:

| Suite | Result |
|---|---|
| `onboarding-browser-check.cjs` | PASS |
| `scenes-browser-check.cjs` | PASS: 13 cat/dog/theme/desktop/phone cases |
| `pets-browser-check.cjs` | PASS |
| `journey-browser-check.cjs` | PASS |
| `challenge-browser-check.cjs` | PASS |
| `context-dialogue-browser-check.cjs` | PASS: 120 contexts / 480 alternative layouts |
| `ai-browser-check.cjs` without live flags | PASS |
| `ai-9c-browser-check.cjs`, extended for 9C.2 | PASS, including final Lab-first adoption rerun |

The focused tests exercise duplicate load prevention before an awaited support probe, Strict Mode subscription churn, real Home unmount during fixture loading, close/reopen retention, shared Lab adoption without a second worker (including a Lab-first load with the game preference initially offline), late messages, explicit cancel/retry, unknown totals/per-file counters, initialization phases, worker errors and deadlines, separate offline preference, unchanged saves, withheld/rejected drafts, bounded history and a real tiny Cache API sentinel surviving cancel/error/retry/offline. The cache sentinel is a synthetic completed file, **not proof that the real Qwen weights were cached**.

Requested 360×800, 390×844 and 430×932 offline/AI fixture interactions were verified with viewport resize to 350 px for a keyboard simulation: pet clear of panel, input inside viewport, no horizontal or accidental page overflow, exactly one scroll container, 16 px input and 44 px Send. Broader scene checks include 320×568 and desktop. Screenshots are in `artifacts/checkpoint-9c2` and `artifacts/ui-fixes`. All generated AI-labeled text in these screenshots is synthetic test transport, not model evidence.

A first sandbox Chrome run timed out before `Page.enable`; isolated offline runs succeeded with reviewed escalation. A theme regression rejected a hard-coded shadow, which was replaced with the existing token. The scene regression caught keyboard-caption overlap, corrected by reducing the compact panel and caption wrapping. Old assertions expecting nested history scrolling/background unload were updated to the requested one-scroll/persistent-session behavior; substantive save, grounding, geometry and failure assertions remain.

## Remaining limitations

- The actual reported approximately 300 MB failure was not reproduced or verified fixed. A genuine in-room load plus at least one accepted model-generated response remains the outstanding smoke check.
- No model/runtime downloads were permitted by AI browser fixtures. The Lab negative test exercises a real worker with external requests blocked, not successful inference. No new benchmark or larger model was run; historical quality failure remains applicable.
- Physical Android keyboard, WebGPU/WASM, thermal/memory behavior and compatibility remain untested. Desktop touch/viewport emulation is not device evidence.
- Peak RAM/VRAM and cache/network provenance are unmeasured. WebGPU capability does not establish free memory or NVIDIA adapter selection. No system GPU settings were changed.
- Browser cache is best effort; quota/private-mode/eviction/network interruptions can require later downloads. No resumable-download protocol, service worker or cache-deletion recovery was added.
- The previous conservative fact classifier and heuristic validator still have false positives/negatives. Qwen3-0.6B has not met production conversational-quality acceptance; this checkpoint does not improve that measured score.

## Exact manual verification checklist

1. Run `npm.cmd run dev`, open its printed **localhost** URL in the intended browser. Keep one AI tab. Check the existing pet, affection, challenge and scrapbook before testing. Do not clear game storage or the model cache. An isolated test browser profile avoids submission-save risk but may require a full cold download.
2. Open Talk in **Pet reactions**. Send “hello”; confirm an offline label. Ask “how many saved adventures?”, “what is my affection?” and “what are the challenge rules?”; confirm deterministic labels and correct saved facts/unavailable values. Select **AI chat**; confirm it remains asleep and no download starts.
3. Click **Wake tiny brain**. Read consent, but do not confirm if memory is insufficient. Expected WebGPU weights are about **570 MB**, plus about **37 MB** tokenizer/runtime (approximately **607 MB** cold allowance), and **2–4 GiB additional working memory across RAM/GPU**, not measured. Explicit WASM uses about **919 + 37 MB** (approximately **956 MB**) and **3–6 GiB RAM**, potentially very slow. Check Task Manager available RAM and actual GPU use; close discretionary heavy apps and retain roughly 2 GiB system headroom beyond the planning range. These are estimates, not allocation guarantees. Do not test a larger model or change GPU settings for this checkpoint.
4. **Only when you choose to authorize this real load**, leave WebGPU selected if supported and click **Download & wake once**. Record the model/backend/revision in About AI → Technical details. Observe actual file identifiers/counters, initialization and warm-up. Closing/reopening Talk or navigating away/returning should continue the same worker/session, not request a fresh one. Do not refresh the browser page mid-load. A changing file name or cached read alone is not a restart.
5. If it fails, copy the technical state/error/file counters and lifecycle events. Record elapsed time and Task Manager memory at failure. Do not repeatedly click Retry. Choose offline, or deliberately Retry → read consent → Download & wake for one new attempt. Never clear game saves to repair downloading. If the browser crashes before it can report, preserve available browser diagnostics; the code cannot prove that crash's cause.
6. On **ready**, send “hello little friend.” Confirm a genuine accepted **AI chat · Qwen3-0.6B** reply, then one short follow-up. Record success only if a real reply was produced; a rejected draft, warm-up token, deterministic answer or offline reaction is not that evidence. This is a smoke check, not a new benchmark.
7. Ask the saved-fact questions again while ready; ensure deterministic labeling and unchanged game values. Cancel an ordinary reply, explicitly unload through About AI, and confirm late text is withheld. Retry a cached wake once if you deliberately authorize it; completed cached files should be reused when the browser retained them, but offline reload is not guaranteed. Explicitly switch to Pet reactions when finished to release the page-owned model.
8. Test real phone keyboard open/close, long conversation scrolling, Send/Close/Cancel, safe areas, navigation and pet visibility on an **actual Android device** using HTTPS or USB localhost forwarding (`adb reverse tcp:5173 tcp:5173`, adjusted to the printed port). Prefer offline layout tests first. Do not infer Android inference compatibility from desktop results or load on an unsuitable phone just to see whether it crashes.

**Stop: Checkpoint 9C.2 only. Genuine in-room load verification remains manual; no stronger-model testing or deployment is authorized by this work.**
