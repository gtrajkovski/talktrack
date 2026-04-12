# TalkTrack Backlog

## Deferred Work

### VoiceBox Clone API (Optional)
**Status:** Deferred — not needed for core functionality

The VoiceBox local API integration (localhost:17493) was originally planned as a third TTS engine option. Deferred as ElevenLabs + browser TTS provides good quality and offline resilience.

### Section Navigation
**Status:** ✅ Complete (2026-03-28)

- ✅ Commands: nextSection, prevSection, goToSection, listSections
- ✅ parseGoToSectionCommand() in voiceCommands.ts
- ✅ All 4 languages supported (EN, MK, SQ, IT)
- ✅ 18 new tests added

### Chunk-Level Enhancements
**Status:** ✅ Complete

- ✅ Bookmarking at chunk level (toggleChunkBookmark, isChunkBookmarked, etc.)
- ✅ Pre-cache audio at sentence level (precache.ts, usePrecache.ts)

---

## Manual Testing

### User Journeys (10 total)
- [ ] New user onboarding
- [ ] Prompt mode rehearsal
- [ ] Test mode rehearsal
- [ ] PPTX import flow
- [ ] DOCX import flow
- [ ] PDF import flow
- [ ] URL import flow
- [ ] Session resume
- [ ] Settings changes
- [ ] Stats review

### Data Integrity
- [ ] Session persistence across reload
- [ ] Cascade delete (talk → sessions)
- [ ] Export correctness

---

## Phase 7 Status

| Feature | Status |
|---------|--------|
| Warm-up exercises | ✅ Complete |
| Recording capture | ✅ Complete (saves to IndexedDB) |
| Recording playback UI | ✅ Complete |
| Audience simulation | ✅ Complete |
| Conference Day companion | ✅ Complete |
| Team/coach sharing | Not started |
| Multi-device sync | Not started |
| Presentation structure feedback | Not started |

---

## Ideas / Parking Lot

(Add ideas here as they come up)
