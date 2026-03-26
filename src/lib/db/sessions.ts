import { getDB } from "./index";
import type { RehearsalSession } from "@/types/session";

export async function getAllSessions(): Promise<RehearsalSession[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex("sessions", "by-started");
  return sessions.reverse(); // Most recent first
}

export async function getSessionsByTalk(talkId: string): Promise<RehearsalSession[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex("sessions", "by-talk", talkId);
  return sessions.reverse(); // Most recent first
}

export async function getSession(id: string): Promise<RehearsalSession | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function createSession(session: RehearsalSession): Promise<string> {
  const db = await getDB();
  await db.put("sessions", session);
  return session.id;
}

export async function updateSession(session: RehearsalSession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}

/**
 * Get incomplete sessions (no completedAt) for resume functionality.
 * Returns most recent first.
 */
export async function getIncompleteSessions(): Promise<RehearsalSession[]> {
  const db = await getDB();
  const sessions = await db.getAll("sessions");
  return sessions
    .filter((s) => !s.completedAt)
    .sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Mark a session as paused (for resume tracking).
 */
export async function pauseSession(id: string): Promise<void> {
  const db = await getDB();
  const session = await db.get("sessions", id);
  if (session) {
    session.pausedAt = Date.now();
    await db.put("sessions", session);
  }
}
