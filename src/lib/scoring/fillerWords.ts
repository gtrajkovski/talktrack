const FILLER_WORDS = [
  "um", "uh", "er", "ah", "like", "you know", "so", "basically",
  "actually", "literally", "right", "okay", "well", "i mean",
  "sort of", "kind of", "you see", "honestly", "frankly",
];

export interface FillerAnalysis {
  count: number;
  words: { word: string; count: number }[];
  percentage: number;
}

export function analyzeFillerWords(transcript: string): FillerAnalysis {
  const normalized = transcript.toLowerCase();
  const totalWords = transcript.split(/\s+/).filter((w) => w.length > 0).length;

  const foundFillers: { word: string; count: number }[] = [];
  let totalFillerCount = 0;

  for (const filler of FILLER_WORDS) {
    // Count occurrences (word boundary aware)
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = normalized.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      foundFillers.push({ word: filler, count });
      totalFillerCount += count;
    }
  }

  // Sort by count descending
  foundFillers.sort((a, b) => b.count - a.count);

  return {
    count: totalFillerCount,
    words: foundFillers,
    percentage: totalWords > 0 ? (totalFillerCount / totalWords) * 100 : 0,
  };
}

export function countFillerWords(transcript: string): number {
  return analyzeFillerWords(transcript).count;
}
