# TalkTrack Backlog

## Incomplete Work

### Prompt 04 — VoiceBox Clone + Playback Controls (Partial)
**Status:** ~40% complete — progress tracking done, voice commands missing

**Completed:**
- [x] VoiceBox playback controller (progress tracking wrapper)
- [x] PlaybackIndicator component (progress bar + time remaining)
- [x] Sentence-level tracking for Web Speech API
- [x] Duration estimation from word count

**Missing:**
- [ ] Voice commands: "faster", "slower", "normal speed"
- [ ] Voice commands: "go to slide 5", "first slide", "last slide"
- [ ] Voice commands: "where am I", "how many left", "time remaining"
- [ ] Speed/volume visual badges on rehearsal screen
- [ ] `useRehearsalCommands` shared hook for all modes
- [ ] VoiceBox clone API client (third TTS engine)
- [ ] Pre-caching cloned voice audio for offline

---

## Future Prompts

### Prompt 05 — Volume, Bookmarks, Scores, Timer, Smart Practice
- Volume controls (louder/quieter/mute/unmute/max)
- Section navigation (next section, go to section, list sections)
- Slide bookmarking ("mark this" → "practice bookmarks")
- Auto-bookmark slides scored below 50
- Score queries by voice ("how did I do", "average", "worst slides")
- Smart practice modes ("hard slides only", "titles only")
- Session timer with warnings
- Repeat variations (repeat slowly, repeat title only)

### Prompt 06 — Sentence / Paragraph / Slide Modes
- Content chunking engine
- Smart sentence splitter
- Three granularity levels per mode
- Per-chunk scoring
- Voice commands to switch mid-session

### Prompt 07 — Final Triple Audit
- TypeScript, dependencies, dead code audit
- 8 user journeys end-to-end testing
- Performance, accessibility, error resilience

---

## Ideas / Parking Lot

(Add ideas here as they come up)
