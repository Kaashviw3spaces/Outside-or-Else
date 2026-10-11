# Checkpoint 8: optional separation, re-adoption and legacy

The Two-Day Adventure Challenge is optional and OFF by default. An explicit confirmation enables it; pause, resume and disable controls are separate from normal preferences. No dependencies, backend, AI, tracking or artwork replacements were added.

## Safe checkpoint

Git status confirmed this folder is not a Git repository. Before edits, the source-only `.checkpoints/before-checkpoint-8-20261010-215112.zip` checkpoint was created. It excludes secrets, dependencies, production output and browser artifacts. No commit was created.

## Exact rules

1. Adoption, enabling and resuming each give the current local calendar day as a grace day. Existing pets are not penalized retrospectively when enabling.
2. Count only complete days after the later of the grace day and the last qualifying photo day. The current unfinished day never counts.
3. Example: enable Monday. Tuesday is still open; Wednesday starts with one missed day if Tuesday had no qualifying photo. Thursday starts with separation if both Tuesday and Wednesday were missed. A qualifying photo Wednesday resets the streak.
4. Qualifying means a distinct completed `outing` for the current pet, a valid completion timestamp, a matching saved memory and a nonempty photo Blob actually present in IndexedDB. Duration-goal eligibility is not required for this challenge. Manual memories, cancelled/active outings, other pets and duplicates do not qualify.
5. New records use the memory-save `completedAt` timestamp. For pre-checkpoint records without it, the later valid return/photo-save timestamp supplies the date. There is no invented timestamp.
6. These are **Unverified adventure photos**. Neither photo presence nor elapsed time verifies GPS, outdoor presence, safety, or authenticity. The old future AI-verification field remains null; the challenge's last qualifying date has this explicitly unverified meaning.
7. Paused time does not count. Resume starts a fresh grace day and streak; it does not retroactively apply paused days. Turning the challenge off keeps the companion.
8. Separation is an atomic one-time archive/state commit. A farewell does not erase the pet, history, memories, photos, captions or previous rewards. It cannot be undone by later photo uploads; a new chapter starts with re-adoption.

## Persistence and recovery

The existing `outside-or-else:journey-v1` IndexedDB schema is reused, without a destructive upgrade. Its `meta` store now contains:

- `challenge`: enabled, current pet ID, generation, grace date, last qualifying date, missed streak, pause state, last evaluation date/time, timezone/offset, clock observation and separation timestamp.
- `legacy:<petId>`: full archived profile, appearance, adoption date when known, relationship history and separation date.
- `active-companion`: canonical active profile snapshot for re-adoption and recovery. The normal version-1 localStorage pet save remains the preference/progress mirror.

Separation uses a transaction covering all existing stores, validates photo references and dates, and confirms the current localStorage save can be written before committing a farewell. Failed reads, quota errors, missing referenced photos, corrupt records or a failed companion mirror block separation and show an actionable protection message. Prior qualifying credit survives intentional memory deletion, so deleting an already credited photo does not rewrite history.

Re-adoption commits the new profile and challenge state together, then mirrors the pet to localStorage. If the mirror fails, the new companion remains available for the session and reload recovers the committed identity from IndexedDB. Duplicate/stale adoption attempts return that existing identity. Old archives and outing records remain distinct.

Existing saves keep their IDs, artwork, affection, unlocks and save version. OFF is derived without automatically rewriting old saves; challenge data is saved when explicitly configured. Older pets with unknown adoption dates get an enable-day grace, not an invented adoption date. On recovery from a missing active profile save, an enabled unfinished challenge is paused conservatively.

## Clock and data safety

Local dates use calendar ordinals, rather than elapsed milliseconds divided by 48 hours. Changes to timezone or UTC offset reset today as a fresh grace day. A backwards wall clock/date or an observed wall-clock-versus-monotonic discrepancy greater than five minutes pauses the challenge. Resume is explicit after correcting the clock. Invalid state, pet-generation mismatches, damaged adventure dates and missing photo data protect the companion.

Evaluation runs on opening, focus, visible-page return, journey changes and once per minute while mounted. A closed app evaluates on reopening; there is no background removal task. An open page may show midnight's new status within approximately one minute. IndexedDB transaction ordering serializes evaluations and photo/memory commits. Archived IDs and separation timestamps prevent repeated farewells; same-tab and cross-tab subscriptions update the UI.

Without a trusted clock/backend, a forward clock change made while the app is fully closed cannot reliably be distinguished from legitimate days elapsed. The challenge is not an anti-cheat or verified-presence system. Daylight-saving offset changes intentionally receive extra grace rather than risking an unfair farewell.

## Game integration

- Home keeps its full-screen room, adds a small status line, and gives a gentle authored reminder/expression after one full missed day.
- Farewell uses the current existing pet appearance and a subtle CSS sway with reduced-motion support. Personality-specific text avoids guilt, threats or blame. Memories and unfinished-outing navigation stay accessible.
- The existing AdoptionPicker and PersonalityPicker are reused for species, all breeds, fur and personality, with a name field. A new unique ID, generation +1, 10% affection and a fresh adoption history are assigned. Appearance, accessibility/media preferences, activity preferences, sound and reminder preferences remain intact.
- Re-adoption requires finishing/cancelling an unfinished outing and finishing/discarding a manual memory draft first. Existing drafts are preserved and their screens remain accessible after farewell.
- Adventure displays challenge status; a separated companion can finish an existing outing but cannot start another. Existing time/photo affection rules and accessory milestones are unchanged.
- Scrapbook groups entries by pet generation and displays archived identity, breed, fur, personality, adoption/separation dates, captions, photos and reactions. Legacy identity remains visible even when its scrapbook has no entries.

## Files

Created:

- `src/challenge/rules.ts`
- `src/challenge/service.ts`
- `src/challenge/ChallengeContext.ts`
- `src/challenge/useChallengeState.ts`
- `src/components/ChallengeSettings.tsx`
- `src/components/ChallengeStatus.tsx`
- `src/screens/Farewell.tsx`
- `src/styles/challenge.css`
- `scripts/challenge-check.cjs`
- `scripts/challenge-browser-check.cjs`
- This report.

Modified:

- `src/App.tsx`: context, canonical recovery, one-time farewell and re-adoption routing.
- `src/screens/Home.tsx`: status and first-missed-day expression/dialogue.
- `src/screens/Adventure.tsx`: status and separated-pet start protection.
- `src/screens/Memories.tsx`: generation grouping and legacy identity/labels.
- `src/screens/Settings.tsx`: optional challenge controls.
- `src/components/PhotoMemoryComposer.tsx`: explicit unverified-photo label.
- `src/journey/types.ts`: optional memory-save completion timestamp.
- `src/journey/service.ts`: timestamp, active-companion recovery and start guards; existing reward rules preserved.
- `src/index.css`: scoped stylesheet import.
- `README.md`: current checkpoint report link.

## Validation

Build, lint and all existing regression scripts passed. New deterministic logic and native Chrome tests cover default OFF, explicit opt-in, grace day, current-day exclusion, one/two missed days, qualifying resets, manual exclusion, duplicate completion/evaluation, pause/resume, midnight/calendar boundaries, timezone and clock protection, missing photos, corrupt state, failed archive/mirror writes, one-time farewell, refresh, re-adoption, failed adoption-mirror recovery, duplicate adoption, old-save migration and legacy photo preservation.

Commands:

```text
npm.cmd run build
npm.cmd run lint
node scripts/checkpoint-check.cjs
node scripts/theme-check.cjs
node scripts/solar-check.cjs
node scripts/nearby-check.cjs
node scripts/pets-check.cjs
node scripts/journey-check.cjs
node scripts/challenge-check.cjs
node scripts/onboarding-browser-check.cjs
node scripts/scenes-browser-check.cjs
node scripts/pets-browser-check.cjs
node scripts/journey-browser-check.cjs
node scripts/challenge-browser-check.cjs
```

Native browser tests use controlled dates, actual rendered React components, real IndexedDB transactions and an isolated temporary Chrome profile. Fixtures never seed production. Farewell layouts were checked at 320×568, 360×800, 390×844 and 430×932; existing Home/pet suites also cover 1440×900, all 20 breeds and all four appearance settings. New farewell and legacy views were checked in day/night themes and reuse the existing global theme tokens.

Screenshots in `artifacts/checkpoint-8/`: first missed day, farewell at all four phone sizes, night farewell, adoption center and legacy scrapbook. They depict controlled test dates and test photos, not verified real-world outings. Existing screenshots remain in their previous artifact folders.

## Known limitations

Physical Motorola Android touch, camera, background/OS-kill and keyboard behavior were not tested. Browser touch emulation is not a physical device test. Local records depend on the browser origin and its storage retention; clearing site data can remove both memories and recovery snapshots. No backup/export, cross-device synchronization or reminder delivery is added. Missing referenced photo data blocks the challenge until repaired or explicitly deleted; it does not silently become a missed day. Forward clock changes across a fully closed session have the trusted-time limitation described above. No AI verification, GPS proof or outdoor activity confirmation exists.
