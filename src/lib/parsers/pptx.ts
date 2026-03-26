import JSZip from "jszip";
import { nanoid } from "nanoid";
import { countWords } from "@/lib/utils/wordCount";
import { estimateSeconds } from "@/lib/utils/estimateTime";
import type { Slide } from "@/types/talk";

export interface ParseResult {
  slides: Slide[];
  title: string;
}

interface SlideData {
  index: number;
  title: string;
  notes: string;
}

function extractTextFromXml(xml: string): string {
  // Extract all <a:t> text nodes
  const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  const texts = textMatches.map((match) => {
    const content = match.replace(/<\/?a:t>/g, "");
    return content.trim();
  });

  return texts.join(" ").trim();
}

function extractTitleFromSlide(xml: string): string {
  // Look for title placeholder
  // <p:sp> with <p:ph type="title" or type="ctrTitle">
  const titleRegex = /<p:sp[^>]*>[\s\S]*?<p:ph[^>]*type="(?:title|ctrTitle)"[^>]*>[\s\S]*?<\/p:sp>/gi;
  const titleMatch = xml.match(titleRegex);

  if (titleMatch) {
    return extractTextFromXml(titleMatch[0]);
  }

  // Fallback: get first text content
  const firstText = extractTextFromXml(xml);
  return firstText.split(" ").slice(0, 10).join(" ") || "Untitled Slide";
}

function extractNotesFromXml(xml: string): string {
  // Notes contain <a:t> nodes but may include slide number placeholders
  // Filter out obvious placeholders like single numbers or "Slide X"
  const text = extractTextFromXml(xml);

  // Remove common auto-generated content
  const cleaned = text
    .replace(/^\d+\s*$/, "") // Just a number
    .replace(/^Slide \d+$/i, "") // "Slide 1"
    .replace(/^\*$/, "") // Just an asterisk
    .trim();

  return cleaned;
}

export async function parsePptx(
  file: ArrayBuffer,
  wordsPerMinute: number = 100
): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(file);

  const slidesData: SlideData[] = [];

  // Find all slide files
  const slideFiles = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return numA - numB;
    });

  // Process each slide
  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = slideFiles[i];
    const slideNum = parseInt(slidePath.match(/slide(\d+)/)?.[1] || "0");

    // Get slide content
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;

    const slideXml = await slideFile.async("string");
    const title = extractTitleFromSlide(slideXml);

    // Get notes if they exist
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    const notesFile = zip.file(notesPath);
    let notes = "";

    if (notesFile) {
      const notesXml = await notesFile.async("string");
      notes = extractNotesFromXml(notesXml);
    }

    // If no notes, use the slide content as notes
    if (!notes) {
      notes = extractTextFromXml(slideXml);
    }

    slidesData.push({
      index: i,
      title: title || `Slide ${i + 1}`,
      notes: notes || title || `Slide ${i + 1}`,
    });
  }

  // Convert to Slide objects
  const slides: Slide[] = slidesData.map((data) => ({
    id: nanoid(),
    index: data.index,
    title: data.title,
    notes: data.notes,
    wordCount: countWords(data.notes),
    estimatedSeconds: estimateSeconds(data.notes, wordsPerMinute),
    timesRehearsed: 0,
  }));

  // Try to get presentation title from core.xml
  let title = "Untitled Presentation";
  const coreFile = zip.file("docProps/core.xml");
  if (coreFile) {
    const coreXml = await coreFile.async("string");
    const titleMatch = coreXml.match(/<dc:title>([^<]+)<\/dc:title>/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
  }

  // Fallback to first slide title
  if (title === "Untitled Presentation" && slides.length > 0) {
    title = slides[0].title.slice(0, 50);
  }

  return { slides, title };
}
