/**
 * Content Chunking Engine
 *
 * Splits slide notes into sentence or paragraph chunks for granular rehearsal.
 * Handles edge cases: abbreviations, decimals, ellipsis, dialog, etc.
 */

import type { Slide } from "@/types/talk";
import { countWords } from "./wordCount";

export type Granularity = "slide" | "paragraph" | "sentence";

export interface Chunk {
  id: string;
  slideIndex: number;
  slideId: string;
  chunkIndex: number;       // Index within the slide
  globalIndex: number;      // Index across entire talk
  type: "slide" | "paragraph" | "sentence";
  text: string;
  wordCount: number;
  estimatedSeconds: number;
  // For sentence chunks: first few words as cue
  cueText?: string;
  // For paragraph chunks: label like "Paragraph 1"
  label?: string;
}

// Common abbreviations that shouldn't end sentences
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "e.g", "i.e",
  "inc", "ltd", "corp", "co", "st", "ave", "blvd", "rd", "apt", "no",
  "vol", "rev", "ed", "pp", "fig", "ch", "sec", "min", "hr", "lb", "oz",
  "ft", "in", "cm", "mm", "km", "kg", "mg", "ml", "jan", "feb", "mar",
  "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "mon", "tue",
  "wed", "thu", "fri", "sat", "sun", "dept", "gov", "gen", "col", "lt",
  "sgt", "cpl", "pvt", "adm", "cmdr", "capt", "eng", "phd", "md", "ba",
  "ma", "bs", "ms", "llb", "jd", "dds", "esq", "hon", "pres", "vp",
]);

// Minimum words for a sentence to stand alone (merge shorter ones)
const MIN_SENTENCE_WORDS = 5;

// Words per minute for time estimation
const DEFAULT_WPM = 150;

/**
 * Split text into sentences with smart handling of edge cases.
 * Preserves original whitespace and punctuation.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Normalize whitespace but preserve structure
  const normalized = text.replace(/\r\n/g, "\n").trim();

  const sentences: string[] = [];
  let current = "";
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];
    current += char;

    // Check for sentence-ending punctuation
    if (char === "." || char === "!" || char === "?") {
      // Look ahead to see if this is really a sentence end
      const nextChar = normalized[i + 1];
      const nextNextChar = normalized[i + 2];

      // Check for ellipsis (...)
      if (char === "." && nextChar === ".") {
        i++;
        continue;
      }

      // Check for abbreviation (lowercase letter before period)
      if (char === ".") {
        // Find the word before the period
        const beforePeriod = current.slice(0, -1);
        const words = beforePeriod.trim().split(/\s+/);
        const lastWord = words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");

        if (lastWord && ABBREVIATIONS.has(lastWord)) {
          i++;
          continue;
        }

        // Check for decimal numbers (e.g., "3.14")
        if (/\d$/.test(beforePeriod) && nextChar && /\d/.test(nextChar)) {
          i++;
          continue;
        }

        // Check for initials (single letter followed by period)
        if (lastWord && lastWord.length === 1 && /[a-z]/.test(lastWord)) {
          i++;
          continue;
        }
      }

      // Check if next character indicates sentence continues
      // (lowercase letter or specific patterns)
      if (nextChar && /[a-z]/.test(nextChar) && nextNextChar !== " ") {
        i++;
        continue;
      }

      // This looks like a real sentence end
      // Consume trailing whitespace
      let j = i + 1;
      while (j < normalized.length && /[ \t]/.test(normalized[j])) {
        j++;
      }

      // Don't include trailing newlines in the sentence
      const sentence = current.trim();
      if (sentence) {
        sentences.push(sentence);
      }
      current = "";
      i = j - 1; // Will be incremented by loop
    }

    i++;
  }

  // Add any remaining text as final sentence
  const remaining = current.trim();
  if (remaining) {
    sentences.push(remaining);
  }

  return sentences;
}

/**
 * Split text into paragraphs (double newline separated).
 */
export function splitIntoParagraphs(text: string): string[] {
  if (!text || !text.trim()) return [];

  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Merge short sentences with adjacent ones.
 * This prevents awkward single-word or very short chunks.
 */
export function mergeShortSentences(sentences: string[], minWords: number = MIN_SENTENCE_WORDS): string[] {
  if (sentences.length <= 1) return sentences;

  const result: string[] = [];
  let buffer = "";

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const wordCount = countWords(sentence);

    if (buffer) {
      // We have a buffered short sentence
      if (wordCount < minWords) {
        // This one is also short, combine them
        buffer += " " + sentence;
      } else {
        // This one is long enough, prepend buffer to it
        result.push(buffer + " " + sentence);
        buffer = "";
      }
    } else if (wordCount < minWords) {
      // Start buffering short sentence
      if (result.length > 0) {
        // Append to previous sentence instead
        result[result.length - 1] += " " + sentence;
      } else {
        buffer = sentence;
      }
    } else {
      result.push(sentence);
    }
  }

  // Handle any remaining buffer
  if (buffer) {
    if (result.length > 0) {
      result[result.length - 1] += " " + buffer;
    } else {
      result.push(buffer);
    }
  }

  return result;
}

/**
 * Generate a cue (first 3 words) for a sentence.
 */
export function generateCue(text: string, wordCount: number = 3): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordCount) {
    return text.trim();
  }
  return words.slice(0, wordCount).join(" ") + "...";
}

/**
 * Chunk a single slide into the specified granularity.
 */
export function chunkSlide(
  slide: Slide,
  granularity: Granularity,
  globalIndexStart: number = 0,
  wpm: number = DEFAULT_WPM
): Chunk[] {
  const text = slide.notes || slide.title || "";

  if (granularity === "slide" || !text.trim()) {
    // Return slide as single chunk
    return [{
      id: `${slide.id}-chunk-0`,
      slideIndex: slide.index,
      slideId: slide.id,
      chunkIndex: 0,
      globalIndex: globalIndexStart,
      type: "slide",
      text: text,
      wordCount: slide.wordCount || countWords(text),
      estimatedSeconds: slide.estimatedSeconds || Math.round((countWords(text) / wpm) * 60),
    }];
  }

  if (granularity === "paragraph") {
    const paragraphs = splitIntoParagraphs(text);
    if (paragraphs.length === 0) {
      return chunkSlide(slide, "slide", globalIndexStart, wpm);
    }

    return paragraphs.map((para, i) => {
      const words = countWords(para);
      return {
        id: `${slide.id}-para-${i}`,
        slideIndex: slide.index,
        slideId: slide.id,
        chunkIndex: i,
        globalIndex: globalIndexStart + i,
        type: "paragraph" as const,
        text: para,
        wordCount: words,
        estimatedSeconds: Math.round((words / wpm) * 60),
        label: `Paragraph ${i + 1}`,
      };
    });
  }

  // Sentence granularity
  const rawSentences = splitIntoSentences(text);
  const sentences = mergeShortSentences(rawSentences);

  if (sentences.length === 0) {
    return chunkSlide(slide, "slide", globalIndexStart, wpm);
  }

  return sentences.map((sentence, i) => {
    const words = countWords(sentence);
    return {
      id: `${slide.id}-sent-${i}`,
      slideIndex: slide.index,
      slideId: slide.id,
      chunkIndex: i,
      globalIndex: globalIndexStart + i,
      type: "sentence" as const,
      text: sentence,
      wordCount: words,
      estimatedSeconds: Math.round((words / wpm) * 60),
      cueText: generateCue(sentence),
    };
  });
}

/**
 * Chunk an entire talk into the specified granularity.
 */
export function chunkTalk(
  slides: Slide[],
  granularity: Granularity,
  wpm: number = DEFAULT_WPM
): Chunk[] {
  const allChunks: Chunk[] = [];
  let globalIndex = 0;

  for (const slide of slides) {
    const slideChunks = chunkSlide(slide, granularity, globalIndex, wpm);
    allChunks.push(...slideChunks);
    globalIndex += slideChunks.length;
  }

  return allChunks;
}

/**
 * Find the chunk index that contains a specific slide.
 * Useful for syncing position when switching granularity.
 */
export function findChunkBySlide(chunks: Chunk[], slideIndex: number): number {
  const idx = chunks.findIndex(c => c.slideIndex === slideIndex);
  return idx >= 0 ? idx : 0;
}

/**
 * Get chunk counts per slide for progress display.
 */
export function getChunksPerSlide(chunks: Chunk[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const chunk of chunks) {
    counts.set(chunk.slideIndex, (counts.get(chunk.slideIndex) || 0) + 1);
  }
  return counts;
}

/**
 * Format position label for display.
 * e.g., "3/12 • S 5/18" (slide 3 of 12, sentence 5 of 18)
 */
export function formatPositionLabel(
  chunks: Chunk[],
  currentChunkIndex: number,
  totalSlides: number
): string {
  if (chunks.length === 0) return "";

  const chunk = chunks[currentChunkIndex];
  if (!chunk) return "";

  const slideNum = chunk.slideIndex + 1;
  const chunkNum = currentChunkIndex + 1;
  const totalChunks = chunks.length;

  if (chunk.type === "slide") {
    return `${slideNum}/${totalSlides}`;
  }

  const typeLabel = chunk.type === "sentence" ? "S" : "P";
  return `${slideNum}/${totalSlides} • ${typeLabel} ${chunkNum}/${totalChunks}`;
}
