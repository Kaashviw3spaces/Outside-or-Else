# Android offline AI: architecture audit and blocked release

> Historical audit. Current toolchain, implementation, APK builds and outstanding physical tests are recorded in [Checkpoint 9D](checkpoint-9d-critical-systems.md). The missing-toolchain findings below describe the earlier state.

Audit date: 2026-10-11. **Release acceptance is not met. No APK was built, no native model was initialized, and no Android model-generated response was produced.**

The requested hard-stop condition applies: this development environment has neither the Android compilation toolchain nor an existing native project. This change records the audit and the proposed implementation; it does not introduce an untested native bridge. Game source, dependencies, save schemas, artwork and dialogue remain unchanged. No model weights or native libraries were downloaded or loaded. Small public metadata, configuration and source files were inspected; their pinned provenance is recorded in `android-offline-ai-audit.json`.

## 1. Actual project and tooling

| Item | Observed state |
| --- | --- |
| Application | React 19 / TypeScript / Vite 8; existing dependencies installed |
| Capacitor | Absent from manifest and installed dependencies; no Capacitor configuration |
| Android project | No Gradle wrapper, Android manifest or native app project |
| Android tools | `adb`, `sdkmanager`, Gradle, CMake and Ninja unavailable on PATH; SDK/NDK not found in checked standard/common locations |
| Java | Java 8 **runtime** (`1.8.0_401`), no `javac`; no usable JDK found in checked locations |
| Environment | `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT` unset |
| Packaged model | No application GGUF, ONNX weights or safetensors found |
| Current inference | Transformers.js 4.3.1 / ONNX Runtime Web in a browser worker |
| Phone | User reports Motorola, 12 GB RAM; exact SoC, Android version, ABI and available physical RAM not verified |

Tool discovery covered PATH, standard Android/Java install locations, common user SDK locations and relevant installed-program registry entries. This is a scoped environment audit, not a claim that every disk directory was searched. Without ADB, device properties and USB availability could not be inspected.

Capacitor 8 requires Node 22+ and Android Studio 2025.2.1+; this project's Node 24 satisfies the Node requirement. Android Studio supplies the appropriate JDK, but the installed Java 8 runtime cannot compile this app. SDK, build tools, NDK and CMake still need provisioned versions compatible with the chosen native library. See [environment setup](https://capacitorjs.com/docs/getting-started/environment-setup) and [Capacitor 8 requirements](https://capacitorjs.com/docs/updating/8-0).

## 2. Existing inference, Talk and storage

`src/ai/models.ts` selects `onnx-community/Qwen3-0.6B-ONNX`, revision `1e0a4a196ecabdf9a879664110574563d3f372d3`. The current estimated downloads are 569,789,750 bytes for WebGPU and 919,096,585 bytes for WASM. These weights are not packaged in this repository.

`src/ai/inference.worker.ts` sets `env.allowLocalModels = false` and uses remote `from_pretrained` loaders. Browser Cache is opportunistic, not an APK asset guarantee. The built worker, ORT WASM binary and AI Lab chunk are runtime code, not model weights. A cold install therefore cannot meet the no-download requirement. WebGPU availability in a desktop browser does not establish Android WebView support.

`src/ai/brainSession.ts` already provides shared initialization, duplicate-session protection, cancellation, timeouts and lifecycle states. `src/ai/useTalkBrain.ts` subscribes to it. `src/components/ConversationPanel.tsx` separates:

- Read-only saved-fact answers through `src/ai/talkFacts.ts`.
- Actual Qwen conversation through personality/context prompts and output validation.
- Explicit offline scripted pet reactions through the existing dialogue engine.

Reuse these boundaries and reliability controls. Ordinary conversation in enabled AI mode must use native generation; facts must bypass inference. Rejected output must remain a failure, without a scripted reply labelled as generated. Preserve bounded history, the current 1,024-token input budget, 72/64-token generation limits and at most one retry. Native tokenizer budgeting must enforce these limits rather than assuming the browser tokenizer remains available.

Existing saves use localStorage (`outside-or-else:v1`, separate chat preference) and IndexedDB (`outside-or-else:journey-v1`, outing/memory/photo/meta stores). Photos are local Blobs. No save-schema change is necessary for the proposed bridge. However, a newly installed APK's WebView storage is separate from Chrome storage: existing browser records will remain in Chrome and will not migrate automatically. Maintain stable application ID, WebView origin and signing identity for future APK updates; any browser-to-app migration needs an explicit, separately verified export/import path.

## 3. Native options and compatibility evidence

| Consideration | Existing ONNX via native ONNX Runtime / GenAI | Qwen3 GGUF via llama.cpp |
| --- | --- | --- |
| Model support | GenAI builder implements Qwen3; native Android runtime exists | Runtime implements Qwen3; Android JNI example exists |
| Existing artifact reuse | Web-specific quantized graphs are not verified with native providers, input/KV names and GenAI configuration | Published Q4_K_M GGUF eliminates a local conversion step |
| Integration | Native AAR, generation orchestration/configuration, provider and tokenizer validation | C++ runtime/shared libraries, JNI wrapper and native tokenizer/chat template |
| Conversion | Likely needs a GenAI-compatible export/configuration; not established for current graphs | Original HF weights can be converted, but an existing GGUF is simpler; ONNX files cannot just be renamed GGUF |
| Android CPU | Available, graph/provider compatibility still untested | Source-supported CPU backend; device execution still untested |
| GPU | Provider-specific; WebGPU is not the native solution | Optional acceleration requires separate device/backend verification; start with CPU |
| Bridge | React-to-native asynchronous calls required | Same, with JNI between Kotlin/Java and C++ |
| Decision | Higher compatibility uncertainty for the current artifact | Recommended candidate, conditional on native build and physical tests |

This is stronger evidence than assuming support from architecture names alone, but **not actual model/runtime execution compatibility**. Native ONNX remains viable in principle: [ORT mobile](https://onnxruntime.ai/docs/get-started/with-mobile.html), [GenAI Android build](https://onnxruntime.ai/docs/genai/howto/build-from-source.html), [Qwen3 builder implementation](https://github.com/microsoft/onnxruntime-genai/blob/main/src/python/py/models/builder.py), and [GenAI configuration requirements](https://onnxruntime.ai/docs/genai/reference/config.html).

For llama.cpp, inspected commit `23b0202a189c44a54625aadcb37a946dd1d6278d` contains a [Qwen3 implementation](https://github.com/ggml-org/llama.cpp/blob/23b0202a189c44a54625aadcb37a946dd1d6278d/src/models/qwen3.cpp) and [Android JNI loader and generation code](https://github.com/ggml-org/llama.cpp/blob/23b0202a189c44a54625aadcb37a946dd1d6278d/examples/llama.android/lib/src/main/cpp/ai_chat.cpp). Kotlin's load error is generic; it does not expose a Qwen-only architecture whitelist. Native loading delegates to `llama_model_load_from_file`.

The inspected [Android example library](https://github.com/ggml-org/llama.cpp/blob/23b0202a189c44a54625aadcb37a946dd1d6278d/examples/llama.android/lib/build.gradle.kts) uses compile SDK 36, minimum SDK 33, NDK 29.0.13113456, CMake 3.31.6, and arm64-v8a/x86_64. Its JNI example defaults to an **8,192-token context**; copying it unchanged would waste memory and bypass the game's limits. An adapted wrapper must consistently set a 2,048-token context, smaller batches and bounded output, including overflow checks. Verify the Motorola runs Android 13+ and arm64 before adopting this example directly; older Android requires another supported binding or a verified adaptation. [Android runtime guidance](https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md).

## 4. Recommended model and packaging

Recommended architecture, **not yet implemented**: existing React UI inside Capacitor; native CPU llama.cpp behind a dedicated asynchronous plugin; Qwen3-0.6B Q4_K_M GGUF included in the base APK.

- Repository: `bartowski/Qwen_Qwen3-0.6B-GGUF`.
- Revision: `60b85c0e3d8fe0f6474f406922a26d12aca4550d`.
- Exact file: `Qwen_Qwen3-0.6B-Q4_K_M.gguf`.
- Size: **484,220,320 bytes**, approximately 461.8 MiB (484.2 decimal MB).
- SHA-256: `9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14`.
- Format: quantized GGUF, intended to carry tokenizer and model metadata with the weights. Embedded tokenizer/chat-template contents still require inspection when the actual artifact is authorized and acquired.
- License: upstream [Qwen3-0.6B is Apache-2.0](https://huggingface.co/Qwen/Qwen3-0.6B); the converter repository's API did not supply a separate license field. Verify redistributed artifact provenance and include applicable license/notice files before shipping. llama.cpp is MIT; include runtime and dependency notices.

The [published artifact](https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF/blob/60b85c0e3d8fe0f6474f406922a26d12aca4550d/Qwen_Qwen3-0.6B-Q4_K_M.gguf) exists with this size/hash. The converter [model card](https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF) identifies the original model and quantization tool. No claim is made that this quantization improves conversation quality or preserves every existing benchmark score.

Proposed package: `assets/models/` GGUF plus an immutable manifest/hash, license files and all required arm64 `.so` libraries under the Android native library directories. Disable asset compression for GGUF. Stream-copy the asset into app-private `filesDir` on first initialization, verify length/hash and atomically rename; do not pass hundreds of MB through JavaScript or load the entire file into a JVM byte array. This is local extraction, **not a download**. If the extracted copy disappears, restore it from the APK. The model loader must receive only this verified local path and have no URL or Hub fallback.

Estimated single APK: **500–560 MB**, not measured; actual native binaries and asset compression determine the result. Including the private extracted copy, plan roughly **1.0–1.2 GB installed storage before user photos**, plus installation staging space. A direct sideload APK of this order is a practical candidate; no platform size failure has been measured. Do not change to another installation experience silently.

Google Play's legacy APK upload limit is 100 MB; current app-bundle base-module compressed limit is 500 MB. This package may exceed the latter and would certainly exceed the former. Play-specific distribution may need an install-time asset arrangement, with all assets delivered before first launch; post-install on-demand delivery would fail the requirement. These are store limits, not evidence that a USB-sideloaded single APK is impossible. [Official size limits](https://support.google.com/googleplay/android-developer/answer/9859372).

## 5. Memory and bridge design

All numbers here are **planning estimates, not measured Android peaks**. Using the [original model configuration](https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/config.json), an F16 KV cache at 2,048 tokens is:

`2 × 28 layers × 8 KV heads × 128 head dimension × 2048 tokens × 2 bytes = 224 MiB`.

At 1,024 tokens it is 112 MiB; F32 would double these amounts. Explicitly verify/set cache types. Weights plus the 2,048-token F16 cache total about 686 MiB before computation buffers, native allocations, temporary workspace and WebView. Budget **1.5–3 GiB total app process memory** provisionally with small batches; do not use the example's 8,192-token default. A 12 GB phone is a plausible candidate, not a safety guarantee: available physical RAM, Android process limits, thermal throttling and SoC performance must be measured. Laptop GPU/VRAM does not predict phone inference or latency.

Proposed plugin methods: initialize, generate, cancel, status and unload; request IDs and lifecycle events distinguish stale/cancelled replies. Use one native model/context, a serialized background executor and a duplicate-load guard. Cancellation must interrupt generation safely; freeing a context during decoding is forbidden. Keep React rendering on the UI thread and native loading/tokenization/decoding off it. [Capacitor native plugin API](https://capacitorjs.com/docs/plugins/android).

Reuse current prompt/personality/fact routing and validator/retry rules. Apply the model's native chat template with thinking disabled, and verify the output token budget; the example's generic formatting/default output cap are not sufficient. Only accepted text returns as a model reply; it cannot mutate adventures, affection, rewards or challenges. Keep offline scripted reactions explicitly selectable. Loading failures must explain the failure and offer that switch, without quietly replacing AI. Native AI mode should require only local initialization, never a remote-download consent flow. No cloud service or API key belongs in this path.

## 6. Verification performed

| Check | Result |
| --- | --- |
| `npm.cmd run build` | PASS |
| `npm.cmd run lint` | PASS |
| 13 offline code regression suites | PASS, all |
| 8 isolated browser regression suites | PASS, all |
| Android debug build | NOT RUN: missing project, JDK and SDK/NDK |
| Native initialization/token generation | NOT RUN; no model/runtime acquired |
| Native inference no-network test | BLOCKED: no native implementation to test |
| Physical airplane-mode generation | NOT RUN; release acceptance outstanding |
| APK location | None; no APK was produced |

Code suites: `checkpoint-check`, `solar-check`, `theme-check`, `dialogue-check`, `context-dialogue-check`, `journey-check`, `pets-check`, `nearby-check`, `challenge-check`, `ai-check`, `ai-9b-check`, `ai-9c-check`, `ai-9c2-check` (each `node scripts/<name>.cjs`).

Browser suites: `onboarding-browser-check`, `scenes-browser-check`, `context-dialogue-browser-check`, `pets-browser-check`, `journey-browser-check`, `challenge-browser-check`, `ai-browser-check`, `ai-9c-browser-check`. These cover UI, storage and failure/reliability behavior using isolated fixtures and blocked model downloads. Synthetic responses are not generation evidence. No new AI benchmark, larger model test or live browser model test was run.

## 7. Blockers and exact physical acceptance procedure

First provision Android Studio/JDK, SDK/build tools, NDK/CMake; confirm phone SDK/ABI with `adb shell getprop ro.build.version.sdk` and `adb shell getprop ro.product.cpu.abilist`. Then acquire the pinned GGUF during development, verify its hash/license, implement and build the native wrapper and Capacitor transport, and rerun regressions. These are required work, not completed setup steps. No dependencies were reinstalled during this audit.

After implementation:

1. Build a separately identified debug test app with the full model and native libraries. Inspect the APK contents and GGUF hash. Never uninstall the user's production app or clear their saves for a clean test; use the separate test package instead.
2. Add a native instrumentation test/flavor with **no INTERNET permission** that loads the packaged model, tokenizes an ordinary prompt, decodes actual tokens and asserts a nonempty generated response. Record native runtime revision, model hash, token count, CPU backend, elapsed time and peak process memory. It must fail for missing/corrupt assets, not fetch replacements. The production game's optional Nearby network feature remains separate; do not remove its permission without reviewing gameplay impact.
3. Transfer/install the complete APK by USB. Start with a fresh test-package sandbox that has never downloaded model assets. Disable Wi-Fi and mobile data / enable airplane mode **before first launch**. Record Android version, ABI, actual available RAM and exact device model.
4. Open Talk, enable local AI if needed, and send a fresh ordinary message with a unique nonce, for example: “My imaginary scarf is named Maple-731. Give it a silly one-sentence welcome.” Capture the visible reply plus corresponding native initialization/decode logs. A nonce alone is insufficient proof: verify actual native token generation and absence of scripted transport fixtures.
5. Ask a saved game-fact question and verify deterministic source labeling and unchanged saves. Test the distinct explicit offline-reactions switch. Model replies must not alter game state.
6. Repeat a few conversations, close/reopen Talk, navigate away/back, cancel, background/resume and restart the app while offline. Confirm one model session, bounded memory and no concurrent load. Measure responsiveness/latency rather than extrapolating desktop timings. Test corrupt-copy recovery from packaged assets and a real load failure.
7. Run the no-INTERNET native test on the physical device; supplement with request monitoring where available. Browser CSP tests alone are insufficient. Preserve logs and an airplane-mode screen recording containing an original model response.
8. Test APK upgrade with retained test saves (`adb install -r` using the same test identity), including photo records. Mark release acceptance only after the physical offline initialization and generation evidence succeeds; a build or emulator result cannot substitute.

**Stopped at the confirmed build blocker. Recommended path documented; Android implementation and physical offline generation remain outstanding.**
