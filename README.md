# TalkTrack

**Voice-First Rehearsal Coach** — Practice presentations, speeches, and scripts hands-free while driving or commuting.

## What Makes TalkTrack Different

No existing rehearsal tool works without looking at a screen. PowerPoint Speaker Coach, Orai, Speeko, and Yoodli all require visual interaction. TalkTrack is 100% voice+ears, designed for people who want to practice during their commute.

## Features

- **3 Rehearsal Modes**: Listen (passive), Prompt (cued recall), Test (full recall with scoring)
- **Voice-First Control**: 35+ voice commands in 4 languages (EN, MK, SQ, IT)
- **Multiple Import Options**: Paste text, upload PPTX/DOCX/PDF, or import from URL
- **Flexible Granularity**: Practice by slide, paragraph, or sentence
- **Bookmarking**: Mark difficult sections for focused practice
- **Session Timer**: Track your rehearsal time
- **Offline PWA**: Works without internet after first load
- **TTS Options**: Web Speech API, ElevenLabs BYOK, or VoiceBox Clone local server

## Tech Stack

- Next.js 16 (App Router, React 19)
- TypeScript
- Tailwind CSS 4
- Zustand (state management)
- IndexedDB via idb (local storage)
- Web Speech API (synthesis + recognition)
- Vitest + React Testing Library (696 tests)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

```bash
npm run dev          # Development server
npm run build        # Production build
npm test             # Run tests
npx tsc --noEmit     # Type check
npm run lint         # Lint
```

## License

MIT
