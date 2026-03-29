import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRehearsalStore, HARD_SCORE_THRESHOLD } from '@/stores/rehearsalStore';
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

// Helper to create slides with various scores
function makeMockSlides(): Slide[] {
  return [
    {
      id: 'slide-0',
      index: 0,
      title: 'Slide 1',
      notes: 'Content for slide 1.',
      wordCount: 5,
      estimatedSeconds: 3,
      timesRehearsed: 3,
      lastScore: 30, // Hard slide (< 50)
    },
    {
      id: 'slide-1',
      index: 1,
      title: 'Slide 2',
      notes: 'Content for slide 2.',
      wordCount: 5,
      estimatedSeconds: 3,
      timesRehearsed: 2,
      lastScore: 85, // Easy slide
    },
    {
      id: 'slide-2',
      index: 2,
      title: 'Slide 3',
      notes: 'Content for slide 3.',
      wordCount: 5,
      estimatedSeconds: 3,
      timesRehearsed: 1,
      lastScore: 45, // Hard slide (< 50)
    },
    {
      id: 'slide-3',
      index: 3,
      title: 'Slide 4',
      notes: 'Content for slide 4.',
      wordCount: 5,
      estimatedSeconds: 3,
      timesRehearsed: 4,
      lastScore: 90, // Easy slide
    },
    {
      id: 'slide-4',
      index: 4,
      title: 'Slide 5',
      notes: 'Content for slide 5.',
      wordCount: 5,
      estimatedSeconds: 3,
      timesRehearsed: 0,
      // No lastScore - never scored
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

describe('Integration: Bookmark + Practice Mode Flow', () => {
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

  describe('Bookmark + Practice Mode Integration', () => {
    it('1. Bookmark slides 1 and 3 → switch to bookmarksOnly → filtered indices = [0, 2]', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Bookmark slides at index 0 and 2
      useRehearsalStore.getState().toggleBookmark('slide-0');
      useRehearsalStore.getState().toggleBookmark('slide-2');

      // Verify bookmarks
      expect(useRehearsalStore.getState().isBookmarked('slide-0')).toBe(true);
      expect(useRehearsalStore.getState().isBookmarked('slide-2')).toBe(true);

      // Switch to bookmarksOnly mode
      useRehearsalStore.getState().setPracticeMode('bookmarksOnly');

      // Get filtered indices
      const filtered = useRehearsalStore.getState().getFilteredSlideIndices();
      expect(filtered).toEqual([0, 2]);
    });

    it('2. Slide with score < 50 appears in getHardSlideIndices', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Slides 0 and 2 have scores < 50
      const hardIndices = useRehearsalStore.getState().getHardSlideIndices();
      expect(hardIndices).toContain(0); // lastScore: 30
      expect(hardIndices).toContain(2); // lastScore: 45
      expect(hardIndices).not.toContain(1); // lastScore: 85
      expect(hardIndices).not.toContain(3); // lastScore: 90
    });

    it('3. Switch to hardOnly mode → filtered indices include hard slides', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      useRehearsalStore.getState().setPracticeMode('hardOnly');

      const filtered = useRehearsalStore.getState().getFilteredSlideIndices();
      expect(filtered).toContain(0);
      expect(filtered).toContain(2);
      expect(filtered.length).toBe(2);
    });

    it('4. Clear bookmarks → bookmarksOnly mode returns empty', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Add some bookmarks
      useRehearsalStore.getState().toggleBookmark('slide-0');
      useRehearsalStore.getState().toggleBookmark('slide-1');

      // Clear all bookmarks
      useRehearsalStore.getState().clearBookmarks();

      // Switch to bookmarksOnly
      useRehearsalStore.getState().setPracticeMode('bookmarksOnly');

      const filtered = useRehearsalStore.getState().getFilteredSlideIndices();
      expect(filtered).toEqual([]);
    });
  });

  describe('Bookmark Operations', () => {
    it('5. toggleBookmark adds then removes', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Add
      const added = useRehearsalStore.getState().toggleBookmark('slide-1');
      expect(added).toBe(true);
      expect(useRehearsalStore.getState().isBookmarked('slide-1')).toBe(true);

      // Remove
      const removed = useRehearsalStore.getState().toggleBookmark('slide-1');
      expect(removed).toBe(false);
      expect(useRehearsalStore.getState().isBookmarked('slide-1')).toBe(false);
    });

    it('6. getBookmarkedSlideIndices returns correct indices', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      useRehearsalStore.getState().toggleBookmark('slide-1');
      useRehearsalStore.getState().toggleBookmark('slide-3');

      const indices = useRehearsalStore.getState().getBookmarkedSlideIndices();
      expect(indices).toEqual([1, 3]);
    });

    it('7. addBookmark is idempotent', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      useRehearsalStore.getState().addBookmark('slide-0');
      useRehearsalStore.getState().addBookmark('slide-0');
      useRehearsalStore.getState().addBookmark('slide-0');

      expect(useRehearsalStore.getState().bookmarkedSlides.size).toBe(1);
    });

    it('8. removeBookmark on non-bookmarked is safe', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      // Should not throw
      useRehearsalStore.getState().removeBookmark('slide-999');
      expect(useRehearsalStore.getState().bookmarkedSlides.size).toBe(0);
    });
  });

  describe('Practice Mode Switching', () => {
    it('9. all mode includes all slides', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      useRehearsalStore.getState().setPracticeMode('all');
      const filtered = useRehearsalStore.getState().getFilteredSlideIndices();

      expect(filtered.length).toBe(5); // All 5 slides
      expect(filtered).toEqual([0, 1, 2, 3, 4]);
    });

    it('10. Slides without lastScore are NOT included in hardOnly', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      useRehearsalStore.getState().setPracticeMode('hardOnly');
      const filtered = useRehearsalStore.getState().getFilteredSlideIndices();

      // Slide 4 has no lastScore, should not be in hard slides
      expect(filtered).not.toContain(4);
    });

    it('11. Mode can be switched multiple times', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'listen');

      useRehearsalStore.getState().setPracticeMode('hardOnly');
      expect(useRehearsalStore.getState().practiceMode).toBe('hardOnly');

      useRehearsalStore.getState().setPracticeMode('bookmarksOnly');
      expect(useRehearsalStore.getState().practiceMode).toBe('bookmarksOnly');

      useRehearsalStore.getState().setPracticeMode('all');
      expect(useRehearsalStore.getState().practiceMode).toBe('all');
    });
  });

  describe('Auto-bookmark on Low Score', () => {
    it('12. Score below threshold auto-bookmarks', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'test');

      // Navigate to slide 1 (not yet bookmarked)
      await useRehearsalStore.getState().goToSlide(1);
      expect(useRehearsalStore.getState().isBookmarked('slide-1')).toBe(false);

      // Start attempt and record low score
      useRehearsalStore.getState().startAttempt();
      useRehearsalStore.getState().recordAttempt({
        similarityScore: 35, // Below threshold
      });

      // Should now be bookmarked
      expect(useRehearsalStore.getState().isBookmarked('slide-1')).toBe(true);
    });

    it('13. Score at exactly threshold does NOT auto-bookmark', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'test');

      await useRehearsalStore.getState().goToSlide(1);
      useRehearsalStore.getState().startAttempt();
      useRehearsalStore.getState().recordAttempt({
        similarityScore: HARD_SCORE_THRESHOLD, // Exactly 50
      });

      expect(useRehearsalStore.getState().isBookmarked('slide-1')).toBe(false);
    });

    it('14. Already bookmarked slide stays bookmarked after low score', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'test');

      // Pre-bookmark
      useRehearsalStore.getState().toggleBookmark('slide-0');
      expect(useRehearsalStore.getState().isBookmarked('slide-0')).toBe(true);

      // Record low score
      useRehearsalStore.getState().startAttempt();
      useRehearsalStore.getState().recordAttempt({
        similarityScore: 25,
      });

      // Still bookmarked
      expect(useRehearsalStore.getState().isBookmarked('slide-0')).toBe(true);
    });
  });
});
