# TalkTrack — Voice-First Rehearsal Coach

## Vision
Mobile-first web app that lets people rehearse spoken content (presentations, speeches, pitches, scripts) entirely hands-free and eyes-free. The first rehearsal tool designed for commuters.

## Tech Stack
- Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS 4
- Zustand for state, IndexedDB via idb for local storage
- Web Speech API (SpeechSynthesis + SpeechRecognition)
- JSZip for .pptx parsing, Mammoth for .docx, pdfjs-dist for PDF
- @mozilla/readability + linkedom for URL content extraction
- PWA via next-pwa for offline support
- Vitest + React Testing Library (696 tests)
- Hosted on Vercel

## Status
- **Current Phase**: v1.0 final testing (web PWA + Android TWA)
- **Post-launch roadmap**: See POST_LAUNCH_ROADMAP.md
- **Tests**: 696 passing
- **Build**: Clean
- **TypeScript**: Clean

## Completed Features
- Voice-first UX with earcons and StateOrb
- 3 rehearsal modes: Listen, Prompt, Test
- 35+ voice commands in 4 languages (EN, MK, SQ, IT)
- Import: Paste, PPTX, DOCX, PDF, URL
- Granularity: slide/paragraph/sentence modes
- Bookmarking, scoring, session timer
- ElevenLabs BYOK TTS integration
- VoiceBox Clone local TTS support
- Audio pre-cache for reduced latency
- CSV export for talk stats
- Offline-first PWA

## Key Differentiator
No existing tool (PowerPoint Speaker Coach, Orai, Speeko, Yoodli) works without looking at a screen. TalkTrack is 100% voice+ears, designed for driving.

## Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Build for production
npm test             # Run tests (696 passing)
npx tsc --noEmit     # Type check
npm run lint         # Lint
```
