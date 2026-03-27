# TalkTrack Backlog

## Deferred Work

### VoiceBox Clone API (Optional)
**Status:** Deferred — not needed for core functionality

The VoiceBox local API integration (localhost:17493) was originally planned as a third TTS engine option. This is deferred as the current ElevenLabs + browser TTS setup provides good voice quality and offline resilience.

If needed later:
- VoiceBox local API client
- VoiceBox as third TTS engine with priority routing
- Pre-cache for mobile/offline using VoiceBox
- Settings UI for VoiceBox profiles

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
