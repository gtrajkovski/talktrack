import { getDB } from "./index";
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
