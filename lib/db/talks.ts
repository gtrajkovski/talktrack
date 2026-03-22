import { getDB } from "./index";
import type { Talk } from "@/types/talk";

export async function getAllTalks(): Promise<Talk[]> {
  const db = await getDB();
  const talks = await db.getAll("talks");
  return talks.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getTalk(id: string): Promise<Talk | undefined> {
  const db = await getDB();
  return db.get("talks", id);
}

export async function saveTalk(talk: Talk): Promise<void> {
  const db = await getDB();
  await db.put("talks", talk);
}

export async function deleteTalk(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("talks", id);
}
