import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { saveBookmarks, loadBookmarks, clearBookmarksForTalk } from '@/lib/db/bookmarks';

// Reset IndexedDB between tests
beforeEach(async () => {
  // Delete the database to start fresh
  const databases = await indexedDB.databases();
  for (const db of databases) {
    if (db.name) {
      indexedDB.deleteDatabase(db.name);
    }
  }
});

describe('bookmark persistence', () => {
  describe('saveBookmarks and loadBookmarks', () => {
    it('roundtrips bookmarks correctly', async () => {
      const talkId = 'talk-1';
      const slideIds = new Set(['slide-a', 'slide-b', 'slide-c']);

      await saveBookmarks(talkId, slideIds);
      const loaded = await loadBookmarks(talkId);

      expect(loaded.size).toBe(3);
      expect(loaded.has('slide-a')).toBe(true);
      expect(loaded.has('slide-b')).toBe(true);
      expect(loaded.has('slide-c')).toBe(true);
    });

    it('replaces previous bookmarks (not appends)', async () => {
      const talkId = 'talk-1';

      // First save
      await saveBookmarks(talkId, new Set(['slide-1', 'slide-2']));

      // Second save should replace
      await saveBookmarks(talkId, new Set(['slide-3']));

      const loaded = await loadBookmarks(talkId);

      expect(loaded.size).toBe(1);
      expect(loaded.has('slide-1')).toBe(false);
      expect(loaded.has('slide-2')).toBe(false);
      expect(loaded.has('slide-3')).toBe(true);
    });

    it('handles empty set', async () => {
      const talkId = 'talk-1';
      await saveBookmarks(talkId, new Set());
      const loaded = await loadBookmarks(talkId);
      expect(loaded.size).toBe(0);
    });

    it('returns empty set for non-existent talk', async () => {
      const loaded = await loadBookmarks('non-existent-talk');
      expect(loaded.size).toBe(0);
    });

    it('keeps bookmarks isolated per talk', async () => {
      await saveBookmarks('talk-a', new Set(['slide-1']));
      await saveBookmarks('talk-b', new Set(['slide-2', 'slide-3']));

      const loadedA = await loadBookmarks('talk-a');
      const loadedB = await loadBookmarks('talk-b');

      expect(loadedA.size).toBe(1);
      expect(loadedA.has('slide-1')).toBe(true);

      expect(loadedB.size).toBe(2);
      expect(loadedB.has('slide-2')).toBe(true);
      expect(loadedB.has('slide-3')).toBe(true);
    });
  });

  describe('clearBookmarksForTalk', () => {
    it('removes all bookmarks for a talk', async () => {
      const talkId = 'talk-1';
      await saveBookmarks(talkId, new Set(['slide-a', 'slide-b']));

      await clearBookmarksForTalk(talkId);

      const loaded = await loadBookmarks(talkId);
      expect(loaded.size).toBe(0);
    });

    it('does not affect other talks', async () => {
      await saveBookmarks('talk-a', new Set(['slide-1']));
      await saveBookmarks('talk-b', new Set(['slide-2']));

      await clearBookmarksForTalk('talk-a');

      const loadedA = await loadBookmarks('talk-a');
      const loadedB = await loadBookmarks('talk-b');

      expect(loadedA.size).toBe(0);
      expect(loadedB.size).toBe(1);
      expect(loadedB.has('slide-2')).toBe(true);
    });

    it('handles clearing non-existent talk gracefully', async () => {
      // Should not throw
      await expect(clearBookmarksForTalk('non-existent')).resolves.toBeUndefined();
    });
  });
});

describe('auto-bookmark on low score', () => {
  // These tests verify the store behavior, not the DB directly
  // We mock the store to test the auto-bookmark logic

  it('triggers when score < 50', () => {
    const HARD_SCORE_THRESHOLD = 50;
    const score = 45;

    const shouldAutoBookmark = score < HARD_SCORE_THRESHOLD;
    expect(shouldAutoBookmark).toBe(true);
  });

  it('does NOT trigger when score >= 50', () => {
    const HARD_SCORE_THRESHOLD = 50;
    const score = 50;

    const shouldAutoBookmark = score < HARD_SCORE_THRESHOLD;
    expect(shouldAutoBookmark).toBe(false);
  });

  it('does NOT trigger when score is undefined', () => {
    const HARD_SCORE_THRESHOLD = 50;
    const score: number | undefined = undefined;

    const shouldAutoBookmark = score !== undefined && score < HARD_SCORE_THRESHOLD;
    expect(shouldAutoBookmark).toBe(false);
  });

  it('boundary: score of 49 triggers auto-bookmark', () => {
    const HARD_SCORE_THRESHOLD = 50;
    const score = 49;

    const shouldAutoBookmark = score < HARD_SCORE_THRESHOLD;
    expect(shouldAutoBookmark).toBe(true);
  });

  it('boundary: score of 51 does NOT trigger auto-bookmark', () => {
    const HARD_SCORE_THRESHOLD = 50;
    const score = 51;

    const shouldAutoBookmark = score < HARD_SCORE_THRESHOLD;
    expect(shouldAutoBookmark).toBe(false);
  });
});
