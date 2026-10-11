# Checkpoint 9D.1 — Android device bug fixes

Date: 2026-10-11 (Asia/Calcutta). Scope stops at 9D.1; no UI redesign.

**Implementation, APK verification, and the core Motorola smoke tests are complete. Nearby result retrieval is blocked by an observed Overpass HTTP 504 response; extended denial/lifecycle/gameplay tests remain NOT TESTED.** Motorola `ZA223L2CPH` (motorola edge 70 fusion, Android API 36, arm64-v8a) was connected after the initial host checks. Both APK upgrades used `adb install -r` and succeeded. The original install date was retained. No app/launcher storage was cleared and no app was uninstalled. Airplane mode was temporarily enabled for AI testing and restored; Wi-Fi was initially off and remains off. There is no `.git` repository in this workspace, so changes are saved in place and cannot be committed here.

## Bug 4 — official launcher icon

**Root cause:** Android still referenced the generated Capacitor launcher artwork. Both manifest icon entries correctly referred to launcher resources, but those resources were placeholders.

**Source:** The supplied file actually present was `assets/outside-or-else-logo.png.jpg`, a 960×960 JPEG. It was decoded and saved as `assets/outside-or-else-logo.png` without recoloring or redrawing. The original JPEG is retained. The generation script uses the PNG at the requested path on subsequent runs.

**Fix:** `scripts/generate-android-icons.py` extracts the existing blue logo tile at source rectangle `(190,190,770,770)`, removes its surrounding white presentation margin/shadow, and masks only the tile's rounded exterior corners. The cat pixels, stripes, eyes, visible mouth, colors, and expression are retained. No generated replacement artwork was used.

- Legacy and round icons: mdpi 48px, hdpi 72px, xhdpi 96px, xxhdpi 144px, xxxhdpi 192px.
- Adaptive foregrounds: 108px, 162px, 216px, 324px, 432px respectively.
- Adaptive layer canvas is 108dp. The complete tile occupies a centered 46dp square, whose 65.05dp diagonal fits within the guaranteed central 66dp safe circle. Background uses a blue sampled from the supplied logo, `#A6D6E2`.
- Both `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` select the generated foreground and blue background. Manifest already points to these resources.
- Removed unused template `drawable/ic_launcher_background.xml` and `drawable-v24/ic_launcher_foreground.xml` to eliminate leftover launcher artwork.
- Color artwork is used for adaptive icons. No optional monochrome layer was invented; OEM themed-icon settings may still change launcher colors and should be disabled for the color acceptance test.

**Files changed:** PNG source copy; all fifteen PNG resources under `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}`; `res/values/ic_launcher_background.xml`; the generator script and preview artifacts. Existing adaptive XML and manifest icon references were inspected and retained.

**Tests / actual results:** PASS: dimensions, exact equality of all fifteen generated PNGs with their packaged APK entries, both adaptive XML entries packaged, launcher/application references resolved by `aapt2 dump badging`. PASS: visual inspection of circle, squircle and rounded-square mask previews; the expression remains visible. PASS: the actual Motorola launcher displays the supplied orange cat and light-blue background after the upgrade; screenshot `artifacts/checkpoint-9d1/device-launcher.png`. No cache reset was needed.

Preview: `artifacts/checkpoint-9d1/icon-mask-preview.png`. Reproduce: `python scripts/generate-android-icons.py`. Provenance and source SHA-256: `artifacts/checkpoint-9d1/icon-generation.json`.

## Bug 1 — location permission / GPS

**Root cause:** `src/lib/location.ts` exclusively used browser geolocation, and the Android manifest declared no location permission. A browser call could not establish the required native foreground permission flow.

**Fix:** Added and registered `PetLocationPlugin`, requesting only `ACCESS_COARSE_LOCATION` when an existing user location button is tapped. Native provider updates have a 15-second timeout, remove listeners on completion/destruction, and report disabled services, no available provider, denial, blocked permission and timeout. Android uses the native plugin; browsers retain their existing path. A denied/blocked result offers an explicit Android app-settings button in Appearance and Nearby. Retrying repeats the native permission/provider checks. Pre-Android-12 devices use providers compatible with coarse permission rather than requesting fine location.

Existing two-decimal rounding happens before persistence or Nearby requests. Location used for lighting stays local. Only a user-initiated Nearby search sends rounded coordinates to the existing Overpass service. Cached coordinates are not silently substituted after a failed fresh search. GPS-free adventures remain available. No precise/background permission or automatic startup request was added.

**Additional device fix:** the initial WebView GET request to Overpass failed with `MissingAllowOriginHeader`; a native GET probe exposed HTTP 406. A native form-encoded POST to the same documented interpreter endpoint returned HTTP 200 for a small diagnostic query. Android Nearby now uses CapacitorHttp POST with an honest app User-Agent, preserving the same endpoint, query semantics, rounded coordinates, request cooldown, cache and overall 25-second UI timeout. Native requests have 5-second connect and 20-second read timeouts; late native results cannot overwrite a timed-out search. Browser routing is retained. The final full area query returned HTTP 504 with a server-busy message. This is recorded as a live external-service failure, not a successful place search. No alternate provider or proxy was added.

**Files changed:** `PetLocationPlugin.java`, `MainActivity.java`, `AndroidManifest.xml`, `src/native/platform.ts`, `src/lib/location.ts`, `src/lib/nearby.ts`, `AppearanceSettings.tsx`, `NearbyAdventures.tsx`.

**Tests / actual results:** PASS: native routing, no startup request, rounding, storage failure, denied/blocked/settings/service-disabled/timeout/unavailable behavior, retry and rejection of stale-location substitution in mocked native regression. PASS: Android compilation and browser solar/nearby regressions. PASS: native coarse permission changed from denied/not-yet-granted to granted after the location action; a fresh fix was obtained and saved with two-decimal rounding. The OS prompt was not captured before it was dismissed, so its exact visual layout is NOT TESTED. PASS: the final installed app obtains a fresh location and invokes the native place request. FAIL (external service): a full Nearby query returned HTTP 504 / server busy, with an actionable error instead of invented places. NOT TESTED: physical denial/permanent denial, disabled services and timeout scenarios. Nearby requires network access to its external place-data service. Evidence: `device-package-state.txt`, `device-nearby-result.json`, `device-overpass-probe.json`, `device-native-overpass-post-probe.json`, `device-native-nearby-probe.json`.

## Bug 2 — adventure camera

**Root cause:** The app relied on an HTML capture input. Capacitor's installed WebChromeClient resolves an `ACTION_IMAGE_CAPTURE` activity before opening it, but the manifest had no camera-intent package-visibility query. This can cause a false unavailable result and fallback to a file picker on recent Android versions. Physical reproduction is unavailable.

**Fix:** Added and registered `PetCameraPlugin`, using the system camera activity with a cache file, FileProvider output URI, ClipData and temporary read/write grants. Added the capture-intent query and optional camera hardware declaration. No CAMERA or shared-storage permission is requested because the app delegates capture to a camera application.

Camera decoding/compression runs on a background executor. The decoder subsamples before allocating a bitmap, bounds the maximum dimension to 1600px, applies all EXIF orientation variants, and strips metadata when writing JPEG. Empty/corrupt results, unavailable camera, cancellation and low memory return actionable results. Raw capture files are deleted after handling the result. Capacitor activity callbacks and existing activity configuration handling cover normal camera return and rotation; process-death behavior still requires physical testing.

The returned local File enters the existing photo preparation, preview, attach, caption and scrapbook persistence flow. Camera cancellation leaves the existing draft intact. Retake uses the same camera button; replacement is attached only after a successful capture. Gallery remains available. No photo is uploaded and reward/caption/persistence rules were not changed.

**Files changed:** `PetCameraPlugin.java`, `MainActivity.java`, `AndroidManifest.xml`, `src/native/platform.ts`, `src/native/camera.ts`, `PhotoMemoryComposer.tsx`.

**Tests / actual results:** PASS: mocked cancellation, unavailable camera, malformed result, base64-to-local-File conversion; native compilation; existing photo/journey regressions. PASS: the app launched `com.motorola.camera5` through its native capture activity. The user captured and saved a real test photo; the app displayed it locally. PASS: after a force-stop/cold launch, both scrapbook images loaded and both photo byte hashes, memory metadata/captions, and the complete saved-profile hash matched before restart. These same hashes also matched after the final APK upgrade. The captured JPEG is 768x1024, 115,491 bytes, and the manual test memory awarded zero love. The user left its caption blank; existing captions were preserved. NOT TESTED: every EXIF orientation, direct-camera denial (no app CAMERA permission is used), camera process death, retake/cancel, and long background transitions. Evidence: `device-camera.xml`, `device-memory-persistence.json`, `device-memory-before-restart.json`, `device-memory-after-restart.json`, `device-memory-after-final-upgrade.json`, `device-scrapbook-after-restart.png`.

## Bug 3 — native AI stuck thinking

**Evidence:** The supplied `android-ai-debug.log` shows a PetInference unload request at 20:06:43.960 and a generate rejection at 20:06:44.362: `Companion brain could not read the conversation.` The log lacks the earlier initialization/prefill events needed to establish the entire stall sequence. Filtered evidence is retained in `artifacts/checkpoint-9d1/prior-inference-evidence.txt`. It does not establish a JNI crash, missing model, OOM or CPU instruction failure.

**Confirmed code/build defects:**

1. Gradle's debug native build compiled llama.cpp and ggml CPU math with debug symbols and no optimization flag (effective O0). The app is tested/installed as a debug APK. This is a concrete performance defect and a likely contributor to slow prefill; its contribution to the Motorola stall remains an inference until device retesting.
2. The native decoder had token limits but no wall-clock deadline. JS could stop waiting while native work remained in flight.
3. Native load/generate reset the cancellation flag after entry, leaving a race where an already requested cancellation could be cleared.
4. `BrainSession.fail` rejected the pending UI promise with an error classification such as `timeout`, discarding the actionable original error text.

**Fix:** Enable `-O3` for the native Debug configuration before adding llama.cpp; retain debug symbols and baseline Android ABI settings. Generated build flags verify optimization on the inference engine and CPU math. Add a 120-second native operation deadline, checked by the decode abort callback and generation/prefill loops. Separate cancellation preparation from load/generate and check the Java epoch after preparation so cancellation is not reset after the operation starts. Destruction increments the epoch. The native transport's 260-second outer deadline accommodates the existing maximum two bounded 120-second validation attempts; browser deadlines are unchanged. Pending UI promises now receive the original actionable error message, and stale replies cannot revive a failed session.

Add `NativeAI` logs for loading, ready, prefill token counts, completion metrics and failure class. No prompt/response/photo/coordinate payload is logged by these diagnostics. Disable Capacitor payload logging (`loggingBehavior: 'none'`), which otherwise prints method arguments. Existing Talk loading/ready/generating/failed/cancel/retry controls remain in place.

The genuine llama.cpp/Qwen3 path is preserved: one serialized executor/context, mmap loading from a verified private copy, 2048-token context, 128-token batches, at most four CPU threads, 1024 input tokens, 72 output tokens per attempt, exact pinned non-thinking template and existing game-fact/validation isolation. No cloud API, scripted AI substitute or model download was introduced.

**Files changed:** `CMakeLists.txt`, `pet_inference.cpp`, `PetInferencePlugin.java`, `src/ai/brainSession.ts`, `src/ai/nativeTransport.ts`, `capacitor.config.ts`, `OfflineInferenceTest.java` (prepare cancellation/deadline before direct JNI calls).

**Tests / actual results:** PASS: optimized native compilation, transport/shared-session regressions, deadline rejection/error message/late-result protection/recovery with mocked transport, pinned model integrity/template verification, complete model and arm64 library packaging. PASS: actual bundled initialization reached Ready in approximately 2.16 seconds during this run. With airplane mode ON and Wi-Fi OFF, `Why do you hate my shoes?` produced an accepted newly generated Qwen response: 415 input tokens, 69 output tokens, 11,195ms for prefill plus generation. The butterfly question initially generated two drafts (63 and 21 tokens) that were rejected by the existing validation rules. The UI stopped thinking and clearly withheld them. A manual retry of the same question produced an accepted newly generated response (419 input tokens, 22 output tokens, 8,701ms): "I'd try to mimic a butterfly, but since I'm a cat, I'd rather be a cat." No validator or personality rule was weakened. The two accepted replies were observed in the actual Talk UI and matched genuine native decoder completion events. The original infinite-thinking issue was not reproduced in these completed operations. Performance numbers are observations from this device/session, not guarantees. NOT TESTED: low memory, thermal throttling, cancellation latency, or prolonged/repeated session stability. Evidence: `device-native-ai.log`, `device-ai-validation.json`, `device-ai-ui.json`, `device-ai-offline.png`, `device-offline-state.json`.

## Build and automated evidence

- PASS: `npm run build` (TypeScript and Vite), `npm run lint`.
- PASS: all 16 code suites listed in `artifacts/checkpoint-9d1/regression-code.json`, including new `android-9d1-check.cjs` and existing native-template/critical-systems suites.
- PASS: all nine existing browser integration suites: onboarding, scenes, context-dialogue, pets, journey, challenge, ai, ai-9c and notifications. Exact results: `artifacts/checkpoint-9d1/regression-browser.json`. These UI suites ran before the subsequent Android-only HTTP follow-up; after that follow-up all 16 code suites, TypeScript, lint, main APK assembly and offline verification APK/test APK assembly were rerun successfully. No UI source changed in the HTTP follow-up. AI transport fixtures are synthetic and do not demonstrate real generation. Initial sandbox CDP timeouts are retained separately; all nine suites passed when rerun with required access.
- PASS: standalone JVM reminder-rule regression and Gradle `testDebugUnitTest`.
- PASS: Gradle `assembleDebug`; build output: `artifacts/checkpoint-9d1/build.log`.
- PASS: `assembleOfflineVerify assembleOfflineVerifyAndroidTest -PofflineVerification`; outputs: `artifacts/checkpoint-9d1/verification-build.log` and final `verification-build-final.log`. Instrumentation compiled but was NOT TESTED on Android.
- PASS: isolated offline-verification APK has no INTERNET permission (`offline-permissions.txt`). This demonstrates packaging isolation, not observed generation.
- PASS: complete 484,220,320-byte uncompressed GGUF has SHA-256 `9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14`; all six required arm64 libraries and model license are packaged. See `model-apk-inspection.json` and `model-inspection.json`.

Updated debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 509,833,715 bytes. SHA-256: `d3d14dc016886b6b604b7f825782d02b093f6e37b7e1c0f742939f9c9dd865c1`. Icon/APK verification: `artifacts/checkpoint-9d1/apk-inspection.json`. The installed Motorola `base.apk` SHA-256 exactly matches this final local APK (`device-final-install.json`). The temporary ADB WebView test forwarding was removed after verification.

The initial sandbox build failed because the installed NDK compiler and a Gradle report file were inaccessible. Rerunning with approved SDK access completed successfully. Those environment failures were not ignored or reported as code successes.

## Observed device acceptance

| Criterion | Result | Evidence / scope |
|---|---|---|
| Location foreground permission | PASS | Coarse permission granted after location action; separate denial cases NOT TESTED |
| Current location after permission | PASS | Fresh native fix, rounded persisted coordinates |
| Nearby service results | FAIL - external service | Native request reaches Overpass; full query returns HTTP 504/server busy |
| Camera capture | PASS | Actual Motorola camera opened; user captured photo |
| Photo persistence | PASS | Real JPEG and both memory/photo hashes retained after cold restart and final upgrade |
| Genuine native AI replies | PASS with retry | Both requested questions accepted offline; butterfly first submission was withheld, retry accepted |
| AI without internet | PASS | Airplane ON, Wi-Fi OFF during both questions |
| No infinite thinking / crash | PASS for observed operations | All generation attempts finished; rejected drafts surfaced as honest errors |
| Correct launcher icon | PASS | Actual Motorola launcher screenshot |
| Existing gameplay | PASS host regressions / partial device smoke | Existing pet/settings/scrapbook retained; navigation and Talk worked. Full native adventure/reward/challenge lifecycle NOT TESTED |
| Automated tests / updated APK | PASS | 16 code suites, 9 prior browser UI suites, lint, TypeScript, Gradle/JVM tests and APK inspections |

The source and installed final APK include all fixes. Full checkpoint sign-off remains limited by external Nearby availability and the unexecuted extended physical test matrix; these are not silently marked PASS.

## Repeatable Motorola tests / remaining work

Connect and authorize Motorola `ZA223L2CPH` with USB debugging. From the project directory in PowerShell:

```powershell
$adb = 'C:/Users/Saksham/AppData/Local/Android/Sdk/platform-tools/adb.exe'
& $adb devices -l
& $adb -s ZA223L2CPH install -r android/app/build/outputs/apk/debug/app-debug.apk
& $adb -s ZA223L2CPH shell am start -n com.outsideorelse.game/.MainActivity
```

Use the same signing key. If Android rejects the upgrade signature, stop and investigate; do not uninstall or clear data.

1. **Icon: PASS; repeat if needed.** Inspect app drawer and home shortcut. Confirm the orange cat, blue background and annoyed eyes. Disable themed icons to inspect the original colors. If the launcher caches the old icon, remove/re-add only the home shortcut or reboot the phone. Do not clear launcher/app storage or uninstall.
2. **Location: PASS for grant and fix; denial/service failures NOT TESTED.** In Settings choose Dynamic appearance, tap Improve/Refresh location, allow approximate location, and check success or a specific actionable provider error. Deny and retry; for blocked permission use Open Android app settings. Disable phone Location to verify the service-disabled error, then re-enable and retry. Retry Sniff near me when Overpass recovers; its current full query returned HTTP 504. Also verify GPS-free adventures.
3. **Camera capture/persistence: PASS; extended transitions NOT TESTED.** Open an adventure photo draft, tap camera, capture, return, inspect preview, retake, cancel a later retake, add caption and save. Restart the app and confirm the real photo/caption in Scrapbook. Repeat with rotation and background/foreground transition. Confirm prior drafts are retained on cancellation/failure.
4. **AI: PASS offline, with manual retry for the second question.** Turn on airplane mode and turn Wi-Fi off. Open Talk, select AI chat, wake the bundled brain, send `Why do you hate my shoes?`, then `What would you do if we found a giant butterfly?`. Observe two accepted genuinely generated replies or report the actual error. Verify cancel/retry and no crash/infinite spinner. Check initialization, prefill progress and completion logs using the command below. Recorded timings are session observations, not speed guarantees.
5. **Save retention: PASS for observed profile/pet/settings and both records/photos; full native gameplay NOT TESTED.** Confirm the prior adopted pet, progression, memories, wardrobe, challenge and reminder preferences survived the upgrade. Exercise a normal GPS-free adventure and verify existing reward caps.

```powershell
& $adb -s ZA223L2CPH logcat -v time 'NativeAI:I' 'AndroidRuntime:E' '*:S'
```

Remaining work: repeat Nearby when Overpass recovers from the observed HTTP 504/server-busy condition, then complete physical denial/permanent-denial, disabled location, camera retake/cancel/process-death/rotation, inference cancellation/low-memory, and complete adventure/reward/challenge lifecycle tests. No source-level blocker remains for icon replacement, current-location retrieval, native camera capture/photo persistence, or genuine offline generation in the observed smoke tests.

## References

- [Android adaptive icon safe area](https://developer.android.com/codelabs/basic-android-kotlin-compose-training-change-app-icon).
- [Capacitor Android permission/activity callbacks](https://next.capacitorjs.com/docs/plugins/android).
- [Android LocationManager](https://developer.android.com/reference/android/location/LocationManager).
- [Official Overpass POST interface](https://github.com/drolbr/Overpass-API/blob/master/src/html/command_line.html).

Installed Capacitor and pinned llama.cpp source were inspected directly for implementation details.
