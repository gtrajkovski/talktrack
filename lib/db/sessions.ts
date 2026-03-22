import { getDB } from "./index";
import type { RehearsalSession } from "@/types/session";

export async function saveSession(session: RehearsalSession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getSessionsForTalk(
  talkId: string
): Promise<RehearsalSession[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex("sessions", "by-talk", talkId);
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}
