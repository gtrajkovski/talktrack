import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import * as talksDB from '@/lib/db/talks';
import * as sessionsDB from '@/lib/db/sessions';
import * as bookmarksDB from '@/lib/db/bookmarks';
import type { Talk, Slide } from '@/types/talk';
import type { RehearsalSession } from '@/types/session';

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
function makeMockTalk(): Talk {
  const now = Date.now();
  return {
    id: nanoid(),
    title: 'Test Talk',
    slides: makeMockSlides(3),
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
    mode: 'listen',
    startedAt: Date.now(),
    currentSlideIndex: 0,
    slidesCompleted: 0,
    totalSlides: 3,
    attempts: [],
  };
}

describe('DB: talks', () => {
  beforeEach(async () => {
    // Clean up any existing data
    const talks = await talksDB.getAllTalks();
    for (const talk of talks) {
      await talksDB.deleteTalk(talk.id);
    }
  });

  describe('CRUD Operations', () => {
    it('1. saveTalk + getTalk roundtrip — data matches', async () => {
      const talk = makeMockTalk();
      await talksDB.createTalk(talk);

      const retrieved = await talksDB.getTalk(talk.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(talk.id);
      expect(retrieved?.title).toBe(talk.title);
      expect(retrieved?.slides.length).toBe(talk.slides.length);
    });

    it('2. getAllTalks — returns all saved talks in array', async () => {
      const talk1 = makeMockTalk();
      const talk2 = makeMockTalk();
      await talksDB.createTalk(talk1);
      await talksDB.createTalk(talk2);

      const talks = await talksDB.getAllTalks();
      expect(talks.length).toBe(2);
    });

    it('3. getAllTalks — returns empty array when DB is empty', async () => {
      const talks = await talksDB.getAllTalks();
      expect(talks).toEqual([]);
    });

    it('4. updateTalk — modifies fields, preserves others', async () => {
      const talk = makeMockTalk();
      await talksDB.createTalk(talk);

      talk.title = 'Updated Title';
      await talksDB.updateTalk(talk);

      const retrieved = await talksDB.getTalk(talk.id);
      expect(retrieved?.title).toBe('Updated Title');
      expect(retrieved?.slides.length).toBe(3); // Preserved
    });

    it('5. deleteTalk — talk no longer retrievable', async () => {
      const talk = makeMockTalk();
      await talksDB.createTalk(talk);
      await talksDB.deleteTalk(talk.id);

      const retrieved = await talksDB.getTalk(talk.id);
      expect(retrieved).toBeUndefined();
    });

    it('6. deleteTalk — does not affect other talks', async () => {
      const talk1 = makeMockTalk();
      const talk2 = makeMockTalk();
      await talksDB.createTalk(talk1);
      await talksDB.createTalk(talk2);

      await talksDB.deleteTalk(talk1.id);

      const retrieved1 = await talksDB.getTalk(talk1.id);
      const retrieved2 = await talksDB.getTalk(talk2.id);
      expect(retrieved1).toBeUndefined();
      expect(retrieved2).toBeDefined();
    });

    it('7. saveTalk with slides — slides array persisted correctly', async () => {
      const talk = makeMockTalk();
      talk.slides = makeMockSlides(5);
      await talksDB.createTalk(talk);

      const retrieved = await talksDB.getTalk(talk.id);
      expect(retrieved?.slides.length).toBe(5);
      expect(retrieved?.slides[0].title).toBe('Slide 1');
      expect(retrieved?.slides[4].title).toBe('Slide 5');
    });

    it('8. Talk id is preserved (not regenerated on save)', async () => {
      const talk = makeMockTalk();
      const originalId = talk.id;
      await talksDB.createTalk(talk);

      const retrieved = await talksDB.getTalk(originalId);
      expect(retrieved?.id).toBe(originalId);
    });
  });

  describe('incrementRehearsalCount', () => {
    it('9. increments totalRehearsals', async () => {
      const talk = makeMockTalk();
      talk.totalRehearsals = 0;
      await talksDB.createTalk(talk);

      await talksDB.incrementRehearsalCount(talk.id);

      const retrieved = await talksDB.getTalk(talk.id);
      expect(retrieved?.totalRehearsals).toBe(1);
    });
  });

  describe('recordSlideScore', () => {
    it('10. updates slide lastScore and timesRehearsed', async () => {
      const talk = makeMockTalk();
      await talksDB.createTalk(talk);

      const slideId = talk.slides[0].id;
      await talksDB.recordSlideScore(talk.id, slideId, 85, 'test');

      const retrieved = await talksDB.getTalk(talk.id);
      const slide = retrieved?.slides.find(s => s.id === slideId);
      expect(slide?.lastScore).toBe(85);
      expect(slide?.timesRehearsed).toBe(1);
    });

    it('11. adds score to scoreHistory', async () => {
      const talk = makeMockTalk();
      await talksDB.createTalk(talk);

      const slideId = talk.slides[0].id;
      await talksDB.recordSlideScore(talk.id, slideId, 75, 'prompt');

      const retrieved = await talksDB.getTalk(talk.id);
      const slide = retrieved?.slides.find(s => s.id === slideId);
      expect(slide?.scoreHistory?.length).toBe(1);
      expect(slide?.scoreHistory?.[0].score).toBe(75);
      expect(slide?.scoreHistory?.[0].mode).toBe('prompt');
    });
  });
});
