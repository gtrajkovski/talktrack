import { nanoid } from "nanoid";
import { countWords } from "@/lib/utils/wordCount";
import { estimateSeconds } from "@/lib/utils/estimateTime";
import type { Slide } from "@/types/talk";

export interface ParseResult {
  slides: Slide[];
  title: string;
}

export function parseText(text: string, wordsPerMinute: number = 100): ParseResult {
  const slides: Slide[] = [];

  // Split by double newlines (blank lines)
  const blocks = text.trim().split(/\n\s*\n/);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    const lines = block.split("\n");
    const title = lines[0].trim();
    const notes = lines.length > 1 ? lines.slice(1).join("\n").trim() : title;

    slides.push({
      id: nanoid(),
      index: slides.length,
      title,
      notes,
      wordCount: countWords(notes),
      estimatedSeconds: estimateSeconds(notes, wordsPerMinute),
      timesRehearsed: 0,
    });
  }

  const title = slides.length > 0 ? slides[0].title.slice(0, 50) : "Untitled";

  return { slides, title };
}
