# Checkpoint 10A + 10C — final gameplay QA and Android reliability

Date: 11 October 2026, Asia/Calcutta. Testing stopped at the user's time-limit instruction. No additional suites, rebuilds, feature changes, or release preparation followed that instruction.

**Outcome: debug APK built and installed successfully; checkpoint is not declared release-ready.** Three confirmed defects were fixed. All 19 code suites, nine browser suites, and 62 typography checks passed. Physical Motorola checks verified upgrade preservation, real offline inference, cancellation, background generation, elapsed timing through lock and process recreation, camera capture, scrapbook persistence, and scheduled notifications. Native AI can still reject useful hypothetical replies; several physical failure/recovery scenarios remain unverified.

## Build and data preservation

- Deliverable: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Final build: `testDebugUnitTest assembleDebug assembleOfflineVerify`, **BUILD SUCCESSFUL in 19 seconds**, 143 tasks (35 executed, 108 up to date). No rebuild was performed after the wrap-up instruction.
- APK: **509,834,107 bytes** (486.22 MiB), SHA-256 **8786b7a37bb47a422b352d26d58389eca5a4e7b17fccf2da2a7cec5682a028f6**.
- Final main APK installed using `adb install -r`: **Success**. Package remains `com.outsideorelse.game`; app name remains **Outside or Else!**.
- Device: Motorola edge70fusion, Android 36, arm64, serial `ZA223L2CPH`.
- Tashu's complete stored profile and both memory/photo fingerprints matched at checkpoint entry, immediately before final upgrade, and immediately after final upgrade. Profile SHA-256: `f21bf5dd51a194f0b70db4baa083fee7506ee34528becf7c1c6b73c4609508e6`. Memory count **2**, photo count **2**. No main-app uninstall, data clearing, pet replacement, photo deletion, or challenge opt-in occurred.
- Destructive fixtures ran in isolated browsers or `com.outsideorelse.game.offlineverify`, labelled **Outside or Else! QA**. Its QA Luna pet and photo are separate from Tashu. The final QA APK was built; physical gameplay/camera checks used the preceding QA build with the same elapsed-clock implementation, before the last change that restored fact reads to read-only operation. The final main build received the final AI/background/recovery checks.
- Artifact inspection confirmed all **15 launcher PNG resources** match their source files, all bundled Gaegu font/license files match, and APK web assets match the final `dist`. Existing source hashes show CSS, artwork, notification implementation, dialogue catalogues, and native inference implementation were preserved.
- Bundled model: `Qwen_Qwen3-0.6B-Q4_K_M.gguf`, **484,220,320 bytes**, unchanged SHA-256 **9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14**.
- Cleanup: original airplane mode **0** and Wi-Fi **0** restored; temporary ADB forwards 9229 and 9230 removed. Main chat mode remains AI. No unrelated processes were terminated. The current command finished before cleanup.

Evidence: `artifacts/checkpoint-10a-10c/final-android-build.log`, `final-main-install.log`, `final-main-launch.log`, `apk-verification.json`, `final-preservation.json`, `device-final-pre-upgrade.json`, `device-final-post-upgrade.json`, `final-radio-restored.txt`.

## Confirmed defects and minimal fixes

| Defect | Reproduction / impact | Fix | Verification |
|---|---|---|---|
| Adventure duration trusted wall-clock changes | Advancing the clock one hour during roughly one second of a five-minute outing produced 3,600,000 ms and a time-goal reward. | Added a small Android `PetClock` bridge using `SystemClock.elapsedRealtime()` and boot count, persisted monotonic anchors, and used trusted elapsed readings for completion. Browser fixtures use `performance.now()`. | Focused clock suite PASS; actual IndexedDB completion with injected clock jump earns zero time-goal reward; physical timer survives screen lock and same-boot process recreation. |
| Human-name question answered with pet identity | “What is my name?” returned the companion identity despite no saved human-name field. | Added deterministic `human-name` intent that reports the human name as unrecorded and identifies Tashu separately. | Four question variants and existing identity/history/creative routing PASS; Motorola factual response correct, no native generation. |
| Challenge fact answer described a stricter rule than gameplay | Answer claimed a completed **time-goal** outing was required, although existing challenge rules accept a completed outing with a saved photo. | Removed only “time-goal” from the deterministic factual description. | Focused fact suite and existing challenge suites PASS; challenge consequences and reward rules unchanged. |

The timing fix also keeps saved-fact and scrapbook reads read-only. Only the journey UI checkpoints an active outing through `resumeOuting`; a regression asserts facts do not call the clock bridge or mutate the ledger. This avoids adding a native dependency to ordinary saved-data reads.

Timing boundary: same-boot Android background/process-recreation time is recoverable from the hardware clock. A device reboot changes the clock epoch; only previously checkpointed verified elapsed time can be retained, and the UI reanchors subsequent time. An active pre-upgrade record without a trusted anchor cannot receive completion credit merely from its unverified wall-clock gap. A browser reload changes its performance epoch similarly. Reboot/legacy gaps are handled conservatively, not inferred as genuine elapsed activity. No physical reboot test was completed.

Changed existing production files: `src/ai/talkFacts.ts`, `src/journey/rewards.ts`, `src/journey/service.ts`, `src/journey/types.ts`, `src/journey/useJourney.ts`, `src/screens/Adventure.tsx`, and `MainActivity.java`. New production files: `src/journey/clock.ts` and `PetClockPlugin.java`. Additional changes are focused tests, test harnesses, this report, and the QA-only launcher label. No model, layout, reward amount/cap, challenge consequence, notification timing/frequency, artwork, typography, or application ID was changed.

## Automated regression results

| Check | Actual result | Status |
|---|---|---|
| Existing code suites before fixes | All 17 existing suites passed; lint passed. | PASS |
| Existing Android JVM baseline | Two unit tests passed. | PASS |
| Initial browser run | Eight passed; journey failed after the timing implementation changed because its synthetic fixture backdated wall time without the new trusted anchor. This run mixed source states and is not represented as a pristine passing baseline. | FAIL, harness updated |
| Final code regression | 19/19: checkpoint, solar, theme, dialogue, context-dialogue, journey, pets, nearby, challenge, ai, ai-9b, ai-9c, ai-9c2, critical-systems, android-9d1, native-template, notifications-10b1, elapsed-clock, human-name. | PASS |
| Final browser regression | 9/9: onboarding, scenes, context-dialogue, pets, journey, challenge, ai, ai-9c, notifications. Includes actual IndexedDB clock-jump and read-only fact assertions. | PASS |
| Typography regression | 62 checks passed. | PASS |
| Final lint, TypeScript/web production build, Capacitor sync | Completed successfully. | PASS |
| Reminder rules JVM check | Standalone reminder rules check passed. | PASS |
| Final Android unit tests and APK assembly | Gradle completed successfully. | PASS |
| Android instrumentation | Native reminders, hardware elapsed clock, and genuine offline inference passed. Scheduled-delivery test initially failed on its own assertion's handling of unrelated notification IDs; fixed only that test assertion, then the scheduled test passed on the Motorola. | PASS after test fix |

Evidence: `baseline-code.json`, `baseline-android-unit.log`, `baseline-browser.json`, `regression-code.json`, `regression-browser.json`, `lint.log`, `web-build.log`, `capacitor-sync.log`, `typography/typography-browser.json`, `native-instrumentation-first.log`, `scheduled-retry-instrumentation.log` in `artifacts/checkpoint-10a-10c/`.

Browser AI transport/failure fixtures are synthetic. They prove interface and lifecycle behavior, not native model generation. Physical inference evidence is listed separately below.

## Feature results: expected and actual

Statuses describe the stated test scope. A browser PASS does not imply an unperformed physical Android scenario passed.

| Feature / scope | Expected result | Actual result | Status |
|---|---|---|---|
| A: isolated onboarding, cat/dog adoption, 20 breeds, five personalities, naming | Choices render and persist without invalid profiles. | Code/browser adoption and catalogue tests passed; no destructive onboarding on Tashu. | PASS automated |
| A: corrupt/incomplete saves and migration | Graceful recovery and valid normalized state. | Existing save tests passed, including corrupt/blocked storage and legacy migration. | PASS automated |
| A: main APK upgrade | Tashu, memories and photos unchanged. | Initial/before/after profile and two record/photo hashes identical. | PASS Motorola |
| A: real first-time Android onboarding | Complete adoption with Android controls. | Separate physical onboarding flow not run; fixture was seeded in isolated QA storage. | NOT TESTED physical |
| B: both species, reactions, rapid taps and affection boundaries | Valid reactions, no duplicate rewards or invalid affection. | Code/browser both-species checks passed. QA Luna physical pet/feed/nap/wake each exercised with five rapid taps; mood returned to idle, affection stayed 13. | PASS automated + physical cat |
| B: physical dog reactions / restart during reaction | Dog reacts and returns to usable state. | Physical dog and interruption-during-reaction checks not completed. | NOT TESTED physical |
| B: interaction cooldown/rewards | Match implemented behavior. | Interactions are visual reactions with an approximately 3.2-second reset, not affection-reward actions or a separate cooldown progression system. | PASS tested behavior; separate cooldown feature N/A |
| C: Free Walk, early return, cancel, repeated completion | No GPS prerequisite; correct persistent state and idempotent rewards. | Browser start/return/cancel/reopen/multiple completion and duplicate safeguards passed. Physical QA Luna started Free Walk without a location workflow. | PASS |
| C: lock/background/process recreation | Accurate same-boot elapsed time. | Five-minute QA walk: 0:00 at start, 1:51 after HOME + locked screen, 3:38 after isolated QA process restart, returned at 5:08; recorded elapsed 308,735 ms. | PASS Motorola |
| C: clock change must not earn time reward | One real second stays one second despite a one-hour clock jump. | Pure and actual IndexedDB/service injected-clock checks passed. Hardware clock bridge tested on Motorola. Actual device wall-clock change was not performed. | PASS automated; physical wall-clock mutation NOT TESTED |
| C: pause/resume | Only test if supported. | No pause/resume feature exists. | N/A |
| D: daily cap, affection 100, repeated completion, local-day rollover | Existing +2 time / +1 photo, daily +3 maximum, no double awards. | Code/browser atomic completion, daily cap, milestones, rollover and persistence passed. Rapid double save on Motorola produced one memory and +3 once (10 → 13). | PASS |
| D: wardrobe | Unlocks/equip/remove persist with no pet replacement. | Browser owned/locked items, equip/remove and restart passed. Physical QA walk unlocked red collar; equip/save succeeded, no horizontal overflow. Physical post-equip restart/removal not completed. | PASS automated + partial Motorola |
| E: native capture, caption, save, scrapbook restart | Image remains local, caption and photo survive. | Human-confirmed Motorola capture; 768×1024 JPEG, 38,815 bytes. Caption saved, scrapbook image loaded. QA restart preserved identical record/photo/profile hashes. | PASS Motorola |
| E: cancel/retake | Cancelling replacement keeps earlier image and caption. | Camera reopened for retake and cancelled; earlier photo remained, cancellation notice correct. | PASS Motorola |
| E: successful second capture replacement | Retake replaces draft successfully. | Only cancellation of retake tested physically. | NOT TESTED physical |
| E: large image / storage failure / missing photo | Resize or actionable recovery, no silent loss. | Browser resize/JPEG/blob, quota retry, corrupt replacement and atomic failure scenarios passed. | PASS automated |
| E: physical low storage / camera unavailable | Graceful native failure. | No storage exhaustion or removal/disablement of camera provider performed. System camera intent is used; app does not request its own CAMERA permission. | NOT TESTED physical; separate app CAMERA permission N/A |
| F: permission denied/blocked, services off, timeout, offline, empty/504/errors/retry/privacy | Useful bounded failure; optional location; no fictional destinations. | Existing native-contract, code and browser transport/location fixtures passed, including rounded coordinate rules and Free Walk availability. | PASS automated |
| F: live nearby search / external 504 recheck | Actual Overpass outcome reported honestly. | No fresh live Overpass query completed in this checkpoint. Earlier checkpoint's 504 is not counted as a current success or GPS failure. | NOT TESTED physical/live |
| F: precise location | Test only if implemented. | Native implementation requests coarse/approximate location only. | N/A |
| G: genuine native model / repeated offline prompts | Bundled JNI model generates locally, no cloud or substituted script. | Actual native generation metrics/text captured for shoes, butterfly and moon. Airplane-mode generation and native instrumentation without INTERNET permission verified. | PASS Motorola |
| G: saved human name and adventure facts | Read saved data, report unknowns, do not invent history. | “What is my name?” explicitly says human name unrecorded, companion Tashu. Last-adventure answer uses one saved completed outing and labels photo/location unverified; both made zero generation calls. | PASS Motorola |
| G: rapid submission | One accepted user request, no duplicate conversational turn. | Double form submission produced one user/AI pair. On final shoes test, two backend generations were the existing quality retry, not two user submissions. | PASS Motorola |
| G: cancellation | Stop inference/unload, clear thinking state. | Two actual cancellation checks: native cancellation error, unload completed, UI cancelled, no substituted reply. | PASS Motorola |
| G: background during generation | Requested generation survives ordinary HOME transition and return. | Final APK: native generate start observed, HOME for eight seconds, return; one real accepted moon reply, ready state, no runtime errors. | PASS Motorola |
| G: recovery after cancellation | Reload and complete generation; accepted useful reply preferred. | Model reloaded; two native butterfly generations completed and UI returned to ready. Both replies rejected by existing quality guard, with an honest notice. Accepted post-cancel reply on final run not obtained. | PASS native lifecycle; FAIL accepted-response quality |
| G: initialization failure / native 120-second generation timeout | Bounded error and recoverable state. | Mock lifecycle/deadline/retry/late-callback tests passed. Actual corrupted-model initialization or native hard timeout was not induced. | PASS automated; NOT TESTED physical |
| G: AI/scripted mode switching | Unload appropriately and label scripted replies correctly. | Browser switching/persistence tests passed; separate final physical mode-switch sequence not completed. | PASS automated; NOT TESTED physical |
| G: memory-pressure recovery | No corruption or permanent hang. | Real AI memory measured; no deliberate low-memory kill/stress test. | NOT TESTED physical recovery |
| H: actual scheduled daily/check-in/challenge warning | Native alarms post while backgrounded/locked. | Isolated Android test scheduled IDs 9101/9102/9103, went HOME and screen-off, observed all three at approximately 22:56 IST against 22:55 schedule. | PASS Motorola |
| H: duplicate, quiet hours and opt-out | Stable IDs, no unwanted re-delivery, nothing posted when blocked. | Physical isolated native duplicate checks preserved post time; all-day quiet and disabled scheduling produced zero schedules/no delivery. JVM/browser preferences and quiet-hour boundary tests passed. | PASS |
| H: notification species/personality/name | Existing local cat/dog/persona variants and pet-name substitution. | Notification-copy suite checks cat/dog × five personalities and existing categories. Physical scheduler used QA Cat/mischievous. No new actual Tashu test notification was posted in this checkpoint. | PASS automated + partial Motorola |
| H: physical Android permission revocation/regrant and post-restart delivery | Preferences survive settings changes/restart. | No Android settings revocation or reboot delivery scenario performed. | NOT TESTED physical |
| H: prolonged deep Doze | Delivery timing measured, no force-stop substitute. | Scheduled test used HOME/screen-off with instrumentation alive; not a prolonged deep-Doze proof. No force-stop used during scheduled delivery. | NOT TESTED prolonged Doze |
| I: optional challenge | OFF by default; opt-in, pause/grace/missed days/departure/day/timezone rules correct. | Pure/browser isolated fixtures passed enable/disable/pause, one/two missed days, warnings, archive/departure, rollover/back-clock/timezone and restart. Tashu challenge remained OFF. | PASS automated |
| I: actual multi-day physical challenge | Same rules through real multi-day device operation. | No real two-day or timezone-changing device run. | NOT TESTED physical |
| J: cold/warm launch, navigation, upgrade, process recreation, offline | No blank screen/data loss; usable state. | Final main post-upgrade cold launch succeeded; repeated foreground launches succeeded; isolated QA process recreation preserved outing/photo. Offline native chat and normal navigation worked. | PASS observed Motorola cases |
| J: physical rotation, gesture/insets, keyboard opening/closing | No major overflow or navigation breakage. | Browser responsive/mobile/keyboard simulations passed. Physical wardrobe had no horizontal overflow; full rotation/keyboard/gesture/insets visual checklist not completed. | PASS automated; NOT TESTED full physical checklist |
| J: crashes/errors | No unhandled error or critical data loss during observed checks. | Captured successful AI/background/recovery runs report empty runtime-error arrays; no critical crash/data loss observed. This is not exhaustive crash coverage. | PASS observed checks |
| K: performance | Record actual measurements without removing features. | APK, cold launch, AI initialization/generation and main AI memory measured below; no formal frame-rate benchmark. | PASS measurements; animation benchmark NOT TESTED |

## Native inference observations and remaining quality issue

Native metrics below came from `PetInference` results, not merely text rendered in Talk. Airplane-mode evidence exists for the initial prompt set and final background/cancellation sequence. Final shoes generation was captured before airplane mode was explicitly enabled again and is therefore not separately claimed as an airplane-mode test.

| Request | Actual result | Timing |
|---|---|---|
| Initial model load | Ready, native model initialized. | Native load 2,047 ms; UI wait 2,217 ms. |
| Initial shoes | Accepted real native reply; one generate call. | First token 7,307 ms; generation 8,501 ms; UI 8,670 ms. |
| Initial giant butterfly | Accepted real native reply; one generate call. | First token 8,136 ms; generation 9,305 ms; UI 9,379 ms. |
| Initial moon | Accepted real native reply; one generate call. | First token 22,043 ms; generation 24,984 ms; UI 25,640 ms. |
| Human-name / last-adventure facts | Deterministic saved-data answers, zero inference calls. | Approximately 206 / 203 ms. |
| Earlier cancellation recovery request | Ready model but game-state read timed out before inference; no reply substituted. | Approximately 12 seconds UI; zero generate calls. |
| Final model load | Ready. | Native load 1,862 ms; UI wait 1,944 ms. |
| Final shoes, rapid double submission | One accepted user/reply pair. First draft claimed an unsupported breed and was rejected; existing retry generated accepted reply. | Two generations 25,958 and 17,304 ms; total UI 43,400 ms. |
| Final moon with HOME/return, airplane mode | Accepted exact native generated text; ready, no errors. | First token 19,538 ms; generation 28,230 ms; UI 28,357 ms. |
| Final cancellation | Actual generate cancelled, then unloaded; thinking false. | Cancellation observed after 1,550 ms; unload 351 ms. |
| Final post-cancel butterfly | Reloaded native model generated two drafts; both rejected by quality rules; no scripted substitute, state ready. | Generations 13,606 and 7,697 ms; UI 21,449 ms. |

Across the seven completed creative UI requests recorded here (excluding deliberately cancelled requests), five produced accepted replies, one failed before inference on a game-state read timeout, and one exhausted quality retries. This is an exploratory smoke-test count across build stages, not a controlled success-rate benchmark. Native instrumentation separately demonstrated a genuine nonce-prompt response with the bundled model in a test app lacking INTERNET permission.

The final butterfly rejection is reproducible evidence of an unresolved quality limitation: both drafts repeat the hypothetical phrase “we found”, and the unchanged `unsupported-history` regular expression treats that phrase as a history assertion even inside “if we found”. This explains a guard rejection, not a native engine crash. No prompt/guard/model changes were made after the user's wrap-up instruction. A separate follow-up should determine the smallest safe correction and reverify hypothetical versus invented-history handling.

The earlier game-state read timeout is logged honestly. The exact original I/O cause was not proven. The final change removes added native clock sampling/writes from ordinary fact reads; later final-build requests reached inference. That does not prove the original timeout can never recur.

Evidence: `device-ai-initialization.json`, `device-ai-shoes.json`, `device-ai-butterfly.json`, `device-ai-moon.json`, `device-ai-facts.json`, `device-ai-cancellation.json`, `device-ai-cancel-recovery.json`, `device-ai-recovered-shoes.json`, `final-ai-initialization.json`, `final-ai-shoes.json`, `final-ai-background.json`, `final-ai-background-control.json`, `final-ai-airplane.txt`, `final-ai-cancel-recovery.json`, and `final-device-log.log`.

## Device/performance evidence

- Final main post-upgrade cold launch: Android `am start -W`, **TotalTime 2,114 ms**, WaitTime 2,167 ms. Isolated QA photo-persistence restart: cold launch TotalTime **1,117 ms**. These are observed launch samples, not statistical startup benchmarks.
- Main app with AI loaded: total PSS **938,337 KiB** (~916.3 MiB), total RSS **1,029,212 KiB** (~1,005.1 MiB), swap PSS **27,370 KiB**. High model memory is measured, but an induced low-memory recovery test was not completed.
- Inference is non-streaming at the UI: native first-token time and total displayed-reply time are different measurements. Accepted replies ranged from ~8.7 to ~43.4 seconds in these samples, including retries. No architecture or model optimization attempted.
- Actual reminder delivery: daily at epoch 1791739560000 (**60,000 ms** late), check-in 1791739560042 (**60,042 ms** late), challenge 1791739560023 (**60,023 ms** late). All approximately **22:56:00 IST** on 11 October, for a **22:55:00 IST** schedule. These are observed inexact-alarm delays; they do not establish prolonged deep-Doze performance.
- QA photo: saved record hash `8197aedd9f98d04843394c7725793bd9300aab6e12663bfa9441eb910c8a753f`; photo hash `6d9525337fb56623fc4ac6ce3dee2aff3db884a4c6bfeb9725a911e96f4539cc`. Both identical before/after QA restart. Scrapbook displayed the caption and loaded image.
- Several CDP attempts failed because the target was backgrounded/locked or the debugger connection was unavailable. Empty JSON/error artifacts are not counted as successful app checks or native inference failures. Foreground/wake and current process forwarding resolved those measurement failures.
- The initial scheduled-delivery test assertion also examined unrelated notification IDs and threw after actual notifications arrived. Only the assertion was corrected; the test then passed. Production reminder scheduling code was unchanged.

## Release gate and pending manual/device checks

**Not release-ready.** There was no critical crash or saved-data loss in completed checks, but incomplete critical recovery coverage and the final accepted-response quality failure prevent an unqualified release declaration.

| Critical requirement | Current evidence / gate |
|---|---|
| App launches on Motorola | PASS |
| Existing save survives upgrade | PASS, strict saved-record and blob fingerprints |
| Adoption and pet interactions | PASS automated; physical cat PASS, physical dog/onboarding pending |
| Adventure timing/rewards and GPS-free walks | PASS automated + physical elapsed/reward/persistence; physical reboot/clock mutation pending |
| Camera/scrapbook | PASS physical capture/save/caption/restart; actual second retake and native failure cases pending |
| Nearby discovery handles failures | PASS automated; new live Motorola query/504 recheck NOT TESTED |
| Real native offline replies | PASS, native results and airplane-mode evidence |
| AI failure states recover | Cancellation/unload/reinitialization/native generation PASS; accepted post-cancel reply failed quality checks; physical hard timeout/init failure NOT TESTED |
| Scheduled notifications | PASS isolated physical daily/check-in/challenge alarms |
| Quiet hours and opt-out | PASS isolated native + JVM/browser; actual settings revocation/reboot/deep Doze pending |
| Optional challenge | PASS isolated automated; real multi-day physical run NOT TESTED |
| No critical crashes/data loss | None observed; physical low-memory and storage-pressure coverage incomplete |
| Automated tests | PASS final suites |
| Android APK | PASS built and installed |

Pending checks for a later authorized session, not started during wrap-up:

1. Correct/reverify hypothetical AI quality rejection without allowing invented saved history; obtain an accepted reply after cancellation. Investigate any reproducible game-state read timeout using native/browser logs. Exercise actual initialization failure, native hard timeout and physical AI/scripted switching.
2. Live nearby query on Motorola with restored connectivity; report actual service response honestly. Exercise Android location revocation/regrant, services disabled and retry while preserving settings.
3. Physical isolated dog/onboarding checks; restart during interaction; wardrobe removal and post-equip restart.
4. Actual second camera capture/retake acceptance and native unavailable-camera/storage-pressure cases. Existing user photos must remain untouched.
5. Rotation, physical keyboard open/close, gesture navigation and insets review; deliberate low-memory process recovery; device reboot during an active test outing.
6. Notification delivery after normal app restart/reboot, permission revocation/regrant and prolonged Doze; real multi-day optional challenge only on isolated QA data.

Human camera steps already completed were: point at a neutral object, capture, confirm Use photo/checkmark, and confirm the preview is visible. No further human actions are requested in this checkpoint. The application was not uninstalled, existing saved data was not deleted, and no publication or release preparation was performed.
