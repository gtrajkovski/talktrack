import { nanoid } from "nanoid";
import type { Slide } from "@/types/talk";
import type { ParseResult } from "./text";

interface ExtractedContent {
  title: string;
  text: string;
  excerpt?: string;
  byline?: string | null;
  siteName?: string | null;
  source: string;
}

/**
 * Fetch readable text from a URL and convert to slides.
 *
 * Splitting strategy:
 *   - Split by double newlines (paragraphs)
 *   - Group short paragraphs (< 30 words) with the next paragraph
 *   - Each resulting block becomes a slide
 *   - First sentence of each block = slide title
 *   - Full block = notes
 *   - Cap at 60 slides max (if article is extremely long, merge remaining into last slide)
 */
export async function parseUrl(
  url: string,
  wordsPerMinute: number = 100
): Promise<ParseResult> {
  // Call our API route
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(data.error || `Failed to extract content (${response.status})`);
  }

  const content: ExtractedContent = await response.json();

  if (!content.text || content.text.trim().length === 0) {
    throw new Error("No readable text found at this URL.");
  }

  // Split into paragraphs
  const paragraphs = content.text
    .split(/\n\n+/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);

  // Group short paragraphs with the next one
  const blocks: string[] = [];
  let buffer = "";
  for (const para of paragraphs) {
    buffer += (buffer ? "\n\n" : "") + para;
    const wordCount = buffer.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 30) {
      blocks.push(buffer);
      buffer = "";
    }
  }
  if (buffer.trim()) {
    if (blocks.length > 0) {
      blocks[blocks.length - 1] += "\n\n" + buffer;
    } else {
      blocks.push(buffer);
    }
  }

  // Cap at 60 slides
  const MAX_SLIDES = 60;
  let finalBlocks = blocks;
  if (finalBlocks.length > MAX_SLIDES) {
    const overflow = finalBlocks.slice(MAX_SLIDES - 1).join("\n\n");
    finalBlocks = [...finalBlocks.slice(0, MAX_SLIDES - 1), overflow];
  }

  // Fallback if still empty
  if (finalBlocks.length === 0) {
    finalBlocks = [content.text.trim()];
  }

  const slides: Slide[] = finalBlocks.map((block, index) => {
    // Title = first sentence (up to first period, question mark, or exclamation)
    const firstSentenceMatch = block.match(/^(.+?[.!?])\s/);
    const slideTitle = firstSentenceMatch
      ? firstSentenceMatch[1].substring(0, 80)
      : block.substring(0, 80).trim();

    const notes = block.trim();
    const words = notes.split(/\s+/).filter(Boolean);

    return {
      id: nanoid(),
      index,
      title: slideTitle,
      notes,
      wordCount: words.length,
      estimatedSeconds: Math.round((words.length / wordsPerMinute) * 60),
      timesRehearsed: 0,
    };
  });

  return {
    title: content.title || "Imported Article",
    slides,
  };
}
