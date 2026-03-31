// Common stop words to filter out
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "he", "in", "is", "it", "its", "of", "on", "that", "the",
  "to", "was", "were", "will", "with", "the", "this", "but", "they",
  "have", "had", "what", "when", "where", "who", "which", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "can", "just", "should", "now", "i", "you", "we", "your", "my",
  "me", "do", "does", "did", "doing", "would", "could", "might", "must",
  "shall", "may", "if", "or", "because", "about", "into", "through",
  "during", "before", "after", "above", "below", "between", "under",
  "again", "further", "then", "once", "here", "there", "when", "where",
  "why", "how", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "so", "than", "too", "very",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter((word) => word.length > 0);
}

function removeStopWords(words: string[]): string[] {
  return words.filter((word) => !STOP_WORDS.has(word));
}

export function calculateSimilarity(original: string, spoken: string): number {
  const originalWords = removeStopWords(tokenize(original));
  const spokenWords = removeStopWords(tokenize(spoken));

  if (originalWords.length === 0) return 100;
  if (spokenWords.length === 0) return 0;

  // Create a set for faster lookup
  const spokenSet = new Set(spokenWords);

  // Count hits
  let hits = 0;
  for (const word of originalWords) {
    if (spokenSet.has(word)) {
      hits++;
    }
  }

  // Calculate base score
  const score = (hits / originalWords.length) * 100;

  // Cap at 100
  return Math.min(100, Math.round(score));
}

export function extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
  const words = tokenize(text);
  const contentWords = removeStopWords(words);

  // Simple approach: return the most common content words
  const wordCounts = new Map<string, number>();
  for (const word of contentWords) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  // Sort by count and return top N
  const sorted = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPhrases)
    .map(([word]) => word);

  return sorted;
}

/**
 * Get content words from original that weren't spoken.
 * Used for "what did I miss" feedback.
 *
 * @param original - The original slide notes
 * @param spoken - What the user said
 * @param maxWords - Maximum number of missed words to return
 * @returns Array of missed content words, most important first
 */
export function getMissedContentWords(
  original: string,
  spoken: string,
  maxWords: number = 5
): string[] {
  const originalWords = removeStopWords(tokenize(original));
  const spokenWords = new Set(removeStopWords(tokenize(spoken)));

  if (originalWords.length === 0) return [];

  // Count frequency of each word in original (more frequent = more important)
  const wordCounts = new Map<string, number>();
  for (const word of originalWords) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  // Find words that weren't spoken
  const missed: { word: string; count: number }[] = [];
  const seenMissed = new Set<string>();

  for (const word of originalWords) {
    if (!spokenWords.has(word) && !seenMissed.has(word)) {
      seenMissed.add(word);
      missed.push({ word, count: wordCounts.get(word) || 1 });
    }
  }

  // Sort by frequency (most important words first) and return
  return missed
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords)
    .map(m => m.word);
}
