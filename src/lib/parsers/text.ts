import { nanoid } from "nanoid";
import { countWords } from "@/lib/utils/wordCount";
import { estimateSeconds } from "@/lib/utils/estimateTime";
import type { Slide } from "@/types/talk";

export interface ParseResult {
  slides: Slide[];
  title: string;
}

/**
 * Parse plain text into slides with optional sections.
 *
 * Section markers:
 * - `# Section Name` on its own line starts a new section
 * - `---` or `===` on its own line also starts a new section (unnamed)
 *
 * Slides are separated by blank lines within each section.
 */
export function parseText(text: string, wordsPerMinute: number = 100): ParseResult {
  const slides: Slide[] = [];
  let currentSectionId: string | undefined;
  let currentSectionName: string | undefined;
  let unnamedSectionCount = 0;

  // Split by section markers first
  const sectionPattern = /^(?:#{1}\s+(.+)|[-=]{3,})$/m;
  const parts = text.trim().split(/\n(?=#{1}\s+|[-=]{3,}\s*$)/m);

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    // Check if this part starts with a section marker
    const lines = trimmedPart.split("\n");
    const firstLine = lines[0].trim();

    // Check for # Section header
    const sectionMatch = firstLine.match(/^#\s+(.+)$/);
    if (sectionMatch) {
      currentSectionId = nanoid();
      currentSectionName = sectionMatch[1].trim();
      // Remove the section header line and continue parsing
      lines.shift();
    } else if (/^[-=]{3,}$/.test(firstLine)) {
      // Section divider without name
      unnamedSectionCount++;
      currentSectionId = nanoid();
      currentSectionName = `Section ${unnamedSectionCount}`;
      lines.shift();
    }

    // Parse remaining content into slides
    const content = lines.join("\n").trim();
    if (!content) continue;

    // Split by double newlines (blank lines) into slide blocks
    const blocks = content.split(/\n\s*\n/);

    for (const block of blocks) {
      const blockTrimmed = block.trim();
      if (!blockTrimmed) continue;

      const blockLines = blockTrimmed.split("\n");
      const title = blockLines[0].trim();
      const notes = blockLines.length > 1 ? blockLines.slice(1).join("\n").trim() : title;

      slides.push({
        id: nanoid(),
        index: slides.length,
        title,
        notes,
        wordCount: countWords(notes),
        estimatedSeconds: estimateSeconds(notes, wordsPerMinute),
        timesRehearsed: 0,
        sectionId: currentSectionId,
        sectionName: currentSectionName,
      });
    }
  }

  const title = slides.length > 0 ? slides[0].title.slice(0, 50) : "Untitled";

  return { slides, title };
}
