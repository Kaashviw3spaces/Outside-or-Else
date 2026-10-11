# OUTSIDE OR ELSE

Your pet has one mission. Get you outside.

A mobile-first React + TypeScript frontend checkpoint for a cozy outdoor companion game. The existing package name, Vite configuration, and Tailwind v4 setup are retained. No additional dependencies are required.

Current checkpoint: [Optional two-day challenge, re-adoption and legacy](docs/checkpoint-8.md). The [outdoor adventure report](docs/checkpoint-7.md) describes the preceding checkpoint. The report lists architecture, tests, screenshots, privacy limits, and the remaining Android camera checks. Older sections below describe earlier checkpoints.

## Run

```sh
npm run dev
npm run build
npm run lint
node scripts/checkpoint-check.cjs
```

On Windows PowerShell, use `npm.cmd` if the system execution policy blocks `npm.ps1`. Open the local URL printed by Vite (normally http://localhost:5173).

## Included

- Short skippable splash and seven-step onboarding: companion, name, activities, outdoor time, duration, introduction.
- Original cream/grey cat and orange/cream dog built from layered SVG.
- Breathing, blinking, ear twitch, tail movement, happy nod, excited bounce, petting hearts, feeding/nibbling, and sleep animations. Reduced-motion preferences are respected.
- Illustrated cozy home, love meter and bond stages, tap/swipe petting, feeding, nap/wake control, and optional soft interaction tones.
- Real OSM nearby discovery, optional-GPS Free Walks, timestamp-based resumable outings, and a photo return flow.
- Persistent local photo scrapbook, manual memories, memory details and deletion.
- Home / Adventure / Memories / Settings navigation.
- Settings for name, time, duration, activities, sound and future reminder preference.
- Versioned, validated local storage, safe recovery from malformed data, and a visible warning when saving is unavailable.

Affection starts at 10%. Petting and feeding never increase permanent affection. Completed outings now award capped affection for recorded duration and a saved photo. These are not verified proof of outdoor presence. All speech lines are authored reactions, not AI output.

## Manual browser checklist

1. Use a fresh browser profile/origin to see the splash; skip it and complete onboarding. Test Back and optional Skip controls.
2. Choose each species in separate fresh test profiles. Confirm name, time, duration and activities appear on Home and Adventure.
3. Tap and gently swipe the pet; feed; nap and wake. Confirm reactions end after about 3 seconds, sleep lasts until awakened, and love stays at 10%.
4. Visit all four tabs. Start a Free Walk or choose a discovered place; refresh to resume, return early or after the goal, add a photo and save. Check the scrapbook and reward limits.
5. Save edited preferences in Settings, reload, and confirm they persist and returning users bypass the splash/onboarding. Enable sound and test a reaction; no audio plays automatically.
6. Enable the reminder preference and confirm no browser permissions are requested. No reminders are sent yet.
7. Test at 360px, 390px and 430px, on tablet/desktop, with keyboard navigation, and with reduced motion enabled. Check long 24-character pet names.

Automated checks cover storage round trips and failures, corrupt save data, bond boundaries, time labels, rendered pets (both species, six moods, two reactions), screens, and navigation states. They do not replace browser interaction or visual testing. Native Chrome browser regressions also exercise actual rendered interactions and IndexedDB. Physical Android camera and keyboard checks remain required.

## Next checkpoints

Not connected yet: open-source AI, photo verification, generated captions, reminder delivery, backend or cross-device sync. Discovery and saved outing records are now implemented; no example places or memories are seeded in production. Notification settings currently save a preference only.

No reference images were present in `references/` during implementation. The SVG characters are original artwork based on the brief's written descriptions. Sleep uses a floating Z and nod rather than a detailed yawn/snore sequence. The splash uses a simple layered peek/look/blink sequence.

## Day / night appearance

Settings > Appearance offers **Day**, **Night**, and **Follow Device**. Follow Device (System) is the default, including for existing saves without an appearance preference. Appearance changes apply and save immediately; the Save my preferences button remains for the other settings.

Architecture:

- `src/theme/appearance.ts`: validated appearance storage and subscriptions, explicit Light/Dark overrides, live device preference changes, and cross-tab storage updates. The separate `outside-or-else:appearance` key leaves pet saves and progression untouched.
- `src/theme/ThemeProvider.tsx` / `ThemeContext.ts` / `useTheme.ts`: shared reactive state, root `data-theme` and `data-appearance` attributes, native control color scheme, and mobile browser theme color.
- `src/styles/theme.css`: centralized day/night tokens used by all screens, cards, controls, navigation, speech bubbles and dialogs. Color and scenery changes take 600ms; reduced motion disables transitions and ambient animation.
- `src/components/SkyLights.tsx`: mounted day and night SVG layers that crossfade between sun/clouds and a crescent moon/stars. Shared by the home window, splash, adventure illustration and scrapbook art.
- `CozyRoom`: navy walls and floor, dark distant hills, blue moonlight, lavender ambient glow, warm bed light and three gentle fireflies at night. Stars/fireflies pause in Day mode.
- Pet art and its existing transform animations are unchanged. Transparent blue/warm drop-shadow rims and a soft halo add ambient lighting without recoloring fur or applying a dark filter.
- `index.html` restores the choice before first paint to avoid a daytime flash when returning in Night mode.

Run `node scripts/theme-check.cjs` for appearance resolution, reload persistence, device/cross-tab events, listener cleanup, storage failure, first-paint consistency, screen renders, token completeness and key text contrast checks. The original checkpoint checks remain available and cover both pets and reactions.

Manual appearance checks (a live browser was unavailable in the implementation session):

1. Select Day, Night and Follow Device in Settings. Each must update immediately without saving other settings or refreshing.
2. In Follow Device, switch the device appearance while the app remains open. Explicit Day/Night must ignore device changes.
3. Refresh in each choice; verify the chosen appearance survives without changing the companion, love or other preferences.
4. Visit Home, Adventure, Memories and Settings in both modes; inspect the adventure dialog and native time inputs. Use a fresh test browser to check the splash and all onboarding steps under System.
5. Pet/feed/nap both companions in Night mode, then switch back to Day. Confirm reactions and fur colors remain intact.
6. Check 360px–430px widths, tablet/desktop, radio selection with keyboard arrows, and reduced motion. Stars/fireflies should be static with reduced motion.

## Dynamic — Follow the Sun

A fourth appearance option follows the local date and real solar events. Day, Night, and Follow Device continue to behave as before; saved appearance choices are not migrated or reset. Follow Device remains the default. Only `suncalc` 2.1.1 was added; it includes TypeScript declarations.

Solar definitions (centralized in `src/lib/solar.ts`, using SunCalc v2 event times):

| Visual phase | Solar definition |
| --- | --- |
| Sunrise | Dawn through the end of morning golden light (`goldenHourEnd`). Includes sunrise and the gentle morning warm-light interval. |
| Morning | Morning golden-light end through solar noon. |
| Afternoon | Solar noon through the start of evening golden hour. |
| Golden hour | SunCalc's evening `goldenHour` (+6° crossing) through sunset. Morning golden light is included in Sunrise. |
| Blue hour | Sunset through dusk, our artistic civil-twilight palette. Morning civil twilight is included in Sunrise. This deliberately broader interval is not a claim of the narrower photographic blue-hour interval. |
| Night | Dusk through the next dawn. |

`calculateSolarEvents` exposes dawn, sunrise, morning golden-light end, solar noon, evening golden-hour start, sunset, dusk, and morning/evening civil-twilight intervals. It passes the device's UTC offset to SunCalc to select the civil day and formats times in the device's timezone. A one-day cache avoids repeated event calculations. If event crossings are unavailable (including polar day/night), phases follow SunCalc's actual altitude: below −6° is night, twilight is sunrise/blue hour, low sun is sunrise/golden hour, and high sun is morning/afternoon. No rise/set times are fabricated.

Without usable coordinates, the UI explicitly says **Using approximate local-time lighting.** Its artistic clock slots are night before 06:00, sunrise 06:00–08:00, morning 08:00–12:00, afternoon 12:00–17:00, golden hour 17:00–19:00, blue hour 19:00–20:00, then night. These are fallback lighting slots, not calculated sunrise or sunset times. The inline first-paint bootstrap uses these slots; cached solar calculations refine them before the React game renders.

Location is requested only by the **Improve with my location** / **Refresh my location** button. Raw coordinates are validated, rounded to 0.01°, and cached under `outside-or-else:approximate-location`. They are never sent by this application to a server. Invalid data, denial, timeout, unsupported browsers, storage failure and offline acquisition failure leave saved-location or clock lighting usable. **Forget saved location & use local time** removes the app's coordinate cache (it does not revoke the browser's permission). Cached coordinates are not silently refreshed; use Refresh my location after travel.

The single-timeout scheduler (`src/lib/environmentScheduler.ts`, consumed by `useTimeOfDay`) wakes at event boundaries and local midnight, checks clock/timezone/polar changes at most once per minute, pauses while hidden, refreshes on visibility/pageshow and coordinate changes, and removes listeners/timers when Dynamic mode is disabled or unmounted. Unchanged environment snapshots do not trigger minute-by-minute React renders.

Six phase palettes in `theme.css` control sky gradients, room lighting, distant scenery, sun rays, star/moon/firefly visibility and gentle ambient pet rims. The existing SVG pet artwork and progression code are unchanged. All phase transitions use the existing 600ms/reduced-motion behavior.

Verification:

```sh
npm run build
npm run lint
node scripts/checkpoint-check.cjs
node scripts/theme-check.cjs
node scripts/solar-check.cjs
```

All checks passed during implementation. Solar tests use fixed dates, coordinates, mocked geolocation, and a fake scheduler clock. They cover all six boundaries, seasonal/location changes, polar conditions, invalid inputs, timezone/DST and date rollover, no automatic permission requests, coordinate rounding, cached offline calculations, errors/storage failures, four-mode resolution/persistence, first-paint fallback consistency, and timer/listener cleanup.

Manual browser checks remain: all six palettes at 360px–430px, reduced motion, pet reactions in Dynamic mode, real browser location permission UI, device appearance overrides, returning from a backgrounded tab, and travel/location refresh. No browser surface was available in this session. Calculations run offline once app assets are available; this checkpoint does not add a service worker or guarantee a fresh offline page load. Solar lighting models date/coordinates rather than weather; the moon remains a decorative crescent.

SunCalc documentation: https://github.com/mourner/suncalc
