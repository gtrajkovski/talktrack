import { countWords } from "./wordCount";

export function estimateSeconds(text: string, wordsPerMinute: number = 100): number {
  const words = countWords(text);
  return Math.round((words / wordsPerMinute) * 60);
}

export function estimateTotalSeconds(texts: string[], wordsPerMinute: number = 100): number {
  return texts.reduce((total, text) => total + estimateSeconds(text, wordsPerMinute), 0);
}
