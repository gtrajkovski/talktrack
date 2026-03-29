import { getDB, type StoredBookmark } from "./index";

/**
 * Save bookmarks for a talk.
 * Replaces all existing bookmarks for the talk with the new set.
 * Uses a single transaction for atomicity.
 */
export async function saveBookmarks(
  talkId: string,
  slideIds: Set<string>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("bookmarks", "readwrite");
  const store = tx.objectStore("bookmarks");
  const index = store.index("by-talk");

  // Delete all existing bookmarks for this talk
  const existingKeys = await index.getAllKeys(talkId);
  for (const key of existingKeys) {
    await store.delete(key);
  }

  // Add new bookmarks
  const now = Date.now();
  for (const slideId of slideIds) {
    const bookmark: StoredBookmark = {
      talkId,
      slideId,
      createdAt: now,
    };
    await store.put(bookmark);
  }

  await tx.done;
}

/**
 * Load bookmarks for a talk.
 * Returns a Set of slideIds that are bookmarked.
 */
export async function loadBookmarks(talkId: string): Promise<Set<string>> {
  const db = await getDB();
  const index = db.transaction("bookmarks", "readonly")
    .objectStore("bookmarks")
    .index("by-talk");

  const bookmarks = await index.getAll(talkId);
  return new Set(bookmarks.map((b) => b.slideId));
}

/**
 * Clear all bookmarks for a talk.
 * Called when a talk is deleted (cascade delete) or user clears bookmarks.
 */
export async function clearBookmarksForTalk(talkId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("bookmarks", "readwrite");
  const store = tx.objectStore("bookmarks");
  const index = store.index("by-talk");

  const keys = await index.getAllKeys(talkId);
  for (const key of keys) {
    await store.delete(key);
  }

  await tx.done;
}
