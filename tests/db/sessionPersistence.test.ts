import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { useRehearsalStore } from '@/stores/rehearsalStore';
import * as sessionsDB from '@/lib/db/sessions';
import * as talksDB from '@/lib/db/talks';
import type { Talk, Slide } from '@/types/talk';
import type { RehearsalSession, SlideAttempt } from '@/types/session';

// Mock DB modules
vi.mock('@/lib/db/sessions', async () => {
  const actual = await vi.importActual('@/lib/db/sessions');
  return {
    ...actual,
    createSession: vi.fn().mockImplementation((session) => Promise.resolve(session.id)),
    updateSession: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/db/talks', () => ({
  incrementRehearsalCount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db/bookmarks', () => ({
  loadBookmarks: vi.fn().mockResolvedValue(new Set<string>()),
  saveBookmarks: vi.fn().mockResolvedValue(undefined),
  clearBookmarksForTalk: vi.fn().mockResolvedValue(undefined),
}));

// Helper to create mock slides
function makeMockSlides(count: number): Slide[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i}`,
    index: i,
    title: `Slide ${i + 1}`,
    notes: `Notes for slide ${i + 1}. This is a longer note with multiple sentences.`,
    wordCount: 15,
    estimatedSeconds: 9,
    timesRehearsed: 0,
  }));
}

// Helper to create a mock talk
function makeMockTalk(): Talk {
  const now = Date.now();
  return {
    id: 'test-talk-id',
    title: 'Test Talk',
    slides: makeMockSlides(5),
    createdAt: now,
    updatedAt: now,
    totalRehearsals: 0,
    source: 'paste',
  };
}

// Helper to create a mock session
function makeMockSession(talkId: string): RehearsalSession {
  return {
    id: nanoid(),
    talkId,
    mode: 'prompt',
    startedAt: Date.now() - 300000, // Started 5 minutes ago
    currentSlideIndex: 3,
    slidesCompleted: 3,
    totalSlides: 5,
    attempts: [
      {
        slideId: 'slide-0',
        slideIndex: 0,
        spokenText: 'First attempt text',
        similarityScore: 80,
        usedHelp: false,
      },
      {
        slideId: 'slide-1',
        slideIndex: 1,
        spokenText: 'Second attempt text',
        similarityScore: 65,
        usedHelp: true,
      },
      {
        slideId: 'slide-2',
        slideIndex: 2,
        spokenText: 'Third attempt text',
        similarityScore: 90,
        usedHelp: false,
      },
    ],
  };
}

describe('Session Persistence (Resume)', () => {
  const talk = makeMockTalk();

  beforeEach(() => {
    // Reset store to initial state
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

  describe('Resume Session Flow', () => {
    it('1. Start a session with specific settings', async () => {
      await useRehearsalStore.getState().startSession(talk, 'prompt');

      const state = useRehearsalStore.getState();
      expect(state.session).not.toBeNull();
      expect(state.session?.mode).toBe('prompt');
      expect(state.currentSlideIndex).toBe(0);
    });

    it('2. Navigate to slide 3 and verify position', async () => {
      await useRehearsalStore.getState().startSession(talk, 'prompt');
      await useRehearsalStore.getState().goToSlide(3);

      expect(useRehearsalStore.getState().currentSlideIndex).toBe(3);
    });

    it('3. Resume session restores currentSlideIndex', async () => {
      const session = makeMockSession(talk.id);
      session.currentSlideIndex = 3;

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().currentSlideIndex).toBe(3);
    });

    it('4. Resume session restores mode', async () => {
      const session = makeMockSession(talk.id);
      session.mode = 'test';

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.mode).toBe('test');
    });

    it('5. Resume session preserves previous attempts', async () => {
      const session = makeMockSession(talk.id);
      expect(session.attempts.length).toBe(3);

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.attempts.length).toBe(3);
      expect(useRehearsalStore.getState().session?.attempts[0].similarityScore).toBe(80);
    });

    it('6. Resume session restores sessionStartTime from session.startedAt', async () => {
      const session = makeMockSession(talk.id);
      const originalStartedAt = session.startedAt;

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().sessionStartTime).toBe(originalStartedAt);
    });

    it('7. Resume session clears pausedAt', async () => {
      const session = makeMockSession(talk.id);
      session.pausedAt = Date.now();

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.pausedAt).toBeUndefined();
    });

    it('8. Resume session rebuilds chunks based on current granularity', async () => {
      // Set granularity before resume
      useRehearsalStore.setState({ granularity: 'sentence' });

      const session = makeMockSession(talk.id);
      await useRehearsalStore.getState().resumeSession(session, talk);

      // Chunks should be rebuilt
      expect(useRehearsalStore.getState().chunks.length).toBeGreaterThan(0);
    });

    it('9. Resume session preserves practice mode from store', async () => {
      // Set practice mode before resume
      useRehearsalStore.setState({ practiceMode: 'hardOnly' });

      const session = makeMockSession(talk.id);
      await useRehearsalStore.getState().resumeSession(session, talk);

      // Practice mode should be preserved
      expect(useRehearsalStore.getState().practiceMode).toBe('hardOnly');
    });

    it('10. Resume session loads bookmarks from DB', async () => {
      const bookmarksDB = await import('@/lib/db/bookmarks');
      vi.mocked(bookmarksDB.loadBookmarks).mockResolvedValueOnce(
        new Set(['slide-1', 'slide-3'])
      );

      const session = makeMockSession(talk.id);
      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(bookmarksDB.loadBookmarks).toHaveBeenCalledWith(talk.id);
    });
  });

  describe('Session Data Integrity', () => {
    it('11. Session slidesCompleted is preserved', async () => {
      const session = makeMockSession(talk.id);
      session.slidesCompleted = 3;

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.slidesCompleted).toBe(3);
    });

    it('12. Session totalSlides is preserved', async () => {
      const session = makeMockSession(talk.id);
      session.totalSlides = 5;

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.totalSlides).toBe(5);
    });

    it('13. Session talkId is preserved', async () => {
      const session = makeMockSession(talk.id);

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.talkId).toBe(talk.id);
    });

    it('14. Attempt data integrity - usedHelp flag preserved', async () => {
      const session = makeMockSession(talk.id);

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.attempts[1].usedHelp).toBe(true);
    });

    it('15. Attempt data integrity - spokenText preserved', async () => {
      const session = makeMockSession(talk.id);

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.attempts[0].spokenText).toBe('First attempt text');
    });
  });

  describe('Edge Cases', () => {
    it('16. Resume session with empty attempts array', async () => {
      const session = makeMockSession(talk.id);
      session.attempts = [];

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().session?.attempts).toEqual([]);
    });

    it('17. Resume session at slide 0', async () => {
      const session = makeMockSession(talk.id);
      session.currentSlideIndex = 0;

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().currentSlideIndex).toBe(0);
    });

    it('18. Resume session at last slide', async () => {
      const session = makeMockSession(talk.id);
      session.currentSlideIndex = 4; // Last slide (0-indexed)

      await useRehearsalStore.getState().resumeSession(session, talk);

      expect(useRehearsalStore.getState().currentSlideIndex).toBe(4);
      expect(useRehearsalStore.getState().isLastSlide()).toBe(true);
    });
  });
});
