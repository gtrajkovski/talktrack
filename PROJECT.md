# TalkTrack — Voice-First Rehearsal Coach

## Vision
Mobile-first web app that lets people rehearse spoken content (presentations, speeches, pitches, scripts) entirely hands-free and eyes-free. The first rehearsal tool designed for commuters.

## Tech Stack
- Next.js 14+ (App Router), TypeScript, Tailwind CSS 3.x
- Zustand for state, IndexedDB via idb for local storage
- Web Speech API (SpeechSynthesis + SpeechRecognition)
- JSZip for .pptx parsing, Mammoth for .docx, pdfjs-dist for PDF
- @mozilla/readability + linkedom for URL content extraction
- PWA via next-pwa for offline support
- Vitest for testing (323 tests)
- Hosted on Vercel

## Status
- **Current Phase**: Prompts 01-09 complete
- **Tests**: 323 passing
- **Build**: Clean

## Completed Features
- Voice-first UX with earcons and StateOrb
- 3 rehearsal modes: Listen, Prompt, Test
- 35+ voice commands in 4 languages (EN, MK, SQ, IT)
- Import: Paste, PPTX, DOCX, PDF, URL
- Granularity: slide/paragraph/sentence modes
- Bookmarking, scoring, session timer
- ElevenLabs BYOK TTS integration
- Offline-first PWA

## Key Differentiator
No existing tool (PowerPoint Speaker Coach, Orai, Speeko, Yoodli) works without looking at a screen. TalkTrack is 100% voice+ears, designed for driving.
