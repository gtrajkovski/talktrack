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
**Status:** Deferred — core chunk integration complete

- Bookmarking at chunk level
- Pre-cache audio at sentence level

---

## Manual Testing

### User Journeys (8 total)
- [ ] New user onboarding
- [ ] Prompt mode rehearsal
- [ ] Test mode rehearsal
- [ ] PPTX import flow
- [ ] DOCX import flow
- [ ] Session resume
- [ ] Settings changes
- [ ] Stats review

### Data Integrity
- [ ] Session persistence across reload
- [ ] Cascade delete (talk → sessions)
- [ ] Export correctness

---

## Ideas / Parking Lot

(Add ideas here as they come up)
