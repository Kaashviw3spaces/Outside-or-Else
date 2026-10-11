# Checkpoint 9A: isolated local open-weight inference

## Crash recovery audit — 11 October 2026

**Current conclusion:** the isolated AI Lab, worker, actual generation call, streaming, cancellation, diagnostics and prompt limits already existed. The build's worker/WASM assets are inference software, not downloaded model weights. No replacement components or dependency installation were needed. This audit downloaded no weights and ran no model. Real inference has **not been independently verified in this recovery session**. The existing `ai-live-webgpu.json` and `ai-live-wasm.json` contain five nonempty responses each, token counts and timings attributed to earlier live runs; preserve them as historical evidence, not newly reproduced results.

| Requested item | Recovery audit result |
|---|---|
| Selected model | Qwen3-0.6B, default/preferred; SmolLM2-135M-Instruct is the explicit smaller comparison |
| Model repository | `onnx-community/Qwen3-0.6B-ONNX`; smaller option: `HuggingFaceTB/SmolLM2-135M-Instruct` |
| Model license | Upstream Apache-2.0 for both; Qwen conversion card has no separate declaration |
| Model size | Qwen: 569.8 MB WebGPU / 919.1 MB WASM; Smol: 117.7 MB WebGPU / 182.1 MB WASM, plus tokenizer/runtime |
| Inference runtime | Installed/pinned Transformers.js 4.3.1 with ONNX Runtime Web `1.31.0-dev.20260914-8d85527a0`; module worker, explicit WebGPU q4f16 or single-thread WASM q4 |
| AI Lab status | Implemented at `/#ai-lab`, lazy, read-only with respect to game saves; fresh browser verification blocked as described below |
| Real inference status | Implemented, not scaffolded: tokenizer/chat template → `AutoModelForCausalLM.generate()` → `TextStreamer`; no scripted fallback. Earlier response reports exist; no fresh generation performed |
| Build status | PASS, final changed source: `npm.cmd run build` |
| Lint status | PASS, final changed source: `npm.cmd run lint` |
| Regression test results | All nine existing logic suites and AI prompt suite passed. AI and all six gameplay browser suites timed out at `Page.enable` before application assertions; these are blocked/failed runs, not passes |
| Remaining issues | Fresh browser regression and live generation verification; Qwen immutable revision revalidation; unmeasured peak RAM/GPU memory; physical Android testing; previously recorded grounding/personality failures |

### Scope, loading and compatibility

`ExperimentalEntry` lazy-imports the lab only at the exact hash. `AILab.load()` is invoked by **Load model explicitly**, checks the selected backend, creates the worker and posts `load`. Only that request reaches the two worker `from_pretrained()` calls. Merely building, opening the game or opening the lab does not call them. Loading includes a one-token real warm-up: the load button authorizes downloading and initialization/inference, even before the Generate button. A cached load still allocates model memory. The worker uses pinned revisions, not the mutable default branch.

The published [Qwen ONNX card](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX) identifies a Transformers.js export, and its [ONNX file listing](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX/tree/main/onnx) exposes q4 and q4f16 artifacts at the documented approximate sizes. [Smol's pinned file listing](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/tree/12fd25f77366fa6b3b4b768ec3050bf629380bac/onnx) exposes both formats and its config identifies Llama. The installed runtime registers `Qwen3ForCausalLM` and `LlamaForCausalLM` and maps q4/q4f16 to the matching filenames. This verifies format/architecture compatibility by source inspection; it does not verify successful execution on this laptop. Qwen's exact pinned pages were inaccessible to the web tool and the metadata-only Node fetch failed in this environment, so its immutable revision and exact byte counts were not independently revalidated. Existing pins and historical exact sizes were preserved rather than silently replaced.

All six AI source files are present and nonempty; TypeScript and bundling parse them successfully. No conflict markers, NULs, replacement characters, partial-file remnants or actual UTF-8 corruption were found in inspected checkpoint files. PowerShell's default display misrenders some UTF-8 punctuation; direct UTF-8 inspection showed intact content. Both measurement JSON files parse and contain complete response arrays. There is no Git repository here, so no historical diff can prove pre-crash file identity.

Only missing recovery work was completed: pre-load memory estimates in the existing lab and stronger non-live browser safeguards/assertions, plus this report. Changes: `src/ai/models.ts`, `src/ai/AILab.tsx`, `scripts/ai-browser-check.cjs`, this document, and regenerated `dist` output. Gameplay, artwork, animations, dialogue, save schema and user data were not edited. Original live measurement JSON was left intact.

### Download and memory budget before any live test

| Model/backend | Approximate download components | Additional working-memory planning estimate |
|---|---|---|
| Qwen / WebGPU | 569.8 MB weights + 9.1 MB tokenizer + config/runtime | 2–4 GiB across RAM/GPU allocations |
| Qwen / WASM | 919.1 MB weights + 9.1 MB tokenizer + config/runtime | 3–6 GiB RAM |
| Smol / WebGPU | 117.7 MB weights + 2.1 MB tokenizer + config/runtime | 0.75–1.5 GiB across RAM/GPU allocations |
| Smol / WASM | 182.1 MB weights + 2.1 MB tokenizer + config/runtime | 1–2 GiB RAM |

Memory ranges are conservative planning estimates for this bounded lab, **not measurements, hard upper limits or device guarantees**. They allow headroom for multiple weight buffers, initialization, activations and cache; peak use can exceed them. GPU allocations may also consume shared system RAM. Add the browser/OS/other apps' usage. The built WASM binary is 26.9 MB uncompressed (about 6.8 MB gzip); actual runtime transfer depends on backend and server compression. No memory-intensive model was executed during recovery.

### Exact safe test steps

1. With existing dependencies, run `npm.cmd run build`, `npm.cmd run lint`, and `node scripts/ai-check.cjs`. These do not load weights.
2. Run `node scripts/ai-browser-check.cjs` **without `--live`**. Its non-live branch blocks external downloads through `connect-src 'self'` on page and worker responses, plus CDP URL blocking, uses clearly synthetic transport fixtures, and tests the real worker's blocked-download error. It now also asserts no runtime/weights on opening the lab and a visible memory estimate. In this recovery environment it times out at `Page.enable`, before these assertions; resolve the Chrome/CDP connection before calling this test passed.
3. Run `npm.cmd run dev -- --host 127.0.0.1`; open the localhost URL Vite prints, followed by `/#ai-lab`, in a separate test browser profile. Do not clear your game profile's storage. Opening the page alone should leave status idle and cause no Hugging Face, worker or WASM requests in DevTools Network.
4. Review the table above before loading. For the smallest CPU test select **SmolLM2-135M** and **WASM CPU**. Close unnecessary apps and allow 1–2 GiB additional RAM, with the caveat that peak memory is unmeasured. **Do not click Load unless you intentionally accept the download and memory cost.** Loading starts a real one-token warm-up.
5. Click **Load model explicitly** once, keep the tab foregrounded, and monitor Task Manager/browser responsiveness. Use **Cancel / unload** if the device struggles. Wait for Ready, enter `hello`, then click **Generate real local response**. Only a nonempty actual model response with generation metrics verifies live generation; record the model/backend and raw output. Fixtures/build assets do not count.
6. Cancel/unload after the test. Cached files may remain; never clear game storage to remove them. Qwen/WebGPU is an optional later test requiring `shader-f16`, its larger download and the stated memory budget. Automated `--live` commands below are opt-in costly benchmarks, not recovery regression commands.

Recovery logic suites passed: `theme`, `solar`, `nearby`, `pets`, `journey`, `challenge`, `checkpoint`, `dialogue`, `context-dialogue`, plus `ai`. Browser attempts: `ai`, `onboarding`, `scenes`, `pets`, `journey`, `challenge`, `context-dialogue`; all failed at the Chrome/CDP setup call `Page.enable`, before application behavior could be assessed. No browser pass or new inference success is claimed.

## Original checkpoint record (historical, not rerun during recovery)

Open `/#ai-lab` directly, then explicitly choose a model/backend and press **Load model explicitly**. This route does not mount App/Home or connect to normal Talk. Reload the normal root URL to return to gameplay. No model loads at app startup.

## Verified candidates

| Candidate | Repository / pinned revision | WebGPU q4f16 weights | WASM q4 weights |
|---|---|---:|---:|
| Qwen3-0.6B, preferred | `onnx-community/Qwen3-0.6B-ONNX` / `1e0a4a196ecabdf9a879664110574563d3f372d3` | 569,789,750 bytes (569.8 MB) | 919,096,585 bytes (919.1 MB) |
| SmolLM2-135M-Instruct, smaller comparison | `HuggingFaceTB/SmolLM2-135M-Instruct` / `12fd25f77366fa6b3b4b768ec3050bf629380bac` | 117,691,126 bytes (117.7 MB) | 182,068,553 bytes (182.1 MB) |

Sizes are decimal MB and cover the ONNX weight artifact only. Tokenizers/configuration/runtime add downloads; the built ONNX WASM asset is approximately 26.9 MB uncompressed. q4 uses 4-bit weight quantization with float32 computations; q4f16 combines 4-bit weights with float16 computations. Quantization does not make peak memory equal to file size: sessions, staging copies, activations and KV cache need additional memory.

Artifacts and immutable revisions were checked using the public Hugging Face model/tree API. Primary sources: [Qwen ONNX card and browser example](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX), [Qwen original model/license](https://huggingface.co/Qwen/Qwen3-0.6B), [SmolLM2 original model, ONNX files, Transformers.js example and license](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct). Both base models declare Apache-2.0. The ONNX community Qwen conversion has no separate license declaration; retain upstream license/attribution when redistributing. A similarly named `onnx-community/SmolLM2-135M-Instruct` did not resolve publicly; the implemented alternative uses the original author's actual published ONNX files, not that assumed repository.

## Architecture and privacy

- Pinned Transformers.js **4.3.1**, ONNX Runtime browser backend, module Web Worker. Runtime and WASM are worker assets, not dependencies executed by the main game. Normal main JS remains approximately 403 KB uncompressed / 126 KB gzip; lab JS/CSS are separate dynamic chunks.
- GPU is an explicit choice requiring a secure context, an adapter and `shader-f16`. CPU/WASM is an explicit alternative using one thread without requiring COOP/COEP. No silent fallback between backends and no scripted substitute for generation.
- Worker calls `AutoTokenizer` and `AutoModelForCausalLM` directly. Qwen thinking is disabled through its chat template. Context is capped at 1,024 input tokens; user input at 500 characters; output at 80 new tokens. Sampling: temperature 0.7, top-p 0.8, top-k 20, repetition penalty 1.1. An output-cap notice identifies potentially incomplete replies.
- Reuses `preparePetPrompt` and shared species/personality instructions; sanitized facts include name, species, breed, personality, affection, actual dialogue clock/solar phase and at most two completed active-pet adventure date summaries. Manual uploads, other pets and unfinished records are excluded. No exact GPS, destination names, captions, record IDs, photos or achievements enter the prompt. Photo references remain explicitly unverified; no image inspection takes place.
- Live Home mood is transient, so lab context explicitly says **idle experiment; live Home mood unavailable**. With no saved pet, it clearly identifies an unsaved example companion. A failed memory read means unavailable data, never an invented memory or a storage success claim.
- Model-file downloads contact Hugging Face and its download hosts; runtime loaders may contact jsDelivr. Prompts and game facts never go to hosted inference. No account/API key/backend/analytics. Replies are session-only and cannot trigger rewards, memory saves or progression.
- Model files use Transformers.js `transformers-cache` through Cache API when available. No weights in localStorage or the game's IndexedDB. Cache availability, quota and eviction are browser-dependent; HTTP origins may lack Cache API. Unload retains cached model files and never clears game storage.
- UI supports per-file download progress, initialization/warm-up, streaming actual text, timing, first-token latency, token count, throughput including prefill, backend/browser/GPU/storage diagnostics, errors and termination-based cancel/unload. Loading watchdog: 10 minutes; generation/context-read watchdog: 3 minutes. Backgrounding unloads the worker; late replies from old workers are ignored. Native/GPU total memory cannot be measured reliably through standard browser APIs.

Grounding instructions reduce risk but do **not** guarantee truthfulness. Raw experimental outputs are visibly untrusted. Do not integrate them as factual game dialogue or permission/health/challenge notices without further validation. Generated responses are never called scripted; scripted normal gameplay is never called AI.

## Reproduce tests

```powershell
npm.cmd run build
npm.cmd run lint
node scripts/ai-check.cjs
node scripts/ai-browser-check.cjs
node scripts/ai-browser-check.cjs --live
node scripts/ai-browser-check.cjs --live --gpu
```

The first two AI scripts test prompt contracts and UI transport. Synthetic worker messages are explicitly fixtures, not evidence of inference. Browser checks also exercise a real blocked-download failure. `--live` uses actual downloaded weights, real browser WASM inference and all five requested messages; `--live --gpu` uses real Qwen WebGPU inference. Each live run uses its own temporary Chrome profile, leaves the user's browser/saves untouched, and writes raw output/timings to `ai-live-wasm.json` or `ai-live-webgpu.json`. Cold means an empty origin/profile model cache; network/CDN caches outside Chrome are uncontrolled. Sampling makes output nondeterministic. Live scripts test one playful cat; cross-species/personality prompt contracts cover both species/all five personalities, but that is not a model quality evaluation for every personality.

## Physical Android procedure

1. Run Vite locally. Use a trusted HTTPS deployment or USB debugging with `adb reverse tcp:5173 tcp:5173`, opening `http://localhost:5173/#ai-lab` on the phone. A Wi-Fi `http://192.168…` address generally cannot expose WebGPU/Cache API; this is a secure-context requirement, not an onboarding/game failure.
2. In current Android Chrome, first try Qwen/WebGPU. Record the displayed browser version, support/error, RAM hint, GPU limits, cold load, first token and all five prompt timings. If GPU is unavailable or fails, explicitly choose Smol/WASM; do not call CPU results GPU results.
3. Keep the tab foregrounded during a benchmark. Confirm input/control scrolling stays responsive, cancel during download and generation, unload/reload, background/foreground, network loss and low-storage behavior. Reload once to measure cached loading. Record any thermal slowdown, tab kill or native/GPU allocation failure.
4. Verify replies for species/personality, brevity, coherence and invented memories/places. Compare with real saved records; treat photo records as unverified. Do not clear game site storage to obtain a cold benchmark: use a separate test browser/profile/origin to preserve pets and photos.

No physical Android performance, GPU memory ceiling or device thermal behavior has been verified by desktop/viewport tests.

## Files

Modified: `package.json`, `package-lock.json`, `vite.config.ts`, `src/main.tsx`.

Created: `src/ai/ExperimentalEntry.tsx`, `src/ai/AILab.tsx`, `src/ai/lab.css`, `src/ai/models.ts`, `src/ai/prompt.ts`, `src/ai/inference.worker.ts`, `scripts/ai-check.cjs`, `scripts/ai-browser-check.cjs`, this report and live measurement JSON reports. No pet artwork, Home/Talk implementation, game save schema, reward logic or global theme styles were changed.

## Earlier recorded desktop measurements — not independently reproduced

The existing checkpoint record attributes these measurements to real headless Chrome 155 on Windows, isolated fresh test profiles, real network downloads and worker inference. Its GPU adapter probe reported AMD / RDNA-3, non-fallback adapter, `shader-f16` and approximately 2 GiB buffer/binding limits. Chrome exposed a coarse 16 GB device-memory hint; this is not measured model RAM. The recovery audit inspected the saved reports without rerunning or independently establishing their provenance. These numbers describe the earlier reported desktop/network run, not Android.

| Model/backend | Cold load + one-token warm-up | Cached load + warm-up | Warm generation, five inputs | Tokens/s, including prefill |
|---|---:|---:|---:|---:|
| Qwen3 q4f16 / WebGPU | 225.64 s (226.26 s wall) | 5.20 s (6.05 s wall) | 2.96–9.29 s | 4.63–8.50 |
| SmolLM2 q4 / single-thread WASM | 38.35 s (39.28 s wall) | not measured | 16.97–34.91 s | 1.12–2.47 |

Raw responses, individual first-token/input/output-token timings and progress are retained in [GPU measurements](ai-live-webgpu.json) and [CPU measurements](ai-live-wasm.json). Qwen tokenizer download was approximately 9.1 MB; Smol tokenizer approximately 2.1 MB, in addition to weights/runtime. The cached Qwen worker reload succeeded in the same profile. The original benchmark did not record per-request cache-hit telemetry; the reproducible live script now also asserts absence of model-host network requests on cached reload.

Main-thread 100 ms heartbeat continued during actual load/inference: Qwen 2,530 ticks, worst observed gap approximately 164 ms. Smol 1,856 ticks; its worst gap was not instrumented in that earlier run. This verifies main-thread liveness, not a full animation FPS or phone thermal benchmark. No allocation/OOM error occurred in these two successful desktop runs; native/GPU peak memory remains unmeasured.

### Quality assessment (not acceptance tests)

Both models generated all five requested inputs using the shared prompt and a playful example cat with no completed memories. Successful transport/generation is **not** a quality pass:

- Qwen: short, mostly coherent replies; used cat sounds in greeting/fatigue, but frequently normal-human wording, quiet/sleepy behavior despite playful personality, and whimper/whine in the shoe reply. The destination reply named no fabricated place but gave no useful activity suggestion. **Failed memory grounding:** it speculated about a shared treasure hunt after dinner despite an empty memory context.
- Smol: too slow for conversational mobile use in this CPU run; verbose/human/coach-like wording, incoherent destination/shoe replies, two replies hitting the 80-token cap. Its memory answer denied remembering but still implied a shared experience, so grounding also failed.
- Neither output set claims GPS/photo verification or awards a reward. This does not establish general hallucination safety. No physical Android, Qwen CPU, Smol GPU, dog generation or full five-personality quality matrix was tested. Prompt contracts for those species/personality combinations are separate deterministic checks.
- Benchmark prompts used the initial lab snapshot's resolved theme phase; final source now reuses the real `useDialoguePhase` clock so manual Day/Night cannot falsely label the time of day. Inference/model/sampling architecture is unchanged. The added GPU-info display and unavailable-cache guard are also subsequent diagnostic hardening, not new performance measurements.

## Validation and recommendation

The original report recorded passing build/lint, nine logic scripts, AI prompt contracts and rendered-browser AI tests. It also recorded completed live CPU/GPU generation for five inputs with unchanged saves. Its final six gameplay browser results were missing when recovered. Current rerun results and their limitations are explicitly recorded at the top of this document; do not treat the original browser claims as a recovery pass.

**Recommendation: future hybrid architecture; keep AI experimental now.** Earlier saved reports contain outputs attributed to real local browser inference; recovery has not independently reproduced it. Qwen/WebGPU is the stronger local candidate in those reports; Smol/CPU is unsuitable in those measurements. A 570 MB opt-in download, several-minute cold load, untested Android GPU/memory limits and recorded fabricated memories prevent recommending browser-only AI as the default mobile game conversation system.

Retain scripted/validated factual dialogue and all consequential actions. Evaluate optional local generation on capable devices after physical Android testing. If phones cannot meet latency/memory requirements, consider a larger hosted open-weight model in a later, explicitly consented backend checkpoint, with validated game facts and constrained responses; hosted models still need hallucination checks. Nothing in this checkpoint implements hosted inference or switches normal Talk to AI. Grounded-response safety and reliable chaotic personality remain **incomplete**; prompting alone did not solve them.
