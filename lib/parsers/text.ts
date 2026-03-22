import { nanoid } from "nanoid";
import type { Slide } from "@/types/talk";

const DEFAULT_WPM = 100;

export function parseText(raw: string): Slide[] {
  const sections = raw
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sections.map((section, i) => {
    const lines = section.split("\n").map((l) => l.trim());
    const title = lines[0] || `Slide ${i + 1}`;
    const notes = lines.length > 1 ? lines.slice(1).join("\n") : lines[0];
    const wordCount = notes.split(/\s+/).filter(Boolean).length;

    return {
      id: nanoid(),
      index: i,
      title,
      notes,
      wordCount,
      estimatedSeconds: Math.round((wordCount / DEFAULT_WPM) * 60),
      timesRehearsed: 0,
    };
  });
}
