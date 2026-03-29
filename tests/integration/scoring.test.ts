import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateSimilarity } from '@/lib/scoring/similarity';
import { countFillerWords } from '@/lib/scoring/fillerWords';
import { calculateWordsPerMinute } from '@/lib/scoring/pacing';
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

// Helper to create mock slides
function makeMockSlides(): Slide[] {
  return [
    {
      id: 'slide-0',
      index: 0,
      title: 'Introduction',
      notes: 'Welcome to our presentation about software development best practices.',
      wordCount: 9,
      estimatedSeconds: 5,
      timesRehearsed: 0,
    },
    {
      id: 'slide-1',
      index: 1,
      title: 'Main Points',
      notes: 'The first key point is code quality. The second key point is testing.',
      wordCount: 14,
      estimatedSeconds: 8,
      timesRehearsed: 0,
    },
    {
      id: 'slide-2',
      index: 2,
      title: 'Conclusion',
      notes: 'Thank you for attending. Any questions?',
      wordCount: 7,
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

describe('Integration: Scoring Flow', () => {
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

  describe('Full Scoring Pipeline', () => {
    it('1. Full scoring pipeline: original notes + spoken text → similarity score + filler count + WPM', () => {
      const originalNotes = 'Welcome to our presentation about software development best practices.';
      const spokenText = 'Welcome to, um, our presentation about, like, software development best practices.';
      const durationSeconds = 10;

      // Calculate similarity
      const similarityScore = calculateSimilarity(originalNotes, spokenText);
      expect(similarityScore).toBeGreaterThan(50); // Should be high - most words match

      // Count fillers
      const fillerCount = countFillerWords(spokenText);
      expect(fillerCount).toBeGreaterThan(0); // Has "um" and "like"

      // Calculate pacing
      const wordCount = spokenText.split(/\s+/).filter(Boolean).length;
      const wpm = calculateWordsPerMinute(spokenText, durationSeconds);
      expect(wpm).toBeGreaterThan(0);
    });

    it('2. Score < 50 triggers auto-bookmark', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'test');

      // Start an attempt
      useRehearsalStore.getState().startAttempt();

      // Record a low score
      useRehearsalStore.getState().recordAttempt({
        spokenText: 'Completely wrong text',
        similarityScore: 30, // Below HARD_SCORE_THRESHOLD (50)
      });

      // Verify auto-bookmark was triggered
      const bookmarked = useRehearsalStore.getState().bookmarkedSlides;
      expect(bookmarked.has('slide-0')).toBe(true);
    });

    it('3. Score >= 50 does NOT auto-bookmark', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'test');

      // Start an attempt
      useRehearsalStore.getState().startAttempt();

      // Record a passing score
      useRehearsalStore.getState().recordAttempt({
        spokenText: 'Welcome to the presentation',
        similarityScore: 75, // Above threshold
      });

      // Verify NOT auto-bookmarked
      const bookmarked = useRehearsalStore.getState().bookmarkedSlides;
      expect(bookmarked.has('slide-0')).toBe(false);
    });

    it('4. Attempt recorded with all fields populated', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'test');

      useRehearsalStore.getState().startAttempt();
      useRehearsalStore.getState().recordAttempt({
        spokenText: 'Welcome to the presentation',
        similarityScore: 75,
        wordsPerMinute: 120,
        fillerWordCount: 2,
        duration: 5000,
      });

      const attempt = useRehearsalStore.getState().currentAttempt;
      expect(attempt?.spokenText).toBe('Welcome to the presentation');
      expect(attempt?.similarityScore).toBe(75);
      expect(attempt?.wordsPerMinute).toBe(120);
      expect(attempt?.fillerWordCount).toBe(2);
      expect(attempt?.duration).toBe(5000);
    });

    it('5. markUsedHelp sets usedHelp flag', async () => {
      const talk = makeMockTalk();
      await useRehearsalStore.getState().startSession(talk, 'prompt');

      useRehearsalStore.getState().startAttempt();
      expect(useRehearsalStore.getState().currentAttempt?.usedHelp).toBe(false);

      useRehearsalStore.getState().markUsedHelp();
      expect(useRehearsalStore.getState().currentAttempt?.usedHelp).toBe(true);
    });
  });

  describe('Similarity Scoring', () => {
    it('6. Identical text → 100', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      expect(calculateSimilarity(text, text)).toBe(100);
    });

    it('7. Completely different text → low score', () => {
      const original = 'The quick brown fox jumps over the lazy dog.';
      const spoken = 'Programming is fun and interesting.';
      const score = calculateSimilarity(original, spoken);
      expect(score).toBeLessThan(30);
    });

    it('8. Partial match → proportional score', () => {
      const original = 'The quick brown fox jumps over the lazy dog.';
      const spoken = 'The quick brown fox';
      const score = calculateSimilarity(original, spoken);
      expect(score).toBeGreaterThan(30);
      expect(score).toBeLessThan(70);
    });

    it('9. Case insensitive', () => {
      const original = 'Hello World';
      const spoken = 'HELLO WORLD';
      expect(calculateSimilarity(original, spoken)).toBe(100);
    });
  });

  describe('Filler Word Detection', () => {
    it('10. Detects "um"', () => {
      expect(countFillerWords('This is um a test')).toBeGreaterThan(0);
    });

    it('11. Detects "uh"', () => {
      expect(countFillerWords('This is uh a test')).toBeGreaterThan(0);
    });

    it('12. Detects "like" as filler', () => {
      expect(countFillerWords('This is like a test')).toBeGreaterThan(0);
    });

    it('13. Multiple fillers counted correctly', () => {
      const text = 'Um, so like, you know, basically, um, we need to actually do this.';
      const count = countFillerWords(text);
      expect(count).toBeGreaterThanOrEqual(5); // um, like, you know, basically, um, actually
    });

    it('14. No fillers → 0', () => {
      expect(countFillerWords('This is a clean sentence without any filler words.')).toBe(0);
    });
  });

  describe('Pacing Calculation', () => {
    it('15. Words in 60 seconds → correct WPM', () => {
      // 10 words in 4 seconds = 150 WPM
      const text = 'one two three four five six seven eight nine ten';
      const wpm = calculateWordsPerMinute(text, 4);
      expect(wpm).toBe(150);
    });

    it('16. Empty text → 0 WPM', () => {
      expect(calculateWordsPerMinute('', 60)).toBe(0);
    });

    it('17. 0 seconds → handles gracefully', () => {
      // Should not throw, return 0 or handle
      const result = calculateWordsPerMinute('hello world', 0);
      expect(typeof result).toBe('number');
    });
  });
});
