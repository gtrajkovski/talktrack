# CLAUDE.md — TalkTrack: Voice-First Rehearsal Coach

## Project Overview

TalkTrack is a mobile-first web app that lets people rehearse spoken content (presentations, speeches, pitches, scripts, sermons, lines) entirely hands-free and eyes-free. The core use case: someone driving to a conference who wants to rehearse their presentation using only their voice and ears.

No existing tool does this. PowerPoint Speaker Coach, Orai, Speeko, and Yoodli all require looking at a screen. TalkTrack is the first rehearsal tool designed for commuters.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.x
- **State**: Zustand (lightweight, no boilerplate)
- **Speech Synthesis**: Web Speech API (SpeechSynthesis) with fallback to browser defaults
- **Speech Recognition**: Web Speech API (SpeechRecognition / webkitSpeechRecognition)
- **File Parsing**: mammoth (for .docx), jszip + custom XML parser (for .pptx speaker notes extraction)
- **Audio**: Web Audio API for chimes/tones between slides
- **PWA**: next-pwa for installable mobile experience with offline support
- **Database**: IndexedDB via idb for local storage of talks, progress, recordings
- **Hosting**: Vercel
- **Testing**: Vitest + React Testing Library

## Project Structure

```
talktrack/
├── CLAUDE.md
├── PROJECT.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── public/
│   ├── manifest.json
│   ├── icons/
│   ├── sounds/
│   │   ├── chime.mp3
│   │   ├── start.mp3
│   │   └── complete.mp3
│   └── sw.js
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── talk/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── rehearse/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── slides/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── stats/
│   │   │   │       └── page.tsx
│   │   ├── import/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── BigTapButton.tsx
│   │   ├── rehearsal/
│   │   │   ├── ListenMode.tsx
│   │   │   ├── PromptMode.tsx
│   │   │   ├── TestMode.tsx
│   │   │   ├── SlideHeader.tsx
│   │   │   ├── VoiceStatus.tsx
│   │   │   ├── RehearsalControls.tsx
│   │   │   └── CompletionScreen.tsx
│   │   ├── import/
│   │   │   ├── PasteImport.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── VoiceRecord.tsx
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       ├── BottomNav.tsx
│   │       └── Header.tsx
│   ├── lib/
│   │   ├── speech/
│   │   │   ├── synthesis.ts
│   │   │   ├── recognition.ts
│   │   │   ├── voiceCommands.ts
│   │   │   └── voices.ts
│   │   ├── audio/
│   │   │   └── chime.ts
│   │   ├── parsers/
│   │   │   ├── pptx.ts
│   │   │   ├── docx.ts
│   │   │   ├── text.ts
│   │   │   └── markdown.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── talks.ts
│   │   │   ├── sessions.ts
│   │   │   └── recordings.ts
│   │   ├── scoring/
│   │   │   ├── similarity.ts
│   │   │   ├── pacing.ts
│   │   │   └── fillerWords.ts
│   │   └── utils/
│   │       ├── wordCount.ts
│   │       ├── estimateTime.ts
│   │       └── formatDuration.ts
│   ├── stores/
│   │   ├── rehearsalStore.ts
│   │   ├── settingsStore.ts
│   │   └── talksStore.ts
│   └── types/
│       ├── talk.ts
│       ├── session.ts
│       └── settings.ts
└── tests/
    ├── parsers/
    │   ├── pptx.test.ts
    │   ├── text.test.ts
    │   └── markdown.test.ts
    ├── speech/
    │   └── voiceCommands.test.ts
    └── scoring/
        └── similarity.test.ts
```

## Data Models

```typescript
// types/talk.ts
interface Talk {
  id: string;                    // nanoid
  title: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  totalRehearsals: number;
  source: "paste" | "pptx" | "docx" | "voice" | "demo";
}

interface Slide {
  id: string;
  index: number;
  title: string;
  notes: string;
  wordCount: number;
  estimatedSeconds: number;      // wordCount / wordsPerMinute * 60
  timesRehearsed: number;
  lastScore?: number;            // 0-100 similarity score
  keyPhrases?: string[];
}

// types/session.ts
interface RehearsalSession {
  id: string;
  talkId: string;
  mode: "listen" | "prompt" | "test";
  startedAt: number;
  completedAt?: number;
  slidesCompleted: number;
  totalSlides: number;
  attempts: SlideAttempt[];
}

interface SlideAttempt {
  slideId: string;
  slideIndex: number;
  spokenText?: string;
  similarityScore?: number;
  wordsPerMinute?: number;
  fillerWordCount?: number;
  duration?: number;
  usedHelp: boolean;
}

// types/settings.ts
interface UserSettings {
  voiceName: string;
  speechRate: number;            // 0.7 - 1.3 (default 0.95)
  autoAdvance: boolean;          // default true
  autoAdvanceDelay: number;      // seconds (default 1)
  showWordCount: boolean;
  enableVoiceCommands: boolean;
  theme: "dark" | "light";      // default dark
  wordsPerMinute: number;        // default 100
}
```

## Build Instructions

Build TalkTrack from scratch following this exact order. Each step is a vertical slice — get it fully working before moving to the next.

### Step 1: Project Setup

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint
npm install zustand idb jszip mammoth nanoid
```

- Set up Tailwind config with the design system colors below
- Set up Google Font "Outfit" in layout.tsx
- Add PWA meta tags (viewport, apple-mobile-web-app-capable, theme-color)
- Create CSS variables in globals.css

### Step 2: Types & Data Layer

1. Create `types/talk.ts`, `types/session.ts`, `types/settings.ts` matching the interfaces above
2. Create `lib/db/index.ts` — IndexedDB setup via idb with stores for talks, sessions, recordings
3. Create `lib/db/talks.ts` — CRUD (getAllTalks, getTalk, createTalk, updateTalk, deleteTalk)
4. Create `lib/db/sessions.ts` — session history CRUD
5. Create Zustand stores: `stores/talksStore.ts`, `stores/rehearsalStore.ts`, `stores/settingsStore.ts`
6. Create `lib/utils/wordCount.ts`, `estimateTime.ts`, `formatDuration.ts`

### Step 3: UI Primitives

Build in `components/ui/`:
- **Button.tsx** — full-width, min 60px tall, scale(0.97) on active, variants: primary (amber), secondary (surface-light), danger
- **Card.tsx** — surface background, 16px radius, padding
- **ProgressBar.tsx** — smooth width transition 400ms, amber fill
- **Badge.tsx** — status badges ("Listening...", "Your turn", etc.)
- **Modal.tsx** — bottom sheet style for mobile
- **BigTapButton.tsx** — extra-large 60px+ touch targets for driving

All: Tailwind, dark theme default, min 48px touch targets.

### Step 4: Layout Shell

1. `components/layout/AppShell.tsx` — main wrapper with safe areas
2. `components/layout/Header.tsx` — top bar with title + optional back button
3. `components/layout/BottomNav.tsx` — 3 tabs: Home, Import, Settings (large tap targets)
4. Wire into `app/layout.tsx`

### Step 5: Import Flow (Paste-to-Rehearse)

1. `app/import/page.tsx` — tabbed: Paste / Upload / Record
2. `components/import/PasteImport.tsx`:
   - Large textarea for pasting text
   - Parse: split by blank lines, first line = slide title, rest = notes
   - Preview parsed slides before saving
   - Generate nanoid for talk and each slide
   - Calculate wordCount and estimatedSeconds per slide
   - Save to IndexedDB via talksStore
   - Navigate to home after save
3. `components/import/FileUpload.tsx` — stub "Coming Soon" for now
4. `components/import/VoiceRecord.tsx` — stub for now

### Step 6: Home Screen

1. `app/page.tsx` — list all talks from IndexedDB
   - Each: title, slide count, total rehearsals, last practiced
   - Tap → navigate to `/talk/[id]`
   - Empty state: "No talks yet. Import your first one."
   - Prominent button to `/import`
2. `app/talk/[id]/page.tsx` — talk detail:
   - Title, slide count, time estimate
   - Three big mode buttons: Listen, Prompt, Test (each with description)
   - "View Slides" → `/talk/[id]/slides`
   - "Stats" → `/talk/[id]/stats`
3. `app/talk/[id]/slides/page.tsx` — view/edit all slides

### Step 7: Speech Synthesis

1. `lib/speech/synthesis.ts`:
   - `speak(text, rate?)` — wraps SpeechSynthesisUtterance
   - `stop()` — calls `speechSynthesis.cancel()`
   - `pause()` / `resume()`
   - `onEnd` callback
   - Handle `voiceschanged` event for voice loading
   - Break long text into sentences (Chrome Android bug workaround)
   - Always `cancel()` before new `speak()`
2. `lib/speech/voices.ts` — voice selection, quality detection
3. `lib/audio/chime.ts` — Web Audio API:
   - `slideTransition()` — short pleasant chime
   - `sessionStart()` — ascending tone
   - `sessionComplete()` — celebratory tone

### Step 8: Rehearsal Screen — Listen Mode (CORE EXPERIENCE)

`app/talk/[id]/rehearse/page.tsx`:

1. `components/rehearsal/SlideHeader.tsx` — "Slide 3 of 12", large title
2. `components/rehearsal/VoiceStatus.tsx` — badge: "Playing...", "Paused", "Your turn"
3. Giant ProgressBar at top
4. `components/rehearsal/ListenMode.tsx`:
   - Auto-play: TTS reads current slide's notes
   - On complete: chime, wait autoAdvanceDelay, advance
   - Controls row (equal-width, min 52px): Back / Repeat / Next
   - Session start sound on mount, complete sound on last slide
5. `components/rehearsal/RehearsalControls.tsx` — shared control bar
6. `components/rehearsal/CompletionScreen.tsx` — "Rehearsal Complete!" + stats
7. Wire rehearsalStore: currentSlideIndex, mode, isPlaying, sessionData

**Must have**: 60px primary buttons, 52px secondary, 200ms fade transitions, dark theme, huge tap targets.

### Step 9: Prompt Mode

`components/rehearsal/PromptMode.tsx`:
1. TTS reads slide title only, then pauses
2. VoiceStatus: "Your turn — speak from memory"
3. "Reveal Answer" big button → TTS reads full notes
4. After reveal: Back / Repeat / Next
5. Track `usedHelp: true` if they tapped Reveal

### Step 10: Test Mode

`components/rehearsal/TestMode.tsx`:
1. TTS reads "Slide [N]: [title]" only
2. VoiceStatus: "Your turn"
3. "Need Help" → reveals and reads notes (usedHelp: true)
4. "Got It — Next" → advances
5. Back / Repeat Title controls

### Step 11: Settings

`app/settings/page.tsx`:
- Voice selection dropdown
- Speech rate slider (0.7 - 1.3, default 0.95)
- Auto-advance toggle + delay slider
- Words per minute setting
- Theme toggle (dark/light)
- Voice commands toggle
- Persist via settingsStore → IndexedDB

### Step 12: Stats

`app/talk/[id]/stats/page.tsx`:
- Total rehearsals count
- Per-slide breakdown: times rehearsed, word count, estimated time
- Session history with dates and mode

### Step 13: Text & Markdown Parsers

`lib/parsers/text.ts`:
- Split by double newlines
- First line = title, rest = notes
- Calculate wordCount and estimatedSeconds

`lib/parsers/markdown.ts`:
- `## heading` = slide title
- Content below = notes

### Step 14: PPTX & DOCX Parsers

`lib/parsers/pptx.ts`:
- JSZip to unzip .pptx ArrayBuffer
- Extract titles from `ppt/slides/slideN.xml` (`<p:ph type="title"/>` placeholder)
- Extract notes from `ppt/notesSlides/notesSlideN.xml` (all `<a:t>` text nodes)
- Filter out auto-generated slide number text
- Return `Slide[]`

`lib/parsers/docx.ts`:
- mammoth.js to parse
- Split by H1/H2 headings or blank lines

Wire `FileUpload.tsx` to use parsers with file type detection.

### Step 15: Speech Recognition

`lib/speech/recognition.ts`:
- Wrapper around `webkitSpeechRecognition`
- `listen()` — continuous with interimResults
- `stop()`, `onResult` callback
- Auto-restart on silence (onend handler)
- Feature detection + graceful fallback

`lib/speech/voiceCommands.ts`:
- Match last 5 words of transcript
- Commands: next, back, repeat, reveal, help, stop, resume
- Simple keyword matching
- Return command name or null

`lib/scoring/similarity.ts`:
- Normalize (lowercase, remove punctuation)
- Tokenize, remove stop words
- Word overlap percentage
- Bonus for key phrases, cap at 100

`lib/scoring/fillerWords.ts`:
- Detect "um", "uh", "like", "you know", "so", "basically", "actually"

`lib/scoring/pacing.ts`:
- Words per minute from transcript + duration

Integrate into Prompt/Test modes: record speech, show transcript, display score/filler count/WPM.

## Voice Commands Spec

```typescript
const COMMANDS = {
  next:    ["next", "next slide", "forward", "continue", "skip", "move on"],
  back:    ["back", "previous", "go back", "last slide", "before"],
  repeat:  ["repeat", "again", "say that again", "one more time", "replay"],
  reveal:  ["reveal", "show me", "tell me", "what is it", "answer"],
  help:    ["help", "hint", "i need help", "stuck", "i don't know"],
  stop:    ["stop", "pause", "hold on", "wait"],
  resume:  ["resume", "continue", "go", "keep going", "start"],
};
// Match against last 5 words of continuous recognition transcript.
```

## Design System

### Colors (CSS Variables)

```css
:root {
  --bg: #0f1729;
  --surface: #1a2744;
  --surface-light: #243352;
  --accent: #f59e0b;        /* Amber */
  --accent-dim: #b45309;
  --blue: #3b82f6;
  --text: #f1f5f9;
  --text-dim: #94a3b8;
  --success: #22c55e;
  --danger: #ef4444;
  --radius: 16px;
  --radius-sm: 12px;
}
```

### Typography
- Font: "Outfit" (Google Fonts, variable weight)
- Titles: 800 weight, -0.02em tracking
- Body: 400 weight
- UI labels: 600 weight, 0.05em tracking, uppercase

### Touch Targets
- Primary action buttons: min 60px tall, full width
- Control buttons (Back/Repeat/Next): min 52px tall, equal-width flex row
- No small icons or links — everything tappable with a thumb

### Animations
- Slide transitions: 200ms fade
- Progress bar: 400ms ease width transition
- Button press: scale(0.97) on active (100ms)
- Keep minimal — utility app, not visual showcase

## Scoring Algorithm

```
1. Normalize both strings (lowercase, remove punctuation, trim)
2. Tokenize into words
3. Remove stop words (the, a, an, is, was, are, etc.)
4. Calculate overlap:
   - contentWords = meaningful words from original notes
   - spokenWords = meaningful words from user's speech
   - hits = contentWords that appear in spokenWords
   - score = (hits.length / contentWords.length) * 100
5. Bonus: +5 points if user hits ALL key phrases
6. Cap at 100
```

## Speech Implementation Notes

### Synthesis Gotchas
- `speechSynthesis.getVoices()` returns empty on first call. Use `voiceschanged` event.
- iOS Safari: speech synthesis requires user gesture. First `speak()` must be inside click/tap handler.
- Chrome Android: sometimes stops mid-sentence. Break long notes into sentences and chain.
- Always `speechSynthesis.cancel()` before new speech.

### Recognition Gotchas
- `webkitSpeechRecognition` is correct on most browsers (not `SpeechRecognition`).
- Set `continuous = true` and `interimResults = true`.
- Auto-stops after silence — restart in `onend` handler if session active.
- iOS: recognition and synthesis cannot run simultaneously. Stop synthesis first.

### PWA / Mobile
- Test on actual phones, not just DevTools responsive mode.
- iOS Safari has limited Speech Recognition — feature-detect + graceful fallback.
- `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`

### Performance
- IndexedDB operations are async — never block UI.
- PPTX parsing can be slow — show progress, parse in Web Worker if possible.
- Keep rehearsal screen React tree shallow — re-renders during speech cause stuttering.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Build for production
npm test             # Run tests
npx tsc --noEmit     # Type check
npm run lint         # Lint
```

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "zustand": "^4.5",
    "idb": "^8.0",
    "jszip": "^3.10",
    "mammoth": "^1.8",
    "nanoid": "^5.0"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "tailwindcss": "^3.4",
    "autoprefixer": "^10.4",
    "postcss": "^8.4",
    "@types/react": "^18.3",
    "@types/node": "^20",
    "vitest": "^1.6",
    "@testing-library/react": "^15",
    "eslint": "^8.57",
    "eslint-config-next": "^14.2"
  }
}
```

## Quality Bar

- Every screen works on 375px wide viewport (iPhone SE)
- Touch targets 48px minimum, 60px preferred for primary actions
- Dark theme by default (driving at night)
- Zero external API calls — everything client-side
- Works offline after first load (PWA)
- No loading spinners longer than 200ms — optimistic UI
- Accessible: all buttons have labels, screen reader compatible
- Rehearsal screen feels like a podcast player, not a slide deck

## Build Strategy

Build each feature as a working vertical slice. Do NOT scaffold everything at once.
1. Get paste + Listen mode fully working first
2. Then add Prompt and Test modes
3. Then file upload (PPTX parsing)
4. Then speech recognition and scoring
5. Then PWA polish

After each major step, verify with `npm run dev` and `npx tsc --noEmit`.
