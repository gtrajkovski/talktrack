# TalkTrack Backlog

## Deferred Work

### VoiceBox Clone API (Optional)
**Status:** Deferred — not needed for core functionality

The VoiceBox local API integration (localhost:17493) was originally planned as a third TTS engine option. Deferred as ElevenLabs + browser TTS provides good quality and offline resilience.

If needed later:
- VoiceBox local API client
- VoiceBox as third TTS engine with priority routing
- Pre-cache for mobile/offline using VoiceBox
- Settings UI for VoiceBox profiles

### Section Navigation
**Status:** Deferred from Prompt 05

- Commands: nextSection, prevSection, goToSection, listSections
- parseGoToSectionCommand() in voiceCommands.ts

### Chunk-Level UI Integration
**Status:** Deferred from Prompt 06

- ListenMode: chunk-by-chunk auto-play with paragraph/sentence pauses
- PromptMode: first-3-words cue for sentences, paragraph labels
- TestMode: pure recall (sentence number only, no cue)
- Progress bar reflects chunk count
- Bookmarking at chunk level
- Pre-cache audio at sentence level

---

## Technical Debt

### Test Coverage
- Unit tests for earcons.ts
- Unit tests for voiceCommands.ts / i18n/voiceCommands.ts
- Unit tests for similarity.ts scoring
- Unit tests for commandHints.ts

### Manual Testing
- 8 user journeys end-to-end (new user, prompt mode, test mode, PPTX, DOCX, resume, settings, stats)
- Data integrity verification (session persistence, cascade delete, export correctness)

### PWA Enhancement
- Generate PNG icons from SVG for broader compatibility (currently SVG-only)

---

## Ideas / Parking Lot

(Add ideas here as they come up)
