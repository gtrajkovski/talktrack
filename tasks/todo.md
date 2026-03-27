# TalkTrack — Active Work

## Current Status
- **Prompts 01-04:** Complete
- **Next:** Prompt 05 (Volume, Bookmarks, Scores, Timer)

## Prompt Reference

### Prompt 01 — Voice-First UX Overhaul — ✅ COMPLETE
1. ✅ Earcon feedback system (`src/lib/audio/earcons.ts`)
2. ✅ Glanceable rehearsal screen / StateOrb (`src/components/rehearsal/StateOrb.tsx`)
3. ✅ Progressive command disclosure (`src/lib/commandHints.ts`)
4. ✅ Multimodal state sync (audioState in rehearsalStore)
5. ✅ Patience mode + graceful error recovery
6. ✅ Positive reinforcement + session completion

### Prompt 02 — Audio-First Enforcement Audit — ✅ COMPLETE
1. ✅ Map every interaction point (VOICE/AUTO/TAP classification)
2. ✅ Listen Mode fully automatic (sentence chunking, auto-advance)
3. ✅ Prompt Mode recognition lifecycle (aggressive restart, iOS handoff)
4. ✅ Test Mode auto-scoring with transcript accumulation
5. ✅ Voice command detection (ends-with matching, debounce)
6. ✅ CompletionScreen voice-driven ("again"/"done")
7. ✅ Audit all tap handlers (demoted to fallback)
8. ✅ Gap elimination (pre-warm recognition)
9. ✅ Earcons for every state change
10. ✅ End-to-end voice-only verification

### Prompt 03 — Voice Selection Overhaul — ✅ COMPLETE
**Tier 1: Browser Voice Picker**
- ✅ Curated voice registry (`voiceRegistry.ts` → now `voices.ts`)
- ✅ Smart voice matcher with quality tiers
- ✅ Voice picker in Settings with grouping
- ✅ Preview button with sample sentence

**Tier 2: ElevenLabs BYOK**
- ✅ ElevenLabs client (`elevenlabs.ts`)
- ✅ Unified `speak()` function routing
- ✅ Settings UI for API key, voice, model
- ✅ Quota display and validation

**Tier 3: Voice Preview**
- ✅ Quick preview in Settings
- ✅ First-run voice picker modal (`VoicePickerModal.tsx`)

**Tier 4: Offline Resilience**
- ✅ Auto-fallback to browser TTS when offline
- ✅ In-session audio caching

### Prompt 04 — VoiceBox Clone + Playback Controls — ✅ COMPLETE
**Part 1: VoiceBox Integration** (adapted from spec)
- ✅ `voicebox.ts` created — playback progress wrapper for unified TTS
- ✅ PlaybackIndicator with progress tracking
- ⏭️ VoiceBox local API deferred (optional feature)

**Part 2: Voice Playback Controls**
- ✅ Speed commands: "faster", "slower", "normal speed"
- ✅ Navigation: "go to slide N", "first slide", "last slide"
- ✅ Info queries: "where am I", "how many left", "time remaining"
- ✅ `useRehearsalCommands` shared hook (`src/hooks/useRehearsalCommands.ts`)
- ✅ Speed change earcons (speedUp, speedDown, navigationJump, infoQuery)
- ✅ Visual speed badge (`SpeedBadge.tsx` integrated into StateOrb)
- ✅ Speed multiplier state in rehearsalStore
- ✅ Voice commands in all 4 languages (EN, MK, SQ, IT)
- ✅ `parseGoToSlideNumber()` for "go to slide 5" parsing

### Prompt 05 — Complete Voice-Driven Audio Controls — ⚠️ IN PROGRESS
**1. Volume Controls** ✅
- [x] Volume system in synthesis.ts (utterance.volume for browser, audio.volume for ElevenLabs)
- [x] Commands: louder, quieter, maxVolume, mute, unmute (all 4 languages)
- [x] Visual volume indicator (VolumeBadge component)

**2. Section Navigation**
- [ ] Commands: nextSection, prevSection, goToSection, listSections
- [ ] parseGoToSectionCommand() in voiceCommands.ts

**3. Slide Bookmarking** (commands defined, implementation pending)
- [ ] bookmarkedSlides in rehearsalStore
- [ ] Persist to IndexedDB per-talk
- [x] Commands defined: bookmark, listBookmarks, practiceBookmarks, clearBookmarks
- [ ] Auto-bookmark on score < 50
- [ ] Command handlers in useRehearsalCommands

**4. Score & Progress Queries** (commands defined, handlers pending)
- [x] Commands defined: howDidIDo, myAverage, worstSlides
- [ ] Command handlers in useRehearsalCommands

**5. Smart Practice Modes** (commands defined, implementation pending)
- [ ] filteredSlideIndices and repeatMode in store
- [x] Commands defined: hardOnly, allSlides
- [ ] Command handlers in useRehearsalCommands

**6. Session Timer** — deferred to Prompt 06/07

**7. Repeat Variations** (commands defined, handlers pending)
- [x] Commands defined: repeatSlowly, repeatTitle
- [ ] Command handlers in useRehearsalCommands

**8-9. Full Command Reference**
- [x] 35+ commands defined across all languages
- [ ] Progressive disclosure update

### Prompt 06 — Rehearsal Granularity (Sentence/Paragraph/Slide) — ❌ NOT STARTED
**1. Content Chunking Engine**
- [ ] `chunker.ts` with chunkSlide(), chunkTalk()
- [ ] Smart sentence splitter (handles abbreviations, decimals, ellipsis)
- [ ] Merge short sentences (<5 words)
- [ ] Tests in chunker.test.ts

**2. Store Updates**
- [ ] granularity, chunks, currentChunkIndex in rehearsalStore
- [ ] setGranularity(), rebuildChunks(), advanceChunk(), goBackChunk()

**3. Mode Adaptations**
- [ ] ListenMode: chunk-by-chunk auto-play with paragraph/sentence pauses
- [ ] PromptMode: first-3-words cue for sentences, paragraph labels
- [ ] TestMode: pure recall (sentence number only, no cue)

**4. Chunk-Level Scoring**
- [ ] ChunkAttempt type in session.ts
- [ ] Aggregate to slide scores for backward compatibility
- [ ] Qualitative feedback for sentence-level ("Nailed it" / "Close" / "Not quite")

**5. Voice Commands**
- [ ] sentenceMode, paragraphMode, slideMode, whatMode
- [ ] Mid-session switching with position preservation

**6. Progress Tracking**
- [ ] Progress bar reflects chunk count
- [ ] Position label: "3/12 • S 5/18" format

**7. New Earcon**
- [ ] paragraphBreak() — subtle G4 tone

**8. Settings UI**
- [ ] Default granularity selector

**9. Integration**
- [ ] Bookmarking at chunk level
- [ ] Pre-cache audio at sentence level

### Prompt 07 — Final Triple-Pass Audit — ❌ NOT STARTED
**Pass 1: Infrastructure, Build & Runtime**
- [ ] TypeScript — zero errors, no `any` types, no unused imports/vars
- [ ] Dependencies — remove unused, fix peer conflicts
- [ ] Config audit — tsconfig, next.config, tailwind.config, postcss
- [ ] File structure — no dead code, no circular imports
- [ ] IndexedDB schema — migrations, upgrade handlers
- [ ] PWA — manifest, service worker, meta tags
- [ ] Security — no secrets, no external fetches, no console.log

**Pass 2: UX Flows & State Machine**
- [ ] 8 user journeys end-to-end (new user, prompt mode, test mode, PPTX, DOCX, resume, settings, stats)
- [ ] State machine audit — no stuck states, proper cleanup
- [ ] Speech edge cases — Chrome Android chunking, iOS conflict, voice loading race
- [ ] Voice command accuracy — false positive filtering
- [ ] Earcon integration — all triggers wired
- [ ] Progressive hints — frequency logic, persistence

**Pass 3: Polish, Performance, Accessibility**
- [ ] Performance — granular selectors, CSS animations, dynamic imports, no memory leaks
- [ ] Accessibility — aria labels, focus management, keyboard nav, color contrast, reduced motion
- [ ] Error handling — try/catch everywhere, graceful degradation
- [ ] CSS — 375px viewport, safe areas, dark theme, transitions
- [ ] Data integrity — session persistence, cascade delete, export correctness
- [ ] Test coverage — earcons, voiceCommands, similarity, commandHints
- [ ] Production build — no warnings, chunk sizes, static generation

---

## Queue

(Next prompts will be added here)

---

## Completed This Session

- [x] Completed Prompt 04 Part 2: Voice Playback Controls
  - Added speed commands (faster/slower/normal speed)
  - Added navigation commands (first/last slide, go to slide N)
  - Added info query commands (where am I, how many left, time remaining)
  - Created `useRehearsalCommands` shared hook
  - Added speedUp/speedDown/navigationJump/infoQuery earcons
  - Created SpeedBadge component (integrated into StateOrb)
  - Added speed multiplier state to rehearsalStore
  - Updated voice commands for all 4 languages
