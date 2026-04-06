# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TalkTrack is a mobile-first PWA for hands-free, eyes-free rehearsal of spoken content (presentations, speeches, scripts). The core use case: rehearsing a presentation while driving, using only voice commands and audio feedback.

**Status:** v1.0 shipped. See `POST_LAUNCH_ROADMAP.md` for current phase and priorities.

## Development Commands

```bash
npm run dev          # Dev server (uses --webpack flag for Next.js 16)
npm run build        # Production build
npm test             # Run vitest in watch mode
npm run test:run     # Run tests once (CI)
npm run test:ui      # Vitest UI
npx tsc --noEmit     # Type check
npm run lint         # ESLint
```

Run a single test file:
```bash
npx vitest tests/parsers/pptx.test.ts
npx vitest -t "should parse slides"  # Run by test name pattern
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, Turbopack — note: uses `--webpack` flag due to PWA compatibility)
- **State:** Zustand (stores in `src/stores/`)
- **Database:** IndexedDB via `idb` (all data client-side, see `src/lib/db/`)
- **Speech:** Web Speech API for synthesis and recognition
- **File Parsing:** jszip (PPTX), mammoth (DOCX), pdfjs-dist (PDF)
- **Testing:** Vitest + React Testing Library + fake-indexeddb
- **Styling:** Tailwind CSS 4

## Architecture

### Data Flow
```
User imports content → Parsers (lib/parsers/) → IndexedDB (lib/db/) → Zustand stores → UI
                                                                    ↓
                    Speech Recognition ← Rehearsal Session → Speech Synthesis
```

### Key Stores (`src/stores/`)
- **rehearsalStore** — Active session state: current slide/chunk, playback, bookmarks, audio state, scoring
- **talksStore** — CRUD for talks, delegates to `lib/db/talks.ts`
- **settingsStore** — User preferences (voice, rate, theme), persisted to IndexedDB

### Rehearsal Modes
- **Listen** — TTS reads all notes, user listens passively
- **Prompt** — TTS reads title only, user recites from memory, can say "reveal"
- **Test** — Minimal prompt, user recites everything, scored on similarity

### Speech Integration (`src/lib/speech/`)
- **synthesis.ts** — TTS wrapper with sentence chunking (Chrome Android workaround), queue management
- **voices.ts** — Voice quality detection, ElevenLabs/VoiceBox BYOK support
- **voiceAssistant.ts** — Context-aware help system
- **sessionDebrief.ts** — End-of-session spoken summary

### Granularity System (`src/lib/utils/chunker.ts`)
Slides can be rehearsed at different granularities: sentence, paragraph, or full slide. The chunker splits slide content into navigable chunks.

### Voice Commands (`src/hooks/useRehearsalCommands.ts`)
35+ commands in 4 languages (EN/MK/SQ/IT). Commands are matched against the last 5 words of continuous recognition transcript. Key commands: next, back, repeat, reveal, help, bookmark, faster/slower.

## Testing

Tests are in `tests/` with this structure:
- `tests/setup.ts` — Global mocks for SpeechSynthesis, SpeechRecognition, AudioContext, IndexedDB
- `tests/mocks/` — Reusable mock implementations
- `tests/integration/` — Multi-module tests (import→rehearsal, scoring)
- `tests/db/`, `tests/parsers/`, `tests/stores/` — Unit tests by domain

The test setup automatically provides:
- `fake-indexeddb` for IndexedDB operations
- Mock `speechSynthesis` with configurable duration
- Mock `webkitSpeechRecognition` for voice command testing

## Critical Constraints

### Speech API Gotchas
- iOS Safari: recognition and synthesis cannot run simultaneously — pause recognition during TTS
- Chrome Android: TTS stops mid-sentence on long text — synthesis.ts chunks into sentences
- `speechSynthesis.getVoices()` returns empty on first call — use `voiceschanged` event
- Always call `speechSynthesis.cancel()` before new speech

### Mobile Requirements
- All buttons min 48px touch target, primary actions 60px
- Dark theme by default (driving at night)
- Voice commands are PRIMARY input, tap is fallback
- Works offline after first load (PWA with service worker)

### Next.js 16 Notes
- Uses `--webpack` flag in dev/build scripts (Turbopack doesn't work with next-pwa)
- See AGENTS.md for Next.js version-specific guidance

## File Locations

| Concern | Location |
|---------|----------|
| Routes | `src/app/` (App Router) |
| UI components | `src/components/ui/` |
| Rehearsal UI | `src/components/rehearsal/` |
| Zustand stores | `src/stores/` |
| IndexedDB layer | `src/lib/db/` |
| Speech APIs | `src/lib/speech/` |
| File parsers | `src/lib/parsers/` |
| Scoring algorithms | `src/lib/scoring/` |
| Type definitions | `src/types/` |
| Voice command i18n | `src/lib/i18n/` |
| Work tracking | `tasks/` (todo.md, backlog.md) |

## Common Tasks

**Adding a voice command:** Update `src/lib/i18n/index.ts` with translations, then update `src/hooks/useRehearsalCommands.ts` to handle the command.

**Adding a file parser:** Create in `src/lib/parsers/`, export from `src/lib/parsers/index.ts`, add to FileUpload component.

**Modifying rehearsal flow:** The rehearsal page (`src/app/talk/[id]/rehearse/page.tsx`) orchestrates mode-specific components. Each mode (Listen/Prompt/Test) has its own component in `src/components/rehearsal/`.
