# Outside or else!

Your pet has one mission. Get you outside.

A mobile-first React + TypeScript cozy outdoor companion game built around on-device local AI models, privacy-first offline persistence, and open map data.

# 🌟 Overview
Outside or Else! turns stepping outside into a tiny adventure. Adopt a pet, nurture a bond, and receive chaotic, unhinged reminders to step away from your screen. Screen time should be the shortest part of the game.

OUTSIDE OR ELSE! PWA

FRONTEND & UI                               
│ • React + Vite + TypeScript        
│ • Hand-drawn Gaegu Font              
│ • SunCalc (Ambient Lighting)             
│ • OpenStreetMap / Overpass API

NATIVE ANDROID (CAPACITOR)         
│ • llama.cpp (Qwen3-0.6B GGUF AI)   
│ • Native Camera & Local Photos     
│ • Local Notification Engine     
│ • On-Device File Persistence.     


# ✨ Features Included
7-Step Onboarding & Pet Selection: Short skippable splash screen guiding users through companion choice, naming, activity preferences, outdoor time goals, and duration.

Vector Pet Artwork & Animations: Original cream/grey cat and orange/cream dog built entirely from layered SVG artwork. Features breathing, blinking, ear twitching, tail movements, happy nods, excited bounces, petting hearts, nibbling, and sleep states. (Respects prefers-reduced-motion preferences).

Interactive Home Room: Illustrated cozy home with love meter, bond stage tracking, tap/swipe petting, feeding, nap/wake controls, and soft audio interaction tones.

Real OSM Discovery & Free Walks: Real-time OpenStreetMap nearby place discovery via Overpass API. Includes optional GPS-free adventures, timestamp-based resumable outings, and photo return flows.

Local Photo Scrapbook: Persistent local photo memory scrapbook with manual memory creation, detailed views, and deletion capabilities.

Dynamic Sun-Tracking Lighting: Powered by SunCalc, environment ambient lighting updates through 6 distinct sky phases (Sunrise, Morning, Afternoon, Golden Hour, Blue Hour, Night). Includes manual Day, Night, Follow Device, and Dynamic (Follow the Sun) modes.

Robust Privacy & Storage: Versioned local storage validation, graceful recovery from malformed data, and visual indicators when local saving is unavailable.

## 🚀 Quick Start

### Prerequisites
* **Node.js** (v18+ recommended)
* **npm** or **yarn**

---

### 1. Clone & Install

```bash
# Clone the repository
git clone [https://github.com/Kaashviw3spaces/Outside-or-Else.git](https://github.com/Kaashviw3spaces/Outside-or-Else.git)

# Navigate into the project directory
cd Outside-or-Else

# Install dependencies
npm install
Windows PowerShell Note: If system execution policy blocks npm.ps1, run commands using npm.cmd (e.g., npm.cmd run dev).
```
### 2. Run Locally
```bash
npm run dev
Open the local URL printed by Vite in your browser (typically http://localhost:5173).
```
### 3. Build & Validate

Run the validation suite to test builds, linting, and subsystem logic:

```bash
# Production build & linting
npm run build
npm run lint

# Subsystem check scripts
node scripts/checkpoint-check.cjs
node scripts/theme-check.cjs
node scripts/solar-check.cjs

```
# 🛠️ Architecture & Tech Stack

Frontend Framework: React, TypeScript, ViteStyling & UI: Tailwind v4, Centralized CSS Custom Properties (src/styles/theme.css), Bundled Gaegu 

FontMobile Runtime: Capacitor (Android Native Integration)

On-Device AI Engine: llama.cpp bundling quantized Qwen3-0.6B GGUF for local inference

Geospatial & Environment: OpenStreetMap (Overpass API), SunCalc 2.1.1 (Solar calculation and lighting phases)

State & Persistence: Reactive Context Providers (ThemeContext, ThemeProvider), LocalStorage / IndexedDB persistence, environment schedulers (src/lib/environmentScheduler.ts)

# ☀️ Dynamic Lighting Engine (Follow the Sun)
The app features a real-time solar tracking engine powered by SunCalc. Visual room lighting automatically transitions across six natural phases based on calculated solar angles and civil twilight intervals:

Sunrise: Dawn through the end of morning golden light (goldenHourEnd).

Morning: Morning golden-light end through solar noon.

Afternoon: Solar noon through the start of evening golden hour.

Golden Hour: SunCalc evening goldenHour (+6° crossing) through sunset.

Blue Hour: Sunset through dusk (broad artistic civil-twilight palette).

Night: Dusk through the next dawn.

# Location & Privacy Details
Approximate Fallback: If GPS location is unavailable, the system defaults to local time clock slots (e.g., golden hour 17:00–19:00).

Privacy First: Raw coordinates are rounded to 0.01°, cached locally under outside-or-else:approximate-location, and never sent to any external server.

# 🧪 Testing & Quality Assurance
Automated validation scripts verify key subsystems prior to build completion:

scripts/checkpoint-check.cjs: Validates storage round trips, bond boundaries, time labels, rendered pet moods, screens, and navigation routing.

scripts/theme-check.cjs: Ensures token completeness, key text contrast ratios, cross-tab event handling, and first-paint fallback consistency.

scripts/solar-check.cjs: Tests fixed dates/coordinates, mocked geolocation, polar conditions, offline calculations, and time-zone boundary changes.

# 🔒 Privacy & Limits
Zero Tracking: Photos and scrapbook entries remain 100% on-device.

No Server Dependencies: Outing completions and photo attachments reward capped affection locally; they are not used as invasive tracking systems or mandatory proof of presence.

Location Transparency: Geolocation permission is requested purely for optional OSM nearby discovery and local solar accuracy.

