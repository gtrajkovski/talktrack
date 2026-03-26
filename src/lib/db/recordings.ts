import { getDB } from "./index";
import type { Recording } from "@/types/recording";

const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export async function createRecording(recording: Recording): Promise<string> {
  const db = await getDB();
  await db.put("recordings", recording);
  return recording.id;
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  const db = await getDB();
  return db.get("recordings", id);
}

export async function getRecordingsBySession(sessionId: string): Promise<Recording[]> {
  const db = await getDB();
  return db.getAllFromIndex("recordings", "by-session", sessionId);
}

export async function getRecordingsByTalk(talkId: string): Promise<Recording[]> {
  const db = await getDB();
  const recordings = await db.getAllFromIndex("recordings", "by-talk", talkId);
  return recordings.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("recordings", id);
}

export async function deleteRecordingsBySession(sessionId: string): Promise<void> {
  const db = await getDB();
  const recordings = await db.getAllFromIndex("recordings", "by-session", sessionId);
  const tx = db.transaction("recordings", "readwrite");
  await Promise.all(recordings.map((r) => tx.store.delete(r.id)));
  await tx.done;
}

export async function deleteRecordingsByTalk(talkId: string): Promise<void> {
  const db = await getDB();
  const recordings = await db.getAllFromIndex("recordings", "by-talk", talkId);
  const tx = db.transaction("recordings", "readwrite");
  await Promise.all(recordings.map((r) => tx.store.delete(r.id)));
  await tx.done;
}

/**
 * Delete recordings older than 30 days to save storage space.
 * Call this on app startup.
 */
export async function cleanupOldRecordings(): Promise<number> {
  const db = await getDB();
  const cutoff = Date.now() - RETENTION_MS;

  const allRecordings = await db.getAll("recordings");
  const oldRecordings = allRecordings.filter((r) => r.createdAt < cutoff);

  if (oldRecordings.length === 0) return 0;

  const tx = db.transaction("recordings", "readwrite");
  await Promise.all(oldRecordings.map((r) => tx.store.delete(r.id)));
  await tx.done;

  return oldRecordings.length;
}

/**
 * Get total storage used by recordings (approximate, in bytes).
 */
export async function getRecordingsStorageSize(): Promise<number> {
  const db = await getDB();
  const allRecordings = await db.getAll("recordings");
  return allRecordings.reduce((total, r) => total + (r.audioBlob?.size || 0), 0);
}
