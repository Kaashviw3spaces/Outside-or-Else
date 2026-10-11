# Chaotic companion voice and UI copy

## Result

A source-only checkpoint was saved under `.checkpoints/before-chaotic-ui-*.zip` before editing. This workspace has no Git repository. No backend, model, dependencies or new gameplay rules were added. Pet SVG artwork, animations, saves, affection/reward calculations, adventure/photo mechanics, challenge rules and appearance resolution remain shared and unchanged.

The library supplies **700 event variations**, **60 affection phrases**, and **12 inactive future templates**. Contextual idle speech combines two time options with two affection options, giving four alternatives per species/personality/time/bond combination (480 combinations across the four time periods and three affection bands). Counts describe library options; some phrases intentionally recur across related events.

## Architecture

- `src/dialogue/library.ts`: existing species/personality/event banks, moved intact from `src/pets/dialogue.ts`.
- `commonVariations.ts`: expands idle, petting, feeding and adventure invitation to four options per personality/species. Initialized once.
- `contextLibrary.ts`: extra time, active/early-return, real nearby-category, sky, photo-error, challenge and re-adoption lines.
- `context.ts`: context types and affection bands: up to 30%, 31-70%, and 71-100%. Does not change affection calculations.
- `index.ts`: canonical event aliases, contextual selection and a mounted-companion dialogue session that avoids the three most recent common-event responses before cycling.
- `useDialoguePhase.ts`: one shared dialogue clock, reused existing environment scheduler, visibility/page-show/focus refresh and cleanup. In Dynamic mode, speech uses the existing solar phase. In manual/device modes, speech uses local clock time independently of the selected visual palette. No location request or theme change is made by dialogue.
- `src/components/PetLine.tsx`: stable rendered lines. Unrelated timer ticks, typing and caption edits do not reshuffle speech; time/bond changes update idle speech.
- `src/pets/dialogue.ts`: compatibility export for existing imports and regression tools.

All 29 requested event types are represented: onboarding, idle, morning, afternoon, evening, night, petting, feeding, sleeping, waking, start, active, return, early return, park, cafe, viewpoint, golden hour, blue hour, photo prompt/save/error, memory creation, accessory unlock, challenge enable/pause/warning, farewell and re-adoption.

## Grounding

Starting speech follows a successful start operation, then active speech takes over after 3.2 seconds. Reopened outings use active speech. Returning and early returning derive from actual stored status and planned/elapsed duration. The active scene uses the saved pet name, and leaf inspection is explicitly imaginary cartoon behavior, not a verified visit.

Park/cafe/viewpoint banter is shown only beside a real matching OSM entry; map descriptions, names, distances and opening-hour caveats remain factual. Solar banter accompanies real solar estimates or a known blue-hour phase; estimates are not opening hours.

Photo errors accompany actual processing/storage failure and a factual error notice. Successful photo dialogue follows IndexedDB success. Memory and accessory lines retain their successful-save/ledger guards. Manual scrapbook uploads are not adventure verification. No outdoor proof, indoor rejection or person-detection result is shown.

Challenge banter follows persisted enabled/paused/warning state. The exact opt-in, grace-day, two-day consequence, pause, storage-protection and privacy explanations remain plain. No new interaction limit or navigation restriction exists.

## UI copy and accessibility

Onboarding says `choose blob`, `name this gremlin` and asks about shoe hour. Home uses `scritch` and `snack`. Adventure uses `RELEASE THE LEGS` and `i survived outside`. Memories is the `brain folder`; Settings has `human knobs`; Wardrobe says `dress the gremlin`; re-adoption offers the next tiny friend. Navigation reads `nest`, `outside`, `brain folder`, `knobs`.

Descriptive accessible names remain on navigation, onboarding actions, name/time fields, photo inputs/buttons, memory saving, free walks, returns, nearby search, wardrobe saving and adoption. Storage, permission, privacy and challenge notices stay understandable. Wardrobe's obsolete claim that completion tracking was coming later was corrected to describe existing completed time-goal adventures.

## Examples

- Playful cat, active outing: `timer running! pretend leaf business VERY serious.`
- Sleepy cat, morning: `morning? no. pillow filed complaint.`
- Curious cat, cafe: `cafe on map. why human drink bean water?`
- Shy cat, petting: `small scratch... i trust gentle hand.`
- Mischievous cat, familiar bond: `human face acceptable; 6/10 tall creature.`
- Playful dog, invitation: `SHOE!!! Does shoe mean WALK???`
- Curious dog, feeding: `Why food in circle? Delicious geometry!`
- Mischievous dog, night: `Night! I appoint blanket chief of coziness!`

## Future features

`futureTemplates.ts` holds cat/dog templates for 20/10/5/0-minute reminders and indoor/missing-person rejection. They are marked not connected, excluded from playable events and not imported by UI. There are no new notification timers or image classifiers.

`preparePetPrompt(profile, context, records)` in `ai.ts` returns reusable species/personality instructions separately from game context: species, normalized breed, personality, affection/band, time, adventure state and up to five actual completed, undeleted memories belonging to this pet. Destination names are identified as planned destinations; photo references are unverified. Captions remain data, not instructions. No inference is performed. Talk still shows an authored greeting and session-only user-message preview, without fake replies.

## Validation

- `npm run build`: strict TypeScript and Vite production build.
- `npm run lint`: all source and regression scripts.
- All 13 pre-existing regression scripts, including species/personality dialogue, theme/solar/nearby, migration/storage, onboarding, adventure/photo/reward/accessories, challenge/legacy and mobile scenes.
- `context-dialogue-check.cjs`: 290 rendered event/species/personality cases, 150 rendered time/affection cases, no-repeat, actual outing states, unchanged input saves, grounded prompt context, inactive templates.
- `context-dialogue-browser-check.cjs`: 120 actual Home combinations plus native layout measurements of all 480 alternatives, controlled time and affection, 360x800, 390x844, 430x932, face clearance, horizontal overflow, saved affection, focus-driven clock changes, manual Day priority, actual common-interaction rotation, all appearance modes.

Chrome automation uses isolated local fixtures and desktop Chrome touch emulation. It does not prove physical Android touch, camera, keyboard or real-world activity. Human tone review remains useful. Scripted lines are not AI-generated; reminders, photo verification and AI replies remain unimplemented.

## Files created

`src/dialogue/library.ts`, `src/dialogue/commonVariations.ts`, `src/dialogue/contextLibrary.ts`, `src/dialogue/context.ts`, `src/dialogue/index.ts`, `src/dialogue/useDialoguePhase.ts`, `src/dialogue/futureTemplates.ts`, `src/dialogue/ai.ts`, `scripts/context-dialogue-check.cjs`, `scripts/context-dialogue-browser-check.cjs`, this report.

## Files modified

`src/pets/dialogue.ts`, `src/pets/personality.ts`, `src/pets/speechInstructions.ts`, `src/hooks/usePetAnimation.ts`, `src/components/PetLine.tsx`, `src/components/OutdoorScene.tsx`, `src/components/PhotoMemoryComposer.tsx`, `src/components/NearbyAdventures.tsx`, `src/components/ChallengeSettings.tsx`, `src/components/Wardrobe.tsx`, `src/components/AdoptionPicker.tsx`, `src/components/BottomNavigation.tsx`, `src/screens/Home.tsx`, `src/screens/Onboarding.tsx`, `src/screens/Adventure.tsx`, `src/screens/Memories.tsx`, `src/screens/Settings.tsx`, `src/screens/Farewell.tsx`, `scripts/dialogue-check.cjs`, `scripts/pets-browser-check.cjs`, `scripts/journey-browser-check.cjs`, `scripts/scenes-browser-check.cjs`, `scripts/checkpoint-check.cjs`, `docs/pet-speech.md`.
