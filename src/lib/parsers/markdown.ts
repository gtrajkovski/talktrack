import { nanoid } from "nanoid";
import { countWords } from "@/lib/utils/wordCount";
import { estimateSeconds } from "@/lib/utils/estimateTime";
import type { Slide } from "@/types/talk";

export interface ParseResult {
  slides: Slide[];
  title: string;
}

/**
 * Parse markdown into slides with sections.
 *
 * Structure:
 * - `# Heading` (H1) = Section marker
 * - `## Heading` (H2) = Slide marker
 * - Content below ## = Slide notes
 */
export function parseMarkdown(markdown: string, wordsPerMinute: number = 100): ParseResult {
  const slides: Slide[] = [];
  let currentSectionId: string | undefined;
  let currentSectionName: string | undefined;
  let documentTitle = "";

  // Split by headings (# or ##)
  const parts = markdown.split(/(?=^#{1,2}\s+)/m);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check for H1 (section)
    const h1Match = trimmed.match(/^#\s+(.+)$/m);
    if (h1Match) {
      const heading = h1Match[1].trim();

      // First H1 is document title, subsequent are sections
      if (!documentTitle) {
        documentTitle = heading;
      }

      // Start new section
      currentSectionId = nanoid();
      currentSectionName = heading;

      // Check if there's content after the H1 that isn't an H2
      const afterH1 = trimmed.replace(/^#\s+.+\n?/, "").trim();
      if (afterH1 && !afterH1.startsWith("##")) {
        // Parse as slide content directly under section
        const lines = afterH1.split("\n");
        const title = lines[0].trim();
        const notes = lines.length > 1 ? lines.slice(1).join("\n").trim() : title;

        if (title) {
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
      continue;
    }

    // Check for H2 (slide)
    const h2Match = trimmed.match(/^##\s+(.+)$/m);
    if (h2Match) {
      const title = h2Match[1].trim();
      const notes = trimmed.replace(/^##\s+.+\n?/, "").trim() || title;

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

  const title = documentTitle || (slides.length > 0 ? slides[0].title.slice(0, 50) : "Untitled");

  return { slides, title };
}
