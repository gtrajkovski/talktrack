import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { parseText } from '@/lib/parsers/text';
import { parseMarkdown } from '@/lib/parsers/markdown';
import { useTalksStore } from '@/stores/talksStore';
import { useRehearsalStore } from '@/stores/rehearsalStore';
import type { Talk } from '@/types/talk';

// Mock DB modules
vi.mock('@/lib/db/talks', () => ({
  getAllTalks: vi.fn().mockResolvedValue([]),
  getTalk: vi.fn(),
  createTalk: vi.fn().mockImplementation((talk: Talk) => Promise.resolve(talk.id)),
  updateTalk: vi.fn().mockResolvedValue(undefined),
  deleteTalk: vi.fn().mockResolvedValue(undefined),
  incrementRehearsalCount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db/sessions', () => ({
  createSession: vi.fn().mockResolvedValue('session-id'),
  updateSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db/bookmarks', () => ({
  loadBookmarks: vi.fn().mockResolvedValue(new Set<string>()),
  saveBookmarks: vi.fn().mockResolvedValue(undefined),
  clearBookmarksForTalk: vi.fn().mockResolvedValue(undefined),
}));

describe('Integration: Import to Rehearsal Flow', () => {
  beforeEach(() => {
    // Reset stores
    useTalksStore.setState({
      talks: [],
      isLoading: false,
      error: null,
    });
    useRehearsalStore.setState({
      session: null,
      talk: null,
      currentSlideIndex: 0,
      isPlaying: false,
      isPaused: false,
      currentAttempt: null,
      speedMultiplier: 1.0,
      bookmarkedSlides: new Set<string>(),
      bookmarkedChunks: new Set<string>(),
      practiceMode: 'all',
      granularity: 'slide',
      chunks: [],
      currentChunkIndex: 0,
      sessionStartTime: null,
      audioState: 'idle',
      lastCommand: null,
      lastCommandTimestamp: null,
      currentTranscript: '',
      isSpeechSupported: true,
    });
    vi.clearAllMocks();
  });

  describe('Text Import Flow', () => {
    it('1. Parse plain text → save as talk → start listen session → verify slides loaded', async () => {
      // Step 1: Parse plain text
      const text = `Slide Title One
This is the content of the first slide.

Slide Title Two
This is the content of the second slide.

Slide Title Three
This is the content of the third slide.`;

      const result = parseText(text);

      // Verify parsing
      expect(result.slides.length).toBe(3);
      expect(result.slides[0].title).toBe('Slide Title One');
      expect(result.slides[1].title).toBe('Slide Title Two');

      // Step 2: Create talk and add to store
      const talk: Talk = {
        id: nanoid(),
        title: result.title,
        slides: result.slides,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalRehearsals: 0,
        source: 'paste',
      };

      await useTalksStore.getState().addTalk(talk);

      // Verify talk in store
      expect(useTalksStore.getState().talks.length).toBe(1);

      // Step 3: Start listen session
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Verify session started with correct slides
      const state = useRehearsalStore.getState();
      expect(state.session).not.toBeNull();
      expect(state.session?.mode).toBe('listen');
      expect(state.talk?.slides.length).toBe(3);
    });

    it('2. Parse markdown with headers → save → verify slide count matches header count', async () => {
      // Note: # (H1) = section markers, ## (H2) = slide markers
      const markdown = `## Introduction

Welcome to the presentation.

## Main Points

Here are the main points we'll cover.

## Conclusion

Thank you for listening.`;

      const result = parseMarkdown(markdown);

      // Verify parsing
      expect(result.slides.length).toBe(3);
      expect(result.slides[0].title).toBe('Introduction');
      expect(result.slides[1].title).toBe('Main Points');
      expect(result.slides[2].title).toBe('Conclusion');

      // Create talk
      const talk: Talk = {
        id: nanoid(),
        title: result.title,
        slides: result.slides,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalRehearsals: 0,
        source: 'paste',
      };

      await useTalksStore.getState().addTalk(talk);

      // Verify
      const retrieved = useTalksStore.getState().getTalk(talk.id);
      expect(retrieved?.slides.length).toBe(3);
    });

    it('3. Import flow: talk saved → retrievable → loadable into store', async () => {
      // Parse and create talk
      const text = `First Section
Content here.

Second Section
More content.`;

      const result = parseText(text);
      const talk: Talk = {
        id: nanoid(),
        title: result.title,
        slides: result.slides,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalRehearsals: 0,
        source: 'paste',
      };

      // Save to store
      await useTalksStore.getState().addTalk(talk);

      // Retrieve from store
      const retrieved = useTalksStore.getState().getTalk(talk.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(talk.id);

      // Load into rehearsal store
      await useRehearsalStore.getState().startSession(retrieved!, 'prompt');

      // Verify loaded correctly
      expect(useRehearsalStore.getState().talk?.id).toBe(talk.id);
      expect(useRehearsalStore.getState().getCurrentSlide()?.title).toBe('First Section');
    });
  });

  describe('Slide Content Verification', () => {
    it('4. Slides have correct wordCount calculated', () => {
      const text = `Title
One two three four five six seven eight nine ten.`;

      const result = parseText(text);
      expect(result.slides[0].wordCount).toBeGreaterThan(0);
    });

    it('5. Slides have correct estimatedSeconds calculated', () => {
      const text = `Title
One two three four five six seven eight nine ten words here.`;

      const result = parseText(text);
      expect(result.slides[0].estimatedSeconds).toBeGreaterThan(0);
    });

    it('6. Each slide has unique id', () => {
      const text = `Slide One
Content.

Slide Two
Content.

Slide Three
Content.`;

      const result = parseText(text);
      const ids = result.slides.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('7. Slides have sequential indices', () => {
      const text = `A
Content.

B
Content.

C
Content.`;

      const result = parseText(text);
      result.slides.forEach((slide, i) => {
        expect(slide.index).toBe(i);
      });
    });
  });
});
