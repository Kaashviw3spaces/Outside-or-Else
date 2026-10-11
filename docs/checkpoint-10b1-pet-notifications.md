# Checkpoint 10B.1 — chaotic pet notifications

Notification content is centralized in lightweight local Java templates. The existing **daily, check-in, challenge warning and manual test** categories each have five variants for cats and dogs across all five saved personalities: playful, sleepy, curious, shy and mischievous. No new notification categories were added.

Titles use the saved pet name and one species/personality emoji. Bodies combine category-specific text with the pet’s voice. Shy pets ask gently, sleepy pets supervise pillows, curious pets question shoes, playful pets demand wiggles, and mischievous pets claim ownership of the human. Challenge messages retain clear instructions to complete and save a photo adventure today. Check-ins mention a saved adventure only when the existing completion flag belongs to today. Templates never claim verified outdoor activity, absent humans, invented nap counts or a nonexistent 20-minute warning.

Automatic copy selection is deterministic for pet, species, personality, category and local day; rescheduling does not advance it. Manual tests rotate using a small native copy-only counter advanced after a successful notification post. That counter is separate from reminder preferences and game data. No network requests or background AI inference are involved.

Changed files:

- Added `android/app/src/main/java/com/outsideorelse/game/ReminderCopy.java` and `android/app/src/test/java/com/outsideorelse/game/ReminderCopyTest.java`.
- Updated `ReminderScheduler.java` only at displayed-copy selection and the manual-test copy counter. Scheduling, category gates, quiet hours, permission gates, delivery keys, IDs, cancellation, channel configuration, BigText style and tap behavior are preserved.
- Updated `src/notifications/service.ts` to include the saved personality in the existing native snapshot. Existing synchronization refreshes pending reminders without sending migration notifications; alarm bodies are selected at delivery, not stored in alarms.
- Added `scripts/notifications-10b1-check.cjs`, `scripts/run-10b1-browser-regressions.py`, and `scripts/device-10b1-evaluate.cjs` for verification. The existing typography test now accepts an artifact directory, so its evidence stays with this checkpoint. Evidence is in `artifacts/checkpoint-10b1/`.

Validation:

- TypeScript/production web build and lint: **PASS**.
- All 16 existing code suites plus the new notification preservation/metadata suite: **PASS**.
- Android unit tests, including the new copy matrix and state tests: **PASS**. They check five distinct, stable variants per species/personality/category, saved names, distinct voices, truthful completion context, readable lengths, legacy defaults and manual rotation.
- Standalone JVM reminder rules: **PASS**, including stable IDs, quiet-hour boundaries, DST, challenge gates and duplicate delivery rules.
- All **9 existing browser suites** and **62 existing typography checks**: **PASS**. No detected clipping, horizontal overflow, unexpected font changes or fixture-save mutations in the tested configurations.
- **160 existing source/resource files** match baseline hashes. The only existing production files changed are the scheduler’s content sites and notification snapshot metadata. Fonts, UI, app name, launcher icon, native AI, camera/GPS, gameplay/save code, reminder rules, receiver and permission plugin are unchanged.
- Debug Android build: **BUILD SUCCESSFUL**. APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 509,834,107 bytes. SHA-256: `0af90723febf066d34564a3b750519dd9e60047347d6d2812e70291dc23fec98`.

Motorola `ZA223L2CPH` was updated with `adb install -r`, without uninstalling or clearing data. The installed APK hash matches the build. Android’s actual notification record confirms one manual test notification (ID 9104):

> **Tashu 😼**
>
> Test received. phone makes noise. loaf claims credit. mrrp. i own human. paperwork imaginary.

The saved pet is a mischievous cat; preview body and expanded BigText match. Scheduled reminder count remained **1** before and after the test. Existing preferences stayed at 19:55, with quiet hours 23:00–08:00 and the same toggles. Both original memory records and photo blobs retain identical hashes. An early full-profile hash changed during the live phone session; a controlled upgrade comparison was repeated and confirmed identical profile, memory and photo hashes. No earlier profile snapshot was restored over the current save.

Limitations: physical verification covered a manual test for the actual saved cat. Automatic scheduled delivery and physical dog/personality combinations were not tested; those copy combinations are covered by unit tests. Notification shade UI extraction did not return the app’s text, so device content verification relies on Android’s active notification record rather than a visual-truncation claim. No native AI model was awakened for notifications. Temporary ADB forwarding was removed.
