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

describe('DB: Cascade Delete', () => {
  let talk1: Talk;
  let talk2: Talk;

  beforeEach(async () => {
    // Clean up any existing data
    const talks = await talksDB.getAllTalks();
    for (const talk of talks) {
      await talksDB.deleteTalk(talk.id);
    }

    // Create fresh test talks
    talk1 = makeMockTalk();
    talk2 = makeMockTalk();
  });

  describe('Full Cascade Delete Flow', () => {
    it('1. Create a talk with 3 slides', async () => {
      await talksDB.createTalk(talk1);
      const retrieved = await talksDB.getTalk(talk1.id);
      expect(retrieved?.slides.length).toBe(3);
    });

    it('2. Create 2 sessions for that talk', async () => {
      await talksDB.createTalk(talk1);

      const session1 = makeMockSession(talk1.id);
      const session2 = makeMockSession(talk1.id);
      await sessionsDB.createSession(session1);
      await sessionsDB.createSession(session2);

      const sessions = await sessionsDB.getSessionsByTalk(talk1.id);
      expect(sessions.length).toBe(2);
    });

    it('3. Create bookmarks for that talk', async () => {
      await talksDB.createTalk(talk1);

      const slideIds = new Set([talk1.slides[0].id, talk1.slides[2].id]);
      await bookmarksDB.saveBookmarks(talk1.id, slideIds);

      const bookmarks = await bookmarksDB.loadBookmarks(talk1.id);
      expect(bookmarks.size).toBe(2);
    });

    it('4. Delete the talk and verify cascade', async () => {
      // Setup: create talk with sessions and bookmarks
      await talksDB.createTalk(talk1);
      await sessionsDB.createSession(makeMockSession(talk1.id));
      await sessionsDB.createSession(makeMockSession(talk1.id));
      await bookmarksDB.saveBookmarks(talk1.id, new Set([talk1.slides[0].id]));

      // Verify setup
      expect((await talksDB.getTalk(talk1.id))).toBeDefined();
      expect((await sessionsDB.getSessionsByTalk(talk1.id)).length).toBe(2);
      expect((await bookmarksDB.loadBookmarks(talk1.id)).size).toBe(1);

      // Delete the talk (should cascade)
      await talksDB.deleteTalk(talk1.id);

      // Verify cascade: talk is gone
      expect(await talksDB.getTalk(talk1.id)).toBeUndefined();
    });

    it('5. Verify: sessions for that talkId are gone', async () => {
      // Setup
      await talksDB.createTalk(talk1);
      await sessionsDB.createSession(makeMockSession(talk1.id));
      await sessionsDB.createSession(makeMockSession(talk1.id));

      // Delete
      await talksDB.deleteTalk(talk1.id);

      // Verify sessions are gone
      const sessions = await sessionsDB.getSessionsByTalk(talk1.id);
      expect(sessions.length).toBe(0);
    });

    it('6. Verify: bookmarks for that talkId are gone', async () => {
      // Setup
      await talksDB.createTalk(talk1);
      await bookmarksDB.saveBookmarks(talk1.id, new Set(['slide-0', 'slide-1']));

      // Delete
      await talksDB.deleteTalk(talk1.id);

      // Verify bookmarks are gone
      const bookmarks = await bookmarksDB.loadBookmarks(talk1.id);
      expect(bookmarks.size).toBe(0);
    });

    it('7. Verify: other talks/sessions/bookmarks are unaffected', async () => {
      // Setup: two talks with sessions and bookmarks
      await talksDB.createTalk(talk1);
      await talksDB.createTalk(talk2);

      const session1 = makeMockSession(talk1.id);
      const session2 = makeMockSession(talk2.id);
      await sessionsDB.createSession(session1);
      await sessionsDB.createSession(session2);

      await bookmarksDB.saveBookmarks(talk1.id, new Set(['slide-0']));
      await bookmarksDB.saveBookmarks(talk2.id, new Set(['slide-a', 'slide-b']));

      // Delete only talk1
      await talksDB.deleteTalk(talk1.id);

      // Verify talk2 is unaffected
      const retrievedTalk2 = await talksDB.getTalk(talk2.id);
      expect(retrievedTalk2).toBeDefined();
      expect(retrievedTalk2?.title).toBe('Test Talk');

      // Verify talk2 sessions are unaffected
      const talk2Sessions = await sessionsDB.getSessionsByTalk(talk2.id);
      expect(talk2Sessions.length).toBe(1);

      // Verify talk2 bookmarks are unaffected
      const talk2Bookmarks = await bookmarksDB.loadBookmarks(talk2.id);
      expect(talk2Bookmarks.size).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('8. Deleting talk with no sessions is safe', async () => {
      await talksDB.createTalk(talk1);
      // No sessions created

      await expect(talksDB.deleteTalk(talk1.id)).resolves.not.toThrow();

      expect(await talksDB.getTalk(talk1.id)).toBeUndefined();
    });

    it('9. Deleting talk with no bookmarks is safe', async () => {
      await talksDB.createTalk(talk1);
      // No bookmarks created

      await expect(talksDB.deleteTalk(talk1.id)).resolves.not.toThrow();

      expect(await talksDB.getTalk(talk1.id)).toBeUndefined();
    });

    it('10. Deleting non-existent talk is safe', async () => {
      await expect(talksDB.deleteTalk('nonexistent-id')).resolves.not.toThrow();
    });
  });
});
