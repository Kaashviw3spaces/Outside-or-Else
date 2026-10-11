# Updated checkpoint

The expanded contextual voice and UI copy is documented in [chaotic-ui-copy.md](chaotic-ui-copy.md). The notes below describe the original species-specific speech checkpoint.

# Scripted companion speech

Cat and dog dialogue is authored, not AI-generated. No model or conversation transport is connected. Talk shows a scripted greeting; submitted messages remain a session-only preview without fabricated replies.

`src/pets/dialogue.ts` contains separate cat/dog banks: five personalities, fifteen events, two alternatives each (300 short lines). Cats use mostly lowercase broken English, kitten logic, occasional dramatic capitals and optional cat sounds. Dogs use loyal, enthusiastic, goofy speech. Playful, sleepy, curious, shy and mischievous each have distinct lines for every event. Random selection avoids immediately repeating a Home interaction line. Scene lines remain stable across timer ticks and unrelated renders.

Examples:
- Curious cat, feeding: "bowl got food? why bowl no eat it."
- Sleepy cat, waking: "i awake? why. where pillow."
- Shy cat, petting: "oh... gentle hand. i lean little closer."
- Playful dog, invitation: "HUMAN HUMAN. WALK??? We could walk!"

## Actual event boundaries

Home reacts to actual pet/feed/nap/wake actions. A one-day challenge reminder uses gentle companion speech only while idle, so it cannot hide interaction responses. Challenge status and consequences retain factual system text.

Onboarding uses meeting lines. Adventure invitations do not assert a completed outing. An active timer uses starting lines; pressing I'm Back uses returning lines without claiming a GPS-verified visit. The composer announces a photo only after IndexedDB saves successfully. Failed/preparing photo writes do not celebrate success. Completed memories announce a saved page. Accessories are announced only for a completed eligible outing whose ID is in the active pet's relationship ledger and whose resulting accessories differ from its starting snapshot. Selecting a wardrobe preview does not count as an unlock. Scrapbook pages use memory lines, not fabricated petting responses; historic entries use their original pet's species/personality. Farewell preserves the departing companion's personality and avoids blame.

Privacy, permissions, storage errors, reward calculations and the two-day rule remain outside character banter. Photos are unverified; nothing asserts actual outdoor presence or an invented location. Speech does not write any saved profile, progress, rewards or theme preference.

## Future open-weight model

`buildPetSpeechInstructions(species, personality)` in `src/pets/speechInstructions.ts` exports the same voice and personality rules, event grounding, concise responses, species separation, no invented actions or verification, non-manipulative farewells, and clear system notices. Future inference must supply trusted event facts separately from user text/captions and validate output. This module prepares instructions only; it implements no AI model, backend or dependency.

## Validation

Run `node scripts/dialogue-check.cjs` for all 150 species/personality/event combinations, deterministic variation/no-repeat, actual rendered adventure/farewell scenes, unlock eligibility and future instructions. `pets-browser-check.cjs` covers actual touch interactions for all ten species/personality combinations. `journey-browser-check.cjs` additionally asserts start/return dialogue, no celebration after injected photo quota failure, successful photo-save speech, and the first real accessory unlock. Existing scene tests verify the scripted Talk greeting and layout in all themes.

Browser automation uses installed desktop Chrome with mobile touch emulation. It does not replace physical Android testing or a human review of the writing tone.

Files added: `src/pets/dialogue.ts`, `src/pets/speechEvents.ts`, `src/pets/speechInstructions.ts`, `src/components/PetLine.tsx`, `scripts/dialogue-check.cjs`, this document.

Files modified: `src/pets/personality.ts`, `src/hooks/usePetAnimation.ts`, `src/components/PetSpeechBubble.tsx`, `src/components/OutdoorScene.tsx`, `src/components/PhotoMemoryComposer.tsx`, `src/screens/Home.tsx`, `src/screens/Onboarding.tsx`, `src/screens/Adventure.tsx`, `src/screens/Memories.tsx`, `src/screens/Farewell.tsx`, `scripts/pets-check.cjs`, `scripts/pets-browser-check.cjs`, `scripts/scenes-browser-check.cjs`, `scripts/journey-browser-check.cjs`.
