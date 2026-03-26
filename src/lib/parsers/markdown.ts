import { nanoid } from "nanoid";
import { countWords } from "@/lib/utils/wordCount";
import { estimateSeconds } from "@/lib/utils/estimateTime";
import type { Slide } from "@/types/talk";

export interface ParseResult {
  slides: Slide[];
  title: string;
}

export function parseMarkdown(markdown: string, wordsPerMinute: number = 100): ParseResult {
  const slides: Slide[] = [];

  // Split by ## headings (h2)
  const sections = markdown.split(/(?=^##\s+)/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Check if starts with ## heading
    const headingMatch = trimmed.match(/^##\s+(.+)$/m);

    if (headingMatch) {
      const title = headingMatch[1].trim();
      const notes = trimmed.replace(/^##\s+.+\n?/, "").trim() || title;

      slides.push({
        id: nanoid(),
        index: slides.length,
        title,
        notes,
        wordCount: countWords(notes),
        estimatedSeconds: estimateSeconds(notes, wordsPerMinute),
        timesRehearsed: 0,
      });
    } else if (slides.length === 0) {
      // First block without heading - check for h1 as title
      const h1Match = trimmed.match(/^#\s+(.+)$/m);
      if (h1Match) {
        // Skip document title, look for content after it
        const afterH1 = trimmed.replace(/^#\s+.+\n?/, "").trim();
        if (afterH1) {
          // Parse the rest as plain text
          const lines = afterH1.split("\n");
          const firstLine = lines[0].trim();
          const rest = lines.slice(1).join("\n").trim();

          slides.push({
            id: nanoid(),
            index: 0,
            title: firstLine,
            notes: rest || firstLine,
            wordCount: countWords(rest || firstLine),
            estimatedSeconds: estimateSeconds(rest || firstLine, wordsPerMinute),
            timesRehearsed: 0,
          });
        }
      }
    }
  }

  const title = slides.length > 0 ? slides[0].title.slice(0, 50) : "Untitled";

  return { slides, title };
}
