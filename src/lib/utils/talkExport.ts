/**
 * Talk Export/Import Utilities
 *
 * Export talks as JSON for backup and multi-device sync.
 */

import { nanoid } from "nanoid";
import type { Talk } from "@/types/talk";

export interface TalkExport {
  version: number;
  exportedAt: number;
  talk: Talk;
}

/**
 * Serialize a talk for export
 */
export function exportTalk(talk: Talk): string {
  const data: TalkExport = {
    version: 1,
    exportedAt: Date.now(),
    talk,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Download talk as JSON file
 */
export function downloadTalkJson(talk: Talk): void {
  const json = exportTalk(talk);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${talk.title.replace(/[^a-z0-9]/gi, "_")}.talktrack.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate imported JSON
 */
export function validateImport(json: string): TalkExport | null {
  try {
    const data = JSON.parse(json);
    // Basic validation
    if (!data.version || typeof data.version !== "number") return null;
    if (!data.talk) return null;
    if (!data.talk.title || typeof data.talk.title !== "string") return null;
    if (!Array.isArray(data.talk.slides)) return null;
    return data as TalkExport;
  } catch {
    return null;
  }
}

/**
 * Prepare imported talk for saving (new ID, reset stats)
 */
export function prepareTalkForImport(data: TalkExport): Talk {
  const now = Date.now();
  return {
    ...data.talk,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    totalRehearsals: 0,
    // Regenerate slide IDs to avoid conflicts
    slides: data.talk.slides.map((slide, index) => ({
      ...slide,
      id: nanoid(),
      index,
      timesRehearsed: 0,
      lastScore: undefined,
      scoreHistory: [],
      srBox: 1,
      srLastReviewedAt: undefined,
      srNextReviewAt: undefined,
    })),
  };
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
