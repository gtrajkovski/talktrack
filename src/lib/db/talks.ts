import { getDB } from "./index";
import { clearBookmarksForTalk } from "./bookmarks";
import type { Talk, ScoreEntry } from "@/types/talk";

export async function getAllTalks(): Promise<Talk[]> {
  const db = await getDB();
  const talks = await db.getAllFromIndex("talks", "by-updated");
  return talks.reverse(); // Most recent first
}

export async function getTalk(id: string): Promise<Talk | undefined> {
  const db = await getDB();
  return db.get("talks", id);
}

export async function createTalk(talk: Talk): Promise<string> {
  const db = await getDB();
  await db.put("talks", talk);
  return talk.id;
}

export async function updateTalk(talk: Talk): Promise<void> {
  const db = await getDB();
  talk.updatedAt = Date.now();
  await db.put("talks", talk);
}

/**
 * Delete a talk and all associated data (cascade delete).
 * Removes: sessions, recordings, bookmarks for this talk.
 */
export async function deleteTalk(id: string): Promise<void> {
  const db = await getDB();

  // Use a transaction for atomicity where possible
  const tx = db.transaction(["talks", "sessions", "recordings"], "readwrite");

  // Delete all sessions for this talk
  const sessionsIndex = tx.objectStore("sessions").index("by-talk");
  const sessionKeys = await sessionsIndex.getAllKeys(id);
  for (const key of sessionKeys) {
    await tx.objectStore("sessions").delete(key);
  }

  // Delete all recordings for this talk
  const recordingsIndex = tx.objectStore("recordings").index("by-talk");
  const recordingKeys = await recordingsIndex.getAllKeys(id);
  for (const key of recordingKeys) {
    await tx.objectStore("recordings").delete(key);
  }

  // Delete the talk itself
  await tx.objectStore("talks").delete(id);

  await tx.done;

  // Delete bookmarks (separate transaction since it's a different store)
  await clearBookmarksForTalk(id);
}

export async function incrementRehearsalCount(id: string): Promise<void> {
  const db = await getDB();
  const talk = await db.get("talks", id);
  if (talk) {
    talk.totalRehearsals += 1;
    talk.updatedAt = Date.now();
    await db.put("talks", talk);
  }
}

export async function recordSlideScore(
  talkId: string,
  slideId: string,
  score: number,
  mode: "prompt" | "test"
): Promise<void> {
  const db = await getDB();
  const talk = await db.get("talks", talkId);
  if (!talk) return;

  const slide = talk.slides.find((s) => s.id === slideId);
  if (!slide) return;

  // Initialize scoreHistory if needed
  if (!slide.scoreHistory) {
    slide.scoreHistory = [];
  }

  // Add new score entry
  const entry: ScoreEntry = {
    score,
    timestamp: Date.now(),
    mode,
  };
  slide.scoreHistory.push(entry);

  // Keep only last 20 scores per slide to limit storage
  if (slide.scoreHistory.length > 20) {
    slide.scoreHistory = slide.scoreHistory.slice(-20);
  }

  // Update lastScore and timesRehearsed
  slide.lastScore = score;
  slide.timesRehearsed += 1;

  talk.updatedAt = Date.now();
  await db.put("talks", talk);
}
