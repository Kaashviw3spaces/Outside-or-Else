# Checkpoint 7: outdoor adventures and photo memories

Free Walk and discovered OSM destinations now support start, resume, return, a local photo/caption draft, a saved scrapbook entry, affection rewards, and accessory milestones. No dependencies, backend, AI verification, automatic location requests, or photo uploads were added. Existing pet artwork and theme logic are unchanged.

## Safe checkpoint

The workspace is not a Git repository. Before edits, a source-only ZIP was created at `.checkpoints/before-checkpoint-7-20261010-210743.zip`. It excludes dependencies, build output, browser artifacts, and secrets.

## Files

Created:

- `src/journey/types.ts`: outing, destination, pet snapshot, photo and future outdoor metadata.
- `src/journey/database.ts`: native IndexedDB connection, transactions, storage errors.
- `src/journey/service.ts`: serialized outing/draft/photo/memory operations and reward recovery.
- `src/journey/photos.ts`: browser image decoding and local JPEG conversion.
- `src/journey/rewards.ts`: local calendar days, timestamp timing and capped rewards.
- `src/journey/profileProgress.ts`: preserve progress when stale preferences or wardrobe drafts are saved.
- `src/journey/useJourney.ts`: reactive database reads and cross-tab/focus refresh.
- `src/components/OutdoorScene.tsx`: themed outdoor SVG environment using the existing actual pet.
- `src/components/PhotoMemoryComposer.tsx`: explicit camera/gallery inputs, caption, preview and recoverable saves.
- `src/components/MemoryPhoto.tsx`: blob URLs with cleanup and missing/corrupt photo notices.
- `src/styles/journey.css`: responsive, themed outing/scrapbook/dialog styles.
- `scripts/journey-check.cjs`, `scripts/journey-browser-check.cjs`: pure logic and native Chrome/IndexedDB regressions.
- This report.

Modified:

- `src/App.tsx`: resume unfinished outings after opening; react to earned progress; preserve rewards when saving preferences.
- `src/screens/Adventure.tsx`: complete outing loop, timer, cancellation and return/photo flow.
- `src/screens/Memories.tsx`: multiple entries, details, manual drafts, deletion and empty/error states.
- `src/components/NearbyAdventures.tsx`: select existing discovered place cards as outing destinations.
- `src/components/Wardrobe.tsx`: explain the implemented eligibility/counting rules.
- `src/types/game.ts`: optional progress metadata, preserving the existing save version.
- `src/index.css`: import the scoped journey stylesheet.
- `scripts/checkpoint-check.cjs`: expect the actual initial scrapbook loading state instead of the former static placeholder.
- `README.md`: current checkpoint link and updated feature status.

## State and persistence

The IndexedDB database `outside-or-else:journey-v1` has `outings`, `memories`, `photos`, and `meta` stores. A single active pointer covers both active and returned-but-unfinished outings. Serialized read/write transactions prevent duplicate starts and completion commits. Manual memory drafts have a separate pointer and do not block an outing.

Outings retain stable IDs, immutable pet identity/appearance snapshots, planned duration, start/return timestamps, actual elapsed time, destination, completion status and reward status. Pet name is recorded at completion. The screen recomputes elapsed time from timestamps; its one-second display timer is not the source of truth. Refreshing, closing/reopening the tab and backgrounding do not reset the outing. Early returns and cancellation are explicit options.

Completing a memory updates the ledger and scrapbook and clears the active pointer in one transaction. The existing localStorage pet save remains version 1. It mirrors earned progress after the database commit; an applied-reward counter makes failed mirror writes recoverable without rewarding the same completion twice. Preference and wardrobe saves merge the latest stored and session progress. Existing saves with no new outings are not automatically rewritten.

Deleting a memory removes its image blob and scrapbook entry, and clears caption/destination from its minimal completion ledger. A reward/milestone tombstone remains to prevent re-awarding and to retain earned accessories. Cancelled drafts lose their photos, caption and destination and earn nothing.

## Photos and privacy

“Take a photo” uses an explicitly activated `accept="image/*" capture="environment"` file input; the gallery input omits capture. No camera API or permission request runs on page load. Images are decoded locally, resized to a maximum 1600-pixel side, and re-encoded as JPEG at quality 0.82. Re-encoding removes original EXIF/GPS metadata. Photos are Blob records in IndexedDB, never base64 images in localStorage.

Files over 30 MB, extreme dimensions, unsupported formats, SVG and unreadable images receive visible errors. Browser-native decoding determines HEIC support; unsupported users are asked to export JPEG/PNG. Quota/failed writes retain the prepared preview for retry. A durable preparation marker makes an interrupted photo selection visible after reopening; it blocks silent completion until the user reselects or explicitly abandons it. Earlier saved photos survive failed replacement. Caption drafts autosave after a short pause.

Only selected destination coordinates are stored in outing records; no GPS trail is recorded. Existing nearby discovery still requires explicit location action and explains the external Overpass request. Photos and memories stay on-device. Clearing site data, private mode, browser eviction, or changing the Vite server origin can remove access. Originals should be kept separately.

## Rewards, accessories and future separation

- Reaching the planned duration earns +2%; adding a saved photo earns +1%.
- The total is capped at +3% across all outings on the local calendar day of return, and affection never exceeds 100%.
- Early photo returns can earn +1%, but do not count as duration-goal accessory completions.
- Distinct saved outings reaching their duration goal count toward the existing 1/3/5/10/15 milestones: red collar, blue collar, green scarf, flower crown, backpack.
- Cancelled outings, manual memories and duplicate IDs do not count. Prior history and earned unlocks remain intact, including after deleting scrapbook entries.
- Petting and feeding still grant no permanent affection.

Timer and photo rewards are game incentives, not verified outdoor visits. Photo status is `not-reviewed`. Adoption date, generation, completion dates and the last eligible photo-submission date are retained. `lastQualifyingOutdoorPhotoDate` remains null until future verification can establish qualification. Separation is inactive; pets, affection and memories are never removed by an inactivity rule.

## Validation

Passed:

- `npm.cmd run build`: strict TypeScript and Vite production build.
- `npm.cmd run lint`.
- Existing `checkpoint-check`, `theme-check`, `solar-check`, `nearby-check`, `pets-check`.
- Existing native Chrome `onboarding-browser-check`, `scenes-browser-check`, `pets-browser-check`.
- New `journey-check` and native Chrome `journey-browser-check`.

The new browser suite exercises 320×568, 360×800, 390×844 and 430×932 with touch emulation and actual rendered components/native IndexedDB. Coverage includes actual pet breed/accessory/animation and face clearance, Free Walk without GPS, closing/reopening and refresh, duplicate/concurrent starts, early return, duration goal, nearby-card destination wiring, explicit camera file chooser, gallery input, compression/Blob storage, quota retry, corrupt replacement, interrupted draft recovery, atomic aborted completion, manual memories, daily cap, duplicate rewards, 100% ceiling, all accessory thresholds, cancellation, localStorage recovery and deletion. The existing scene/pet suites additionally cover desktop 1440×900, migration and all 20 breeds.

Browser fixtures run in an isolated temporary Chrome profile and are removed afterwards. The test-only source-module endpoint exists only in the test HTTP server, never in Vite/production. Nearby wiring uses a cached fixture; this checkpoint does not claim a newly verified live Overpass response or real outdoor presence.

## Screenshots

`artifacts/checkpoint-7/` contains:

- `active-320x568-day.png`, `active-360x800-day.png`, `active-390x844-day.png`, `active-430x932-day.png`.
- `active-430x932-night.png`.
- `returned-photo-draft.png`.
- `scrapbook-day.png`, `memory-detail.png`, `scrapbook-multiple-night.png`.

The pictured destination and uploaded image are labelled test fixtures, not real visit evidence. The folder also contains the generated upload/corrupt-image test files. Existing scene and breed regression screenshots remain in `artifacts/ui-fixes/` and `artifacts/checkpoint-6/`.

## Remaining device checks and limitations

Physical Motorola Android camera/touch/background behavior was not tested. On the actual Wi-Fi Vite URL: start an outing, background and reopen Chrome, return, tap Take a photo, approve the native chooser/camera, capture and save, reopen the scrapbook, refresh, and delete the memory. Also try gallery cancellation and a large real photo. Chrome touch emulation and file-chooser interception do not substitute for those checks.

If the browser kills a tab before photo processing/IndexedDB commit, an unfinished-selection notice survives but the original must be reselected; an uncommitted in-memory image cannot survive process termination. Before-unload warnings are best-effort on mobile. IndexedDB must be available to start/save an outing. Storage is local to the browser origin; there is no backup/export or cross-device sync in this checkpoint. Device clock/calendar changes can affect elapsed time and daily limits; there is no server-based anti-cheat. No AI, location proof, opening-time guarantee, separation or reminder delivery is implemented.
