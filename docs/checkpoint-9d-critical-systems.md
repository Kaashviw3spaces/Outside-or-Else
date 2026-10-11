# Checkpoint 9D — critical systems

Date: 2026-10-11 (Asia/Calcutta). Scope stops at this checkpoint.

**Android source, model packaging, settings, and APK builds are implemented and verified as described below. Physical offline generation and notification delivery are NOT TESTED. This is not a claim of device acceptance.** No phone or emulator appeared in either `adb devices` check. No APK was installed, no production save was cleared, and no physical model reply was observed.

## 1. Feature status and actual audit

| Requirement | Result | Evidence / limits |
|---|---|---|
| Native inference bridge and arm64 compilation | PASS | Capacitor Java plugin, serialized executor, C++ JNI loader/tokenizer/sampler/decode loop; NDK build and APK assembly succeed |
| Model ships inside APK | PASS | APK inspection verifies the full 484,220,320-byte GGUF, exact SHA-256, uncompressed asset, native library closure and model license |
| Android model initialization and genuine generation | NOT TESTED | Implemented and compiled, but never executed on Android during this checkpoint |
| Airplane-mode generation on a physical phone | NOT TESTED | No connected device |
| Native routing and AI/game isolation | PASS | Executable transport regression uses a mocked native plugin; existing real browser regressions confirm unchanged saves. This is routing/isolation evidence, not inference evidence |
| Settings preferences, controls and persistence | PASS | Real mobile Chrome UI test, reload persistence, disable-all, unsupported status, unchanged game save; screenshot reviewed |
| Native reminder scheduling code | PASS | Compiles in APK; shared native planning rules tested on JVM |
| Android permission prompt/denial, alarm cancellation and delivery | NOT TESTED | Denial/cancellation plans and mocked bridge behavior pass; actual Android OS behavior still needs device execution |
| Challenge/day/quiet/duplicate rules | PASS | JVM and TypeScript tests cover opt-in, grace, pause, completion, expiry, local days, DST, timezone aliases, stable IDs and daily delivery ledger rule |
| Reboot/update receiver registration | PASS | Native manifest and compiled receiver handle boot, package replacement and clock/timezone changes |
| Actual reboot/update recovery and closed-app delivery | NOT TESTED | Requires Android execution |
| Existing gameplay regressions | PASS | All 13 existing code suites and all 8 existing isolated browser suites pass |
| Final debug APK and isolated verification APK/test APK | PASS | Gradle assembly succeeds; artifacts listed below |

The prior `android-offline-ai.md` audit described an earlier environment and is superseded for current tool availability. This checkpoint verified:

- Existing React 19 / TypeScript 6 / Vite application, Talk, AI Lab, worker, shared session controller, chat preference store, Settings, challenge rules/service, journey persistence and reward caps. No AGENTS.md was found in the project search.
- Android Studio at `C:/Program Files/Android/Android Studio`, product version `AI-262.9437.185.2621.16467767` / AndroidStudio2026.2.1.
- JDK 17.0.20.101 on PATH; Studio JBR 25.0.3. Capacitor uses Java 21, while Gradle 8.14.3 cannot run on JDK 25. A workspace JDK 21.0.12.1+1 and Gradle 8.14.3 were acquired and used successfully.
- SDK at `C:/Users/Saksham/AppData/Local/Android/Sdk`; installed platform `android-37.0`, NDK `30.0.16248370`, CMake `4.1.2`, Build Tools `36.0.0`, platform-tools and command-line tools. The first Gradle attempt also installed Build Tools 35; the app now explicitly uses 36.
- ADB works at its full SDK path, although not on PATH. Both device inventories were empty.
- Capacitor and Android project were absent before this checkpoint. Core/Android 8.5.3 and CLI 8.4.3 are now installed. CLI 8.4.3 was pinned to avoid the development-only vulnerable iOS dependency introduced by CLI 8.5.3. Final npm audit reports zero vulnerabilities.
- Original notifications were only a stored `Profile.notifications` checkbox labelled future/SOON. No delivery code existed. It was replaced with the independent, versioned reminders section; the legacy profile field is retained for save compatibility and cannot automatically enable reminders.

## 2. Native AI architecture

`Talk → shared BrainSession → nativeTransport → PetInferencePlugin → JNI → llama.cpp CPU → bundled Qwen3 GGUF`.

Android bypasses worker/WebAssembly/WebGPU support probes. Browser Talk and AI Lab remain a development diagnostic path using the existing browser worker; the AI Lab hash entry is disabled in the Android app. Native initialization never invokes a Hub loader, network model download or external inference API. The app's INTERNET permission remains for existing optional Nearby functionality; the separate offline verification build removes it entirely.

### Exact artifact and provenance

- Repository: [bartowski/Qwen_Qwen3-0.6B-GGUF](https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF).
- Revision: `60b85c0e3d8fe0f6474f406922a26d12aca4550d`.
- File: `Qwen_Qwen3-0.6B-Q4_K_M.gguf`, 484,220,320 bytes.
- Verified SHA-256: `9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14`.
- Upstream: [Qwen/Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B), Apache-2.0. Upstream license and both upstream/converter model cards are packaged in `native/notices`. The converter card identifies the original model; its card does not independently declare a different license.
- llama.cpp revision: `23b0202a189c44a54625aadcb37a946dd1d6278d`, MIT; fetched source and applicable runtime/vendor license files are present.
- Actual GGUF inspection: architecture `qwen3`, quantization file type 15 / Q4_K_M, GPT-2/BPE tokenizer, `qwen2` pre-tokenization, vocabulary 151,936. Special IDs 151643/151644/151645 are end-of-text/message-start/message-end; 151667/151668 are thinking delimiters. The exact embedded chat template is preserved in the model-inspection artifact.

For the game's supported no-tools, alternating-role conversation subset, native formatting reproduces the embedded Qwen template with `enable_thinking=false`. An executable check compares the actual template's Jinja rendering for zero, one and two history turns with the native-format contract. Roles, lengths and delimiter handling are checked; there is no generic template fallback.

### Lifecycle, prompt bounds and isolation

- One page-owned session shared with browser diagnostics; synchronous duplicate-load reservation before asynchronous work.
- One native model/context, all loading/hash verification/tokenization/decoding on a serialized background executor. Cancellation sets an atomic decode abort flag and invalidates queued operations; unload happens on the executor after active decoding ends. Late transport messages are ignored.
- Stream extraction from APK to app-private storage, length/hash verification and atomic rename. A missing or corrupt extracted copy is restored from the packaged asset. No hundreds-of-megabytes JS/JVM byte array or post-install download.
- CPU backend, mmap weights, 2,048-token context, F16 K/V cache, 128-token batches and up to four CPU threads. These are configuration facts, not measured memory/performance guarantees.
- Existing read-only personality/grounded prompt and last two accepted AI turns. Native tokenizer enforces 1,024 input tokens, dropping oldest full turns first; 72 output tokens maximum per attempt. The existing validator permits at most one retry and rejects unaccepted output. No scripted fallback is labelled as generated.
- Deterministic saved-fact questions bypass inference. Native generation returns text and timing/token metrics only. Neither native AI nor its transport writes affection, adventures, challenge state, rewards, scrapbook records or memories.
- Explicit cancel/unload and app destruction release native resources. Initialization/runtime failure frees the context and model; retry revalidates local assets. Physical memory pressure, thermal behavior, cancellation latency and repeated-session stability remain NOT TESTED.

### Browser Talk failure audit

Talk and AI Lab already used the same `BrainSession` and worker factory. Their support checks differ in diagnostic detail, not runtime ownership. Existing session regression proves initialization reservation, subscription/unmount survival, shared Lab exclusivity, timeout/error propagation and late-message protection. Real Chrome tests reproduce blocked-download and synthetic allocation failures, expose failure states, and verify there is no disguised scripted AI reply.

No new real browser weight load or live Qwen reply was attempted. The previously reported real-browser runtime failure is **NOT TESTED/reproduced with real weights** here; a specific GPU/runtime root cause is not asserted. The confirmed Android integration defect was that its only available path required browser inference/download support. Android now routes directly to the native bundled model and has local wake/error/cancel wording. A native terminate/reload ordering race was also corrected so an old unload cannot be queued behind a newly started load.

## 3. Notification architecture

`App game/challenge updates → serialized snapshot reconciliation → PetRemindersPlugin → SharedPreferences → AlarmManager → ReminderReceiver → NotificationManager`.

The snapshot includes pet ID/name, preference values, current local date, completed qualifying outing status and the existing evaluated challenge state. Notifications do not evaluate or mutate gameplay outcomes. Existing IndexedDB challenge evaluation remains authoritative.

- Default master OFF; permission is requested only by the explicit Allow reminders button. Automatic reconciliation checks permission and never calls the permission-request API.
- Native one-shot, inexact `setAndAllowWhileIdle` alarms. No browser timer is used for closed-app delivery, and no exact-alarm permission or exact-time promise is made. Android/OEM policies can delay or suppress delivery.
- Stable IDs 9101/9102/9103 for daily/check-in/challenge and 9104 for the explicit test. Reconciliation cancels the owned alarm IDs before scheduling replacements. A per-pet/type/local-date delivery ledger suppresses same-day repeated deliveries.
- Daily reminders skip a completed outing's local day and plan the next eligible day. Check-ins use the selected local reminder time. A challenge warning is planned for baseline + two local calendar days: one completed full day has been missed and the current day can still qualify. It is suppressed for grace, disabled/paused/protected/separated challenges, wrong pet, timezone mismatch, completed current-day outing and expired warnings.
- Quiet hours support same-day and overnight intervals. Equal endpoints mean quiet all day. Planning defers into an allowed window; the receiver rechecks quiet hours and challenge eligibility at actual delivery, including delayed alarms. A warning deferred past its eligible day is suppressed.
- Native timezone comparison understands equivalent aliases, including Asia/Calcutta and Asia/Kolkata. Clock/timezone broadcasts suppress challenge warnings until a fresh game snapshot is supplied.
- Reconciliation follows profile/challenge changes, journey completion/deletion events, preference changes, launch/focus/resume. Unavailable journey reads cancel the native snapshot rather than preserving uncertain warnings. Challenge read errors/loading protect scheduling.
- Boot and package-replacement broadcasts rebuild alarms from committed native preferences. Android force-stop restrictions and OEM battery policies still apply; reboot/update delivery is not physically verified.
- Disabled reminders cancel scheduled alarms and remove this app's reminder notifications. Permission denial/blocked channel yields Permission required; native scheduling errors reject to the UI. A successful test message follows the native notification submission, not a browser success timer.

## 4. Settings and gameplay

The existing cozy Settings section now contains the master switch, three individual options, reminder time, quiet-hours switch/start/end, permission status, Allow reminders, Test notification and Disable all reminders. Every control persists independently in `outside-or-else:reminders:v1`; enabled, disabled, permission-required, unsupported, scheduled and error states use actual platform responses. Browser controls clearly report unsupported delivery. Android Talk describes local bundled chat without exposing developer backend choices.

No save version, adventure mechanic, reward cap, scrapbook persistence, wardrobe unlock or personality rule was changed. Legacy profile notification data remains readable. Browser-to-APK storage migration is not implemented: a fresh WebView has separate storage from Chrome. Android test builds use a separate package ID so future device checks can preserve production saves.

## 5. Android build results

PASS: main debug APK, `com.outsideorelse.game`, minimum SDK 26, target SDK 36, compile SDK 37, arm64-v8a. Main artifact: `android/app/build/outputs/apk/debug/app-debug.apk` (about 510 MB). Full size/hash details are in `artifacts/checkpoint-9d/apk-files.json`.

PASS: separate `com.outsideorelse.game.offlineverify` APK at `android/app/build/outputs/apk/offlineVerify/app-offlineVerify.apk`, plus its instrumentation APK at `android/app/build/outputs/apk/androidTest/offlineVerify/app-offlineVerify-androidTest.apk`. `aapt2 dump permissions` confirms the offline verification APK contains no INTERNET permission. Both instrumentation classes compile; they have not run.

The APK inspection confirms six arm64 libraries (`pet_inference`, `llama`, `ggml`, `ggml-base`, `ggml-cpu`, `c++_shared`), the uncompressed pinned GGUF and model license. `verifyBundledBrain` makes future builds fail if weights are absent, partial or hash-mismatched.

Initial build FAIL: Gradle download timeout and first SDK discovery failure. Subsequent builds PASS using workspace Gradle/JDK and the installed SDK. The final build log is `artifacts/checkpoint-9d/android-build-verified.log`. AGP 8.13 warns that compile SDK 37 is above its tested SDK 36.1 range; assembly succeeds, but this warning is retained rather than hidden. SDK XML/deprecation warnings are also recorded. These warnings and debug signing must be addressed/accepted during any later release preparation; no release distribution is claimed here.

## 6. Automated tests and evidence

PASS:

- `npm.cmd run build`, `npm.cmd run lint`.
- All 13 code suites: checkpoint, solar, theme, dialogue, context-dialogue, journey, pets, nearby, challenge, ai, ai-9b, ai-9c, ai-9c2 (each `scripts/<name>-check.cjs`). Full results: `artifacts/checkpoint-9d/regression-code.json`.
- All eight existing browser suites: onboarding, scenes, context-dialogue, pets, journey, challenge, ai, ai-9c. Full results: `artifacts/checkpoint-9d/regression-browser.json`. AI fixtures are synthetic and do not count as generation evidence.
- `node scripts/critical-systems-check.cjs`: preference persistence/corruption/storage errors, OFF default, quiet hours, challenge guards/local-day expiry, mocked denial/cancellation, unsupported routing/no automatic permission prompts, actual native transport selection/shared lifecycle/validation/duplicate-load/unload and game-state isolation.
- `ReminderRulesCheck.java` compiled/run with local javac/java: native schedule selection for denial/disabled/no-pet, unique IDs, duplicate ledger rule, quiet intervals/all-day, DST/local dates, challenge opt-in/grace/pause/clock protection/completion/expiry and timezone aliases. This does not execute Android AlarmManager.
- `node scripts/notifications-browser-check.cjs`: actual 390px mobile Settings interaction, time/quiet/individual preference persistence across reload, master OFF despite legacy opt-in, unsupported buttons, disable-all, unchanged profile, no page errors/no horizontal overflow. Screenshot: `artifacts/checkpoint-9d/notification-settings.png`.
- `python scripts/inspect-bundled-model.py`, `node scripts/native-template-check.cjs`, `python scripts/inspect-apk.py android/app/build/outputs/apk/debug/app-debug.apk`.
- Gradle `assembleDebug assembleOfflineVerify assembleOfflineVerifyAndroidTest -PofflineVerification`.
- Final npm audit: zero vulnerabilities (`artifacts/checkpoint-9d/npm-audit-final.json`).

NOT TESTED: actual Android instrumentation execution. `OfflineInferenceTest` requires the isolated no-INTERNET package, extracts the bundled asset and calls the real JNI loader/decoder with a fresh nonce; it asserts nonempty text and real input/output token counts and logs generation evidence. `NativeRemindersTest` checks submitted notifications, same-day suppression, native schedule counts, quiet-all-day and disable cancellation inside the isolated package. Real permission-denial/re-enable, background alarm timing, reboot/update, model cancellation/recovery and retained-save upgrade still need the physical matrix below.

## 7. Physical results and remaining blockers

All physical-device rows are NOT TESTED: device model/ABI/API/free RAM, install/launch, initial offline extraction/loading/generation, notification permission denial/grant, actual closed-app reminders, quiet-hours late delivery, challenge warning scenarios, reboot/update recovery, native cancellation/retry/low-memory stability and save-preserving upgrade.

No device was connected. Native execution acceptance therefore remains open. The selected arm64 build needs a compatible Android 8+ device; the reported 12 GB Motorola's actual Android version, ABI and available memory were not measured. APK existence, model hash and template agreement cannot substitute for generation or delivery on that phone.

## 8. Exact next steps

1. Connect the phone with USB debugging. Run the SDK's `platform-tools/adb.exe devices`, `adb shell getprop ro.product.model`, `adb shell getprop ro.build.version.sdk`, `adb shell getprop ro.product.cpu.abilist` and `adb shell cat /proc/meminfo`. Confirm arm64 and SDK 26+ before installation.
2. Install the isolated offline verification APK and its test APK with `adb install -r`; do not uninstall/clear the production game. Enable airplane mode before its first launch. Optional Nearby cannot network in this package by construction.
3. With `JAVA_HOME` set to the workspace JDK 21 and `GRADLE_USER_HOME` to `android/.gradle-cache`, run workspace Gradle `-p android connectedOfflineVerifyAndroidTest -PofflineVerification --no-daemon`. Capture instrumentation results and `adb logcat -s OfflineInferenceEvidence`. This runs genuine JNI generation and native reminder tests; archive token metrics, output and device details.
4. In isolated Talk, select AI, wake the included companion and send a fresh ordinary nonce message. Capture visible generated output and decoder evidence in airplane mode. Test deterministic saved facts, untouched reward/affection/memory state, explicit scripted mode, cancellation/unload/reload, navigation/background/restart and missing/corrupt extracted-copy recovery. Measure latency/process memory/thermal stability.
5. In Settings, test master OFF at first launch, explicit permission denial and re-enable, individual toggles/time/quiet hours, blocked notification channel, test notification and disable-all. Verify actual OS delivery with the app backgrounded/closed, delayed alarms, same-day duplicate prevention, completed daily adventure, challenge opt-out/grace/pause/resume/one missed day/expired warning/timezone/local midnight transitions. Repeat after device reboot and an `adb install -r` update with retained test saves.
6. Record PASS/FAIL with physical evidence before accepting the offline-first runtime. Reconcile compile SDK/AGP support and release signing in any later release checkpoint.

For repeat local builds, use `scripts/build-android.ps1`; use `-OfflineVerification` for the isolated package. On a new checkout, `scripts/prepare-android.ps1` acquires the pinned native source/model **during development**, then verify the model and configure the installed SDK path in `android/local.properties`. Model and toolchain downloads/build caches are ignored; the APK contains the weights. Preparation never adds an app-time download path.

Stopped after Checkpoint 9D. No deployment, device install, new checkpoint or release acceptance was performed.
