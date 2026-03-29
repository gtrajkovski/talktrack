import { nanoid } from "nanoid";
import type { Slide } from "@/types/talk";
import type { ParseResult } from "./text";

/**
 * Parse a PDF file into slides.
 *
 * Strategy - PDFs don't have slide boundaries like PPTX:
 *   1. Extract text page-by-page using pdfjs-dist
 *   2. Each page becomes a slide
 *   3. If a page has very little text (< 20 words), merge with previous page
 *   4. First non-empty line of each page = slide title
 *   5. Remaining lines = notes
 */
export async function parsePdf(
  file: File,
  wordsPerMinute: number = 100
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Dynamic import to avoid SSR issues - pdfjs-dist is browser-only
  const pdfjsLib = await import("pdfjs-dist");

  // Set the worker source. Use the bundled worker from pdfjs-dist via CDN.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Extract text from each page
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        // Each item has a `str` property with the text
        // pdfjs-dist types are weak here, so we use type assertion
        const textItem = item as { str: string; hasEOL?: boolean };
        return textItem.str + (textItem.hasEOL ? "\n" : "");
      })
      .join("")
      .trim();
    if (pageText.length > 0) {
      pageTexts.push(pageText);
    }
  }

  if (pageTexts.length === 0) {
    throw new Error(
      "This PDF appears to be empty or image-only (scanned). " +
        "Please use a text-based PDF, or paste your content directly."
    );
  }

  // Merge very short pages (< 20 words) with the previous page
  const merged: string[] = [];
  for (const text of pageTexts) {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 20 && merged.length > 0) {
      merged[merged.length - 1] += "\n\n" + text;
    } else {
      merged.push(text);
    }
  }

  const title = file.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");

  const slides: Slide[] = merged.map((block, index) => {
    const lines = block.split("\n").filter((l: string) => l.trim().length > 0);
    const slideTitle =
      lines[0]?.trim().substring(0, 80) || `Page ${index + 1}`;
    const notes =
      lines.length > 1
        ? lines.slice(1).join("\n").trim()
        : lines[0]?.trim() || "";
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

  return { title, slides };
}
