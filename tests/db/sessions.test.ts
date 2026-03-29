import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import * as sessionsDB from '@/lib/db/sessions';
import type { RehearsalSession, SlideAttempt } from '@/types/session';

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

// Helper to create a mock attempt
function makeMockAttempt(slideIndex: number): SlideAttempt {
  return {
    slideId: `slide-${slideIndex}`,
    slideIndex,
    spokenText: 'This is what the user said.',
    similarityScore: 75,
    wordsPerMinute: 120,
    fillerWordCount: 2,
    duration: 5000,
    usedHelp: false,
  };
}

describe('DB: sessions', () => {
  const testTalkId = 'test-talk-id';

  beforeEach(async () => {
    // Clean up any existing sessions
    const sessions = await sessionsDB.getAllSessions();
    for (const session of sessions) {
      await sessionsDB.deleteSession(session.id);
    }
  });

  describe('CRUD Operations', () => {
    it('1. saveSession + getSession roundtrip', async () => {
      const session = makeMockSession(testTalkId);
      await sessionsDB.createSession(session);

      const retrieved = await sessionsDB.getSession(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
      expect(retrieved?.talkId).toBe(testTalkId);
      expect(retrieved?.mode).toBe('listen');
    });

    it('2. getSessionsByTalk — returns only sessions matching talkId', async () => {
      const session1 = makeMockSession(testTalkId);
      const session2 = makeMockSession(testTalkId);
      const session3 = makeMockSession('other-talk-id');

      await sessionsDB.createSession(session1);
      await sessionsDB.createSession(session2);
      await sessionsDB.createSession(session3);

      const sessions = await sessionsDB.getSessionsByTalk(testTalkId);
      expect(sessions.length).toBe(2);
      expect(sessions.every(s => s.talkId === testTalkId)).toBe(true);
    });

    it('3. getSessionsByTalk — returns empty array for unknown talkId', async () => {
      const session = makeMockSession(testTalkId);
      await sessionsDB.createSession(session);

      const sessions = await sessionsDB.getSessionsByTalk('nonexistent-talk');
      expect(sessions).toEqual([]);
    });

    it('4. Session with SlideAttempt array — attempts persisted correctly', async () => {
      const session = makeMockSession(testTalkId);
      session.attempts = [
        makeMockAttempt(0),
        makeMockAttempt(1),
        makeMockAttempt(2),
      ];
      await sessionsDB.createSession(session);

      const retrieved = await sessionsDB.getSession(session.id);
      expect(retrieved?.attempts.length).toBe(3);
      expect(retrieved?.attempts[0].similarityScore).toBe(75);
      expect(retrieved?.attempts[1].slideIndex).toBe(1);
    });

    it('5. Session fields: mode, startedAt, completedAt, slidesCompleted — all persist', async () => {
      const session = makeMockSession(testTalkId);
      session.mode = 'test';
      session.startedAt = 1000000;
      session.completedAt = 2000000;
      session.slidesCompleted = 5;
      await sessionsDB.createSession(session);

      const retrieved = await sessionsDB.getSession(session.id);
      expect(retrieved?.mode).toBe('test');
      expect(retrieved?.startedAt).toBe(1000000);
      expect(retrieved?.completedAt).toBe(2000000);
      expect(retrieved?.slidesCompleted).toBe(5);
    });

    it('6. Multiple sessions for same talk — all retrievable', async () => {
      const session1 = makeMockSession(testTalkId);
      const session2 = makeMockSession(testTalkId);
      const session3 = makeMockSession(testTalkId);

      await sessionsDB.createSession(session1);
      await sessionsDB.createSession(session2);
      await sessionsDB.createSession(session3);

      const sessions = await sessionsDB.getSessionsByTalk(testTalkId);
      expect(sessions.length).toBe(3);
    });
  });

  describe('Update and Delete', () => {
    it('7. updateSession — modifies fields', async () => {
      const session = makeMockSession(testTalkId);
      await sessionsDB.createSession(session);

      session.slidesCompleted = 10;
      session.currentSlideIndex = 5;
      await sessionsDB.updateSession(session);

      const retrieved = await sessionsDB.getSession(session.id);
      expect(retrieved?.slidesCompleted).toBe(10);
      expect(retrieved?.currentSlideIndex).toBe(5);
    });

    it('8. deleteSession — removes session', async () => {
      const session = makeMockSession(testTalkId);
      await sessionsDB.createSession(session);
      await sessionsDB.deleteSession(session.id);

      const retrieved = await sessionsDB.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Incomplete Sessions (Resume)', () => {
    it('9. getIncompleteSessions — returns sessions without completedAt', async () => {
      const completed = makeMockSession(testTalkId);
      completed.completedAt = Date.now();

      const incomplete = makeMockSession(testTalkId);
      // No completedAt set

      await sessionsDB.createSession(completed);
      await sessionsDB.createSession(incomplete);

      const incompleteSessions = await sessionsDB.getIncompleteSessions();
      expect(incompleteSessions.length).toBe(1);
      expect(incompleteSessions[0].id).toBe(incomplete.id);
    });

    it('10. pauseSession — sets pausedAt timestamp', async () => {
      const session = makeMockSession(testTalkId);
      await sessionsDB.createSession(session);

      await sessionsDB.pauseSession(session.id);

      const retrieved = await sessionsDB.getSession(session.id);
      expect(retrieved?.pausedAt).toBeGreaterThan(0);
    });
  });

  describe('Attempt Data Integrity', () => {
    it('11. SlideAttempt with all fields persists correctly', async () => {
      const session = makeMockSession(testTalkId);
      session.attempts = [{
        slideId: 'slide-0',
        slideIndex: 0,
        spokenText: 'The quick brown fox jumps over the lazy dog.',
        similarityScore: 92,
        wordsPerMinute: 145,
        fillerWordCount: 0,
        duration: 3500,
        usedHelp: true,
      }];
      await sessionsDB.createSession(session);

      const retrieved = await sessionsDB.getSession(session.id);
      const attempt = retrieved?.attempts[0];
      expect(attempt?.spokenText).toBe('The quick brown fox jumps over the lazy dog.');
      expect(attempt?.similarityScore).toBe(92);
      expect(attempt?.wordsPerMinute).toBe(145);
      expect(attempt?.fillerWordCount).toBe(0);
      expect(attempt?.duration).toBe(3500);
      expect(attempt?.usedHelp).toBe(true);
    });
  });
});
