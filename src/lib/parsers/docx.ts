import mammoth from "mammoth";
import { nanoid } from "nanoid";
import { countWords } from "@/lib/utils/wordCount";
import { estimateSeconds } from "@/lib/utils/estimateTime";
import type { Slide } from "@/types/talk";

export interface ParseResult {
  slides: Slide[];
  title: string;
}

export async function parseDocx(
  file: ArrayBuffer,
  wordsPerMinute: number = 100
): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ arrayBuffer: file });
  const text = result.value;

  const slides: Slide[] = [];

  // Try to split by headings first (lines that are short and followed by content)
  // Or split by blank lines
  const lines = text.split("\n");
  let currentTitle = "";
  let currentNotes: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      // Blank line - if we have content, save it
      if (currentTitle && currentNotes.length > 0) {
        const notes = currentNotes.join("\n").trim();
        slides.push({
          id: nanoid(),
          index: slides.length,
          title: currentTitle,
          notes: notes || currentTitle,
          wordCount: countWords(notes || currentTitle),
          estimatedSeconds: estimateSeconds(notes || currentTitle, wordsPerMinute),
          timesRehearsed: 0,
        });
        currentTitle = "";
        currentNotes = [];
      } else if (currentTitle) {
        // Title with no notes yet - keep it
        continue;
      }
    } else if (!currentTitle) {
      // First non-blank line after a break is the title
      currentTitle = trimmed;
    } else {
      // Content line
      currentNotes.push(trimmed);
    }
  }

  // Don't forget the last section
  if (currentTitle) {
    const notes = currentNotes.join("\n").trim();
    slides.push({
      id: nanoid(),
      index: slides.length,
      title: currentTitle,
      notes: notes || currentTitle,
      wordCount: countWords(notes || currentTitle),
      estimatedSeconds: estimateSeconds(notes || currentTitle, wordsPerMinute),
      timesRehearsed: 0,
    });
  }

  // If no slides were created (no blank line separators), treat the whole thing as one slide
  if (slides.length === 0 && text.trim()) {
    const allLines = text.trim().split("\n");
    const title = allLines[0].trim();
    const notes = allLines.slice(1).join("\n").trim() || title;

    slides.push({
      id: nanoid(),
      index: 0,
      title,
      notes,
      wordCount: countWords(notes),
      estimatedSeconds: estimateSeconds(notes, wordsPerMinute),
      timesRehearsed: 0,
    });
  }

  const title = slides.length > 0 ? slides[0].title.slice(0, 50) : "Untitled Document";

  return { slides, title };
}
