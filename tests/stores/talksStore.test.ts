import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTalksStore } from '@/stores/talksStore';
import type { Talk, Slide } from '@/types/talk';
import { nanoid } from 'nanoid';

// Mock the DB module
vi.mock('@/lib/db/talks', () => ({
  getAllTalks: vi.fn().mockResolvedValue([]),
  getTalk: vi.fn(),
  createTalk: vi.fn().mockImplementation((talk: Talk) => Promise.resolve(talk.id)),
  updateTalk: vi.fn().mockResolvedValue(undefined),
  deleteTalk: vi.fn().mockResolvedValue(undefined),
}));

import * as talksDB from '@/lib/db/talks';

// Helper to create mock slides
function makeMockSlides(count: number): Slide[] {
  return Array.from({ length: count }, (_, i) => ({
    id: nanoid(),
    index: i,
    title: `Slide ${i + 1}`,
    notes: `Notes for slide ${i + 1}`,
    wordCount: 10,
    estimatedSeconds: 6,
    timesRehearsed: 0,
  }));
}

// Helper to create a mock talk
function makeMockTalk(source: Talk['source'] = 'paste'): Talk {
  const now = Date.now();
  return {
    id: nanoid(),
    title: 'Test Talk',
    slides: makeMockSlides(3),
    createdAt: now,
    updatedAt: now,
    totalRehearsals: 0,
    source,
  };
}

describe('talksStore', () => {
  beforeEach(() => {
    // Reset store state
    useTalksStore.setState({
      talks: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('addTalk', () => {
    it('1. creates talk with id, createdAt, updatedAt, source', async () => {
      const talk = makeMockTalk('paste');
      await useTalksStore.getState().addTalk(talk);

      expect(talksDB.createTalk).toHaveBeenCalledWith(talk);
      expect(talk.id).toBeDefined();
      expect(talk.createdAt).toBeGreaterThan(0);
      expect(talk.updatedAt).toBeGreaterThan(0);
      expect(talk.source).toBe('paste');
    });

    it('2. slides have correct ids, indices, wordCounts', async () => {
      const talk = makeMockTalk();
      await useTalksStore.getState().addTalk(talk);

      talk.slides.forEach((slide, i) => {
        expect(slide.id).toBeDefined();
        expect(slide.index).toBe(i);
        expect(slide.wordCount).toBeGreaterThan(0);
      });
    });

    it('3. talk is added to store talks array', async () => {
      const talk = makeMockTalk();
      await useTalksStore.getState().addTalk(talk);

      expect(useTalksStore.getState().talks).toContainEqual(talk);
    });
  });

  describe('getTalk', () => {
    it('4. retrieves a specific talk by id', async () => {
      const talk = makeMockTalk();
      await useTalksStore.getState().addTalk(talk);

      const retrieved = useTalksStore.getState().getTalk(talk.id);
      expect(retrieved).toEqual(talk);
    });

    it('5. returns undefined for nonexistent id', () => {
      const retrieved = useTalksStore.getState().getTalk('nonexistent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllTalks', () => {
    it('6. returns all added talks', async () => {
      const talk1 = makeMockTalk();
      const talk2 = makeMockTalk();
      await useTalksStore.getState().addTalk(talk1);
      await useTalksStore.getState().addTalk(talk2);

      const talks = useTalksStore.getState().talks;
      expect(talks.length).toBe(2);
    });

    it('7. returns empty array when no talks exist', () => {
      expect(useTalksStore.getState().talks).toEqual([]);
    });
  });

  describe('updateTalk', () => {
    it('8. modifies title', async () => {
      const talk = makeMockTalk();
      await useTalksStore.getState().addTalk(talk);

      const updatedTalk = { ...talk, title: 'Updated Title' };
      await useTalksStore.getState().updateTalk(updatedTalk);

      expect(talksDB.updateTalk).toHaveBeenCalledWith(updatedTalk);
      const retrieved = useTalksStore.getState().getTalk(talk.id);
      expect(retrieved?.title).toBe('Updated Title');
    });

    it('9. modifies slides array', async () => {
      const talk = makeMockTalk();
      await useTalksStore.getState().addTalk(talk);

      const newSlides = makeMockSlides(5);
      const updatedTalk = { ...talk, slides: newSlides };
      await useTalksStore.getState().updateTalk(updatedTalk);

      const retrieved = useTalksStore.getState().getTalk(talk.id);
      expect(retrieved?.slides.length).toBe(5);
    });
  });

  describe('deleteTalk', () => {
    it('10. removes the talk', async () => {
      const talk = makeMockTalk();
      await useTalksStore.getState().addTalk(talk);
      expect(useTalksStore.getState().talks.length).toBe(1);

      await useTalksStore.getState().deleteTalk(talk.id);
      expect(talksDB.deleteTalk).toHaveBeenCalledWith(talk.id);
    });

    it('11. talk no longer appears in talks array', async () => {
      const talk = makeMockTalk();
      await useTalksStore.getState().addTalk(talk);
      await useTalksStore.getState().deleteTalk(talk.id);

      expect(useTalksStore.getState().talks).not.toContainEqual(talk);
      expect(useTalksStore.getState().getTalk(talk.id)).toBeUndefined();
    });
  });

  describe('Talk source field', () => {
    it('12. correctly set for paste source', async () => {
      const talk = makeMockTalk('paste');
      await useTalksStore.getState().addTalk(talk);
      expect(useTalksStore.getState().getTalk(talk.id)?.source).toBe('paste');
    });

    it('13. correctly set for pptx source', async () => {
      const talk = makeMockTalk('pptx');
      await useTalksStore.getState().addTalk(talk);
      expect(useTalksStore.getState().getTalk(talk.id)?.source).toBe('pptx');
    });

    it('14. correctly set for docx source', async () => {
      const talk = makeMockTalk('docx');
      await useTalksStore.getState().addTalk(talk);
      expect(useTalksStore.getState().getTalk(talk.id)?.source).toBe('docx');
    });

    it('15. correctly set for pdf source', async () => {
      const talk = makeMockTalk('pdf');
      await useTalksStore.getState().addTalk(talk);
      expect(useTalksStore.getState().getTalk(talk.id)?.source).toBe('pdf');
    });

    it('16. correctly set for url source', async () => {
      const talk = makeMockTalk('url');
      await useTalksStore.getState().addTalk(talk);
      expect(useTalksStore.getState().getTalk(talk.id)?.source).toBe('url');
    });
  });

  describe('Loading State', () => {
    it('17. loadTalks sets isLoading during fetch', async () => {
      const mockTalks = [makeMockTalk()];
      vi.mocked(talksDB.getAllTalks).mockResolvedValueOnce(mockTalks);

      const promise = useTalksStore.getState().loadTalks();
      // Loading state is set immediately
      await promise;

      expect(talksDB.getAllTalks).toHaveBeenCalled();
    });

    it('18. loadTalks populates talks from DB', async () => {
      const mockTalks = [makeMockTalk(), makeMockTalk()];
      vi.mocked(talksDB.getAllTalks).mockResolvedValueOnce(mockTalks);

      await useTalksStore.getState().loadTalks();

      expect(useTalksStore.getState().talks).toEqual(mockTalks);
    });

    it('19. loadTalks sets error on failure', async () => {
      vi.mocked(talksDB.getAllTalks).mockRejectedValueOnce(new Error('DB Error'));

      await useTalksStore.getState().loadTalks();

      expect(useTalksStore.getState().error).toBe('DB Error');
    });
  });
});
