import { getDB } from "./index";
import type { Talk } from "@/types/talk";

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

export async function deleteTalk(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("talks", id);
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
