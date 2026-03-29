import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRehearsalStore } from '@/stores/rehearsalStore';
import type { Talk, Slide } from '@/types/talk';

// Mock DB modules
vi.mock('@/lib/db/sessions', () => ({
  createSession: vi.fn().mockResolvedValue('session-id'),
  updateSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db/talks', () => ({
  incrementRehearsalCount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db/bookmarks', () => ({
  loadBookmarks: vi.fn().mockResolvedValue(new Set<string>()),
  saveBookmarks: vi.fn().mockResolvedValue(undefined),
  clearBookmarksForTalk: vi.fn().mockResolvedValue(undefined),
}));

// Helper to create slides with multi-sentence notes
function makeMockSlides(): Slide[] {
  return [
    {
      id: 'slide-0',
      index: 0,
      title: 'Introduction',
      notes: 'Welcome to our presentation. Today we will cover three main topics. Let us begin with the first one.',
      wordCount: 18,
      estimatedSeconds: 11,
      timesRehearsed: 0,
    },
    {
      id: 'slide-1',
      index: 1,
      title: 'Main Points',
      notes: 'The first point is quality. The second point is testing. The third point is documentation.',
      wordCount: 15,
      estimatedSeconds: 9,
      timesRehearsed: 0,
    },
    {
      id: 'slide-2',
      index: 2,
      title: 'Details',
      notes: 'Quality means writing clean code. Testing ensures correctness. Documentation helps maintenance.',
      wordCount: 12,
      estimatedSeconds: 7,
      timesRehearsed: 0,
    },
    {
      id: 'slide-3',
      index: 3,
      title: 'Conclusion',
      notes: 'Thank you for attending. Any questions?',
      wordCount: 6,
      estimatedSeconds: 4,
      timesRehearsed: 0,
    },
  ];
}

function makeMockTalk(): Talk {
  return {
    id: 'test-talk-id',
    title: 'Test Talk',
    slides: makeMockSlides(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalRehearsals: 0,
    source: 'paste',
  };
}

describe('Integration: Granularity Switching', () => {
  beforeEach(() => {
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

  describe('Mid-Session Granularity Switching', () => {
    it('1. Start session in slide mode → switch to sentence mode → chunks rebuilt', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Start in slide mode
      expect(useRehearsalStore.getState().granularity).toBe('slide');
      const slideChunks = useRehearsalStore.getState().chunks.length;
      expect(slideChunks).toBe(4); // 4 slides

      // Switch to sentence mode
      useRehearsalStore.getState().setGranularity('sentence');

      // Chunks should be rebuilt with more chunks
      const sentenceChunks = useRehearsalStore.getState().chunks.length;
      expect(sentenceChunks).toBeGreaterThan(slideChunks);
    });

    it('2. Position preservation: on slide 3 → switch to sentence mode → current chunk is within slide 3', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Navigate to slide 2 (index 2)
      await useRehearsalStore.getState().goToSlide(2);
      expect(useRehearsalStore.getState().currentSlideIndex).toBe(2);

      // Switch to sentence mode
      useRehearsalStore.getState().setGranularity('sentence');

      // Current chunk should be within slide 2
      const currentChunk = useRehearsalStore.getState().getCurrentChunk();
      expect(currentChunk?.slideIndex).toBe(2);
    });

    it('3. Switch back to slide mode → currentSlideIndex preserved', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Navigate to slide 3
      await useRehearsalStore.getState().goToSlide(3);

      // Switch to sentence mode
      useRehearsalStore.getState().setGranularity('sentence');
      expect(useRehearsalStore.getState().granularity).toBe('sentence');

      // Switch back to slide mode
      useRehearsalStore.getState().setGranularity('slide');
      expect(useRehearsalStore.getState().granularity).toBe('slide');

      // Slide index should still be 3
      const currentChunk = useRehearsalStore.getState().getCurrentChunk();
      expect(currentChunk?.slideIndex).toBe(3);
    });

    it('4. Paragraph mode creates fewer chunks than sentence mode', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Set sentence mode
      useRehearsalStore.getState().setGranularity('sentence');
      const sentenceChunks = useRehearsalStore.getState().chunks.length;

      // Set paragraph mode
      useRehearsalStore.getState().setGranularity('paragraph');
      const paragraphChunks = useRehearsalStore.getState().chunks.length;

      // Slide mode should have fewer chunks
      useRehearsalStore.getState().setGranularity('slide');
      const slideChunks = useRehearsalStore.getState().chunks.length;

      // Order should be: slide < paragraph <= sentence
      expect(slideChunks).toBeLessThanOrEqual(paragraphChunks);
      expect(paragraphChunks).toBeLessThanOrEqual(sentenceChunks);
    });
  });

  describe('Chunk Navigation', () => {
    it('5. advanceChunk moves through sentences', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');
      useRehearsalStore.getState().setGranularity('sentence');

      const initialChunk = useRehearsalStore.getState().currentChunkIndex;
      useRehearsalStore.getState().advanceChunk();

      expect(useRehearsalStore.getState().currentChunkIndex).toBe(initialChunk + 1);
    });

    it('6. advanceChunk crossing slide boundary updates slideIndex', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');
      useRehearsalStore.getState().setGranularity('sentence');

      // Advance through all chunks of first slide
      let currentChunk = useRehearsalStore.getState().getCurrentChunk();
      while (currentChunk?.slideIndex === 0) {
        const advanced = useRehearsalStore.getState().advanceChunk();
        if (!advanced) break;
        currentChunk = useRehearsalStore.getState().getCurrentChunk();
      }

      // Should now be on slide 1
      expect(useRehearsalStore.getState().currentSlideIndex).toBe(1);
    });

    it('7. goBackChunk works within a slide', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');
      useRehearsalStore.getState().setGranularity('sentence');

      // Advance a couple chunks
      useRehearsalStore.getState().advanceChunk();
      useRehearsalStore.getState().advanceChunk();
      const afterAdvance = useRehearsalStore.getState().currentChunkIndex;

      // Go back
      useRehearsalStore.getState().goBackChunk();

      expect(useRehearsalStore.getState().currentChunkIndex).toBe(afterAdvance - 1);
    });

    it('8. getChunkProgress returns percentage 0-100', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');
      useRehearsalStore.getState().setGranularity('sentence');

      const progress = useRehearsalStore.getState().getChunkProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Granularity Edge Cases', () => {
    it('9. setGranularity before session starts is safe', () => {
      // No session yet
      useRehearsalStore.getState().setGranularity('sentence');
      expect(useRehearsalStore.getState().granularity).toBe('sentence');
    });

    it('10. Single-sentence slide creates one chunk in sentence mode', async () => {
      const talk: Talk = {
        ...makeMockTalk(),
        slides: [{
          id: 'single',
          index: 0,
          title: 'Single',
          notes: 'Just one sentence here.',
          wordCount: 4,
          estimatedSeconds: 2,
          timesRehearsed: 0,
        }],
      };

      await useRehearsalStore.getState().startSession(talk, 'listen');
      useRehearsalStore.getState().setGranularity('sentence');

      // Should have exactly 1 chunk
      expect(useRehearsalStore.getState().chunks.length).toBe(1);
    });

    it('11. Empty notes creates one empty chunk', async () => {
      const talk: Talk = {
        ...makeMockTalk(),
        slides: [{
          id: 'empty',
          index: 0,
          title: 'Empty Slide',
          notes: '',
          wordCount: 0,
          estimatedSeconds: 0,
          timesRehearsed: 0,
        }],
      };

      await useRehearsalStore.getState().startSession(talk, 'listen');
      useRehearsalStore.getState().setGranularity('sentence');

      // Should have at least 1 chunk (even if empty)
      expect(useRehearsalStore.getState().chunks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
