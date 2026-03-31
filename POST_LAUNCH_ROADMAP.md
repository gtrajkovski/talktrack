# TalkTrack — Post-Launch Roadmap

> This file is the sequenced plan for everything after v1.0 ships.
> Claude Code: read this file at the start of every session.
> Each phase has a status. Update the status as work completes.

---

## Current State (v1.0)

- **Web:** PWA deployed on Vercel
- **Android:** TWA on Google Play via Bubblewrap/PWABuilder
- **Tests:** 696 passing, clean build, clean TypeScript
- **Features complete:** Earcons, StateOrb, zero-tap recognition lifecycle, 3 rehearsal modes, 35+ voice commands (EN/MK/SQ/IT), granularity modes, bookmarks, session timer, scoring, ElevenLabs BYOK, VoiceBox clone, CSV export, onboarding, recording playback, progress heatmap, countdown timer, slide grouping

---

## Phase 1: Barge-In & Audio Device Picker
**Status:** COMPLETE (1A + 1B)
**Priority:** CRITICAL — this is the #1 UX gap for driving use case
**Prompt file:** To be written

### 1A: Barge-In (interrupt TTS with voice commands)

The app currently uses turn-based audio: TTS speaks → finishes → recognition starts. The user CANNOT interrupt TTS mid-speech. This breaks the driving experience — if TTS is reading a long slide and you want to skip, you have to wait.

**What to build:**
- Keep speech recognition running DURING TTS playback on Android Chrome
- Command-only filter while TTS is active — only listen for short interrupt words: "stop", "next", "skip", "pause", "back"
- Ignore all other recognition results during TTS (prevents echo feedback where the mic picks up the app's own voice)
- On command detection: immediately `speechSynthesis.cancel()`, execute the command, play earcon
- On iOS Safari: fall back to current turn-based approach (iOS cannot run recognition and synthesis simultaneously)
- Minimize the gap between TTS ending and recognition starting on all platforms — target <200ms

**Technical approach:**
- Recognition stays in `continuous: true` mode at all times during active session
- Add an `isTTSSpeaking` flag to the recognition handler
- When `isTTSSpeaking === true`, only match against the interrupt command subset
- When `isTTSSpeaking === false`, match against the full command set + accumulate transcript for scoring
- Handle echo cancellation: if the recognized text matches what TTS is currently reading, discard it

### 1B: Audio Device Picker (Settings)

Users need to choose which mic and speaker to use — laptop speakers vs Bluetooth earbuds, built-in mic vs car system, etc.

**What to build:**
- In Settings, add two sections: "Microphone" and "Speaker"
- Use `navigator.mediaDevices.enumerateDevices()` to list available devices
- Filter by `kind === 'audioinput'` for mics, `kind === 'audiooutput'` for speakers
- Show device label in a dropdown/selector
- "Test" button next to speaker that plays a short TTS sample through the selected device
- Use `AudioContext.setSinkId(deviceId)` for earcon output routing (Chrome 110+)
- Use `HTMLMediaElement.setSinkId(deviceId)` for ElevenLabs/VoiceBox audio routing
- For browser TTS (`speechSynthesis`): output device cannot be controlled (OS-level) — document this limitation
- Persist selection in settings (store device label + groupId, not raw deviceId — IDs rotate for privacy)
- On app load, fuzzy-match saved preference against current device list
- Listen for `devicechange` event to update device list when user plugs/unplugs
- Feature-detect: `setSinkId` is not available on all browsers — graceful fallback to default device

**Tests:**
- Mock `enumerateDevices()` returning various device configurations
- Test device selection persistence and fuzzy-matching
- Test barge-in command filtering during TTS
- Test echo rejection
- Test graceful fallback on iOS

---

## Phase 2: Voice Intelligence Layer
**Status:** NOT STARTED
**Priority:** HIGH — transforms the app from player to coach
**Prompt file:** `11-voice-intelligence-layer.md` (already written)

### 2A: Context-Aware Help System (Alexa-style)

"Help" currently does the same thing regardless of context. Replace with a voice assistant that understands mode, state, position, score history, and which commands the user hasn't discovered yet. Responds with 2-3 contextual suggestions in natural speech, ending with "What would you like to do?"

Also includes: "how did I do", "summary", "what's next", "what did I miss", "what can I say" — conversational queries that respond based on session state.

Also includes: dead air prevention — if 8 seconds pass with no speech and no TTS during active session, play a gentle nudge earcon + context-aware suggestion.

### 2B: Filler Word Detection & WPM

Analyze spoken text for filler words (um, uh, like, basically, you know, sort of, I mean) and speaking pace. Announce at session end: "Your pace was 142 words per minute. 8 filler words detected. You said 'um' 5 times."

### 2C: Explainable Scoring (Missed Words)

After scoring, announce the specific content words the user missed: "Key words you missed: market share, competitive advantage, Q3 growth." This is trivially implementable — the scoring algorithm already knows which words were missed.

### 2D: Spaced Repetition Engine

Leitner box system (1-5) per slide. Score ≥70% promotes, <40% demotes. Increasing review intervals. "Smart Rehearsal" voice command sorts slides by urgency. Level-up/level-down earcons.

### 2E: Timing Practice

"Set time to 18 minutes" → automatic pace checks at 25/50/75% → "Am I on pace?" → projected vs target duration.

---

## Phase 3: Android Native Upgrades (Capacitor Migration)
**Status:** NOT STARTED
**Priority:** MEDIUM — do when users report audio-dies-on-screen-lock
**Prompt file:** `13b-capacitor-native-android.md` (already written)

**What to build:**
- Migrate from TWA to Capacitor native shell
- Foreground service with persistent notification ("TalkTrack — Slide 3 of 10: Market Opportunity")
- Keep audio alive when screen locks
- Keep screen awake during rehearsal
- Local notifications for spaced repetition reminders
- Same Play Store listing, same package name, bump version code

**When to do this:** When a user reports "audio stops when I lock my phone" — that's the trigger.

---

## Phase 4: i18n & Localization
**Status:** NOT STARTED
**Priority:** MEDIUM — do based on actual user geography data
**Prompt file:** To be written

### 4A: Voice Commands in More Languages

Add voice command translations for: Serbian, Spanish, French, German, Portuguese, Turkish, Arabic, Hindi, Chinese (Mandarin). These are just translation tables — low effort, high impact for international users.

### 4B: UI Localization

Install `next-intl` or `react-i18next`. Extract all UI strings into JSON locale files. Add language picker in Settings. Start with: English, Macedonian, Albanian, Serbian, Spanish, French, German.

**When to do this:** After launch, check Vercel analytics and Play Store install geography. Localize for the top 3-5 languages where users actually are.

---

## Phase 5: AI Coach Integration
**Status:** NOT STARTED
**Priority:** LOW — premium feature for monetization
**Prompt file:** To be written

### 5A: Post-Session AI Debrief

After Test mode, send original notes + spoken transcript + scores to an LLM (Anthropic API, BYOK model). Get back a spoken coaching summary: "You nailed the opening. You consistently forget the third case study — try anchoring it to the customer's name. Your pacing rushed on slide 5."

Delivered entirely via TTS — the user hears coaching while still driving.

### 5B: AI-Generated Practice Questions

After importing a talk, use an LLM to generate comprehension questions about the content. "What are the three key metrics you mentioned in the Market Opportunity slide?" The user answers by voice, scored on content accuracy.

**Monetization angle:** This could be the Pro feature — free core app, paid AI coaching.

---

## Phase 6: Distribution & Growth
**Status:** COMPLETE
**Priority:** MEDIUM — after core product is solid

### 6A: Landing Page & SEO

Build a proper marketing landing page. Target keywords: "practice presentation while driving", "hands-free speech rehearsal", "voice-only presentation coach". The use case is so specific that SEO should be straightforward.

### 6B: Product Hunt Launch

Prepare: demo video (screen recording of a full hands-free Listen→Prompt→Test session), landing page, launch day copy.

### 6C: Community Outreach

- Toastmasters communities (300,000+ members globally)
- Conference speaker Slack groups and Discord servers
- Reddit: r/publicspeaking, r/toastmasters, r/productivity
- YouTube: "How I rehearse presentations in my car" content piece

### 6D: CarPlay / Android Auto (MediaSession API)

Configure TalkTrack's audio as a proper `MediaSession` so the car dashboard shows: talk title, slide number, play/pause controls. This requires no native code — just the Web MediaSession API. The app shows up in the car's "Now Playing" screen for free.

---

## Phase 7: Advanced Features (Backlog)
**Status:** BACKLOG
**Priority:** LOW — only after Phases 1-4

- **Warm-up exercises:** 2-minute vocal warm-up routine before rehearsal (tongue twisters, breathing, articulation)
- **Audio audience simulation:** Background crowd sounds during Test mode (shuffling, coughing) to simulate real conditions
- **Conference Day companion:** Countdown to talk time, quick-fire weak slides, breathing exercise, post-talk reflection
- **Team/coach sharing:** Export shareable link with scores and session history
- **Multi-device sync:** Export/import talks as JSON files. Optional cloud sync for Pro users.
- **Presentation structure feedback:** Analyze imported talk for duration estimate, word count distribution, missing transitions
- **Recording playback with comparison:** Record yourself, compare across sessions, hear improvement over time

---

## Prompt File Inventory

| # | File | Status | What It Does |
|---|------|--------|--------------|
| 01-10 | Various | COMPLETE | Core app features |
| 11 | `11-voice-intelligence-layer.md` | WRITTEN | Help system, filler detection, scoring, spaced rep, timing |
| 12 | `12-android-emulator-testing.md` | WRITTEN | Android emulator setup + test matrix |
| 13A | `13a-twa-google-play.md` | WRITTEN | TWA packaging for Play Store |
| 13B | `13b-capacitor-native-android.md` | WRITTEN | Capacitor native shell migration |
| 14 | This file | WRITTEN | Post-launch roadmap (this document) |
| 15 | TBD | NOT WRITTEN | Barge-in + audio device picker |
| 16 | TBD | NOT WRITTEN | i18n + localization |
| 17 | TBD | NOT WRITTEN | AI Coach integration |
| 18 | TBD | NOT WRITTEN | Landing page + SEO |

---

## Decision Log

Record key decisions here as they're made:

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Web + Android only (no iOS App Store) | iOS requires Capacitor + Apple review. Ship fast, add later if needed. |
| 2026-03-29 | TWA first, Capacitor when needed | TWA is zero native code, instant updates. Capacitor for foreground service. |
| 2026-03-29 | No i18n before launch | Zero users = zero data on which languages matter. Ship English UI, add later. |
| 2026-03-29 | Barge-in is Phase 1 post-launch | #1 UX gap for driving. Must be able to interrupt TTS. |
| | | |

---

## How to Use This File

1. **Starting a new Claude Code session?** Say: "Read POST_LAUNCH_ROADMAP.md and CLAUDE.md, then tell me what's next."
2. **Completed a phase?** Update the Status field and add a date.
3. **Made a decision?** Add it to the Decision Log.
4. **Need a prompt written?** Reference the phase number: "Write the prompt for Phase 4A."
