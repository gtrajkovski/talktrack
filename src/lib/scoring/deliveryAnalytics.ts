/**
 * Delivery Analytics Module
 *
 * Enhanced filler word detection with categories, pace analysis,
 * and spoken feedback generation for voice-first UX.
 */

import type { PaceAssessment } from "@/types/session";

// Filler word categories for nuanced feedback
export type FillerCategory = 'hesitation' | 'hedge' | 'verbal_crutch';

export interface FillerWord {
  word: string;
  category: FillerCategory;
}

// Comprehensive filler word list with categories
const FILLER_WORDS: FillerWord[] = [
  // Hesitation fillers (pure pause sounds)
  { word: "um", category: "hesitation" },
  { word: "uh", category: "hesitation" },
  { word: "er", category: "hesitation" },
  { word: "ah", category: "hesitation" },
  { word: "hmm", category: "hesitation" },
  { word: "erm", category: "hesitation" },

  // Hedge words (uncertainty markers)
  { word: "sort of", category: "hedge" },
  { word: "kind of", category: "hedge" },
  { word: "i guess", category: "hedge" },
  { word: "i think", category: "hedge" },
  { word: "maybe", category: "hedge" },
  { word: "perhaps", category: "hedge" },
  { word: "probably", category: "hedge" },

  // Verbal crutches (discourse markers overused)
  { word: "like", category: "verbal_crutch" },
  { word: "you know", category: "verbal_crutch" },
  { word: "so", category: "verbal_crutch" },
  { word: "basically", category: "verbal_crutch" },
  { word: "actually", category: "verbal_crutch" },
  { word: "literally", category: "verbal_crutch" },
  { word: "right", category: "verbal_crutch" },
  { word: "okay", category: "verbal_crutch" },
  { word: "well", category: "verbal_crutch" },
  { word: "i mean", category: "verbal_crutch" },
  { word: "you see", category: "verbal_crutch" },
  { word: "honestly", category: "verbal_crutch" },
  { word: "frankly", category: "verbal_crutch" },
  { word: "anyway", category: "verbal_crutch" },
  { word: "just", category: "verbal_crutch" },
];

export interface DetailedFillerAnalysis {
  totalCount: number;
  byCategory: Record<FillerCategory, number>;
  byWord: Record<string, number>;
  topFillers: { word: string; count: number; category: FillerCategory }[];
  percentage: number; // % of total words that are fillers
}

/**
 * Analyze transcript for filler words with category breakdown
 */
export function analyzeFillers(transcript: string): DetailedFillerAnalysis {
  const normalized = transcript.toLowerCase();
  const words = transcript.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;

  const byCategory: Record<FillerCategory, number> = {
    hesitation: 0,
    hedge: 0,
    verbal_crutch: 0,
  };
  const byWord: Record<string, number> = {};
  let totalCount = 0;

  // Sort fillers by length descending to match multi-word fillers first
  const sortedFillers = [...FILLER_WORDS].sort(
    (a, b) => b.word.length - a.word.length
  );

  // Track what we've already counted to avoid double-counting
  let processedText = normalized;

  for (const filler of sortedFillers) {
    // Word-boundary aware regex
    const regex = new RegExp(`\\b${escapeRegex(filler.word)}\\b`, "gi");
    const matches = processedText.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      byWord[filler.word] = count;
      byCategory[filler.category] += count;
      totalCount += count;
      // Remove matched fillers to avoid double-counting in overlapping patterns
      processedText = processedText.replace(regex, "");
    }
  }

  // Build top fillers list
  const topFillers = Object.entries(byWord)
    .map(([word, count]) => ({
      word,
      count,
      category: FILLER_WORDS.find(f => f.word === word)?.category || "verbal_crutch" as FillerCategory,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCount,
    byCategory,
    byWord,
    topFillers,
    percentage: totalWords > 0 ? (totalCount / totalWords) * 100 : 0,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pace thresholds (words per minute)
const PACE_THRESHOLDS = {
  tooSlow: 100,      // < 100 WPM
  good: { min: 100, max: 160 },  // 100-160 WPM is conversational
  slightlyFast: 180, // 160-180 WPM
  tooFast: 180,      // > 180 WPM
};

/**
 * Assess speaking pace from WPM
 */
export function assessPace(wordsPerMinute: number): PaceAssessment {
  if (wordsPerMinute < PACE_THRESHOLDS.tooSlow) {
    return "too_slow";
  }
  if (wordsPerMinute <= PACE_THRESHOLDS.good.max) {
    return "good";
  }
  if (wordsPerMinute <= PACE_THRESHOLDS.slightlyFast) {
    return "slightly_fast";
  }
  return "too_fast";
}

/**
 * Get human-readable pace description
 */
export function getPaceDescription(assessment: PaceAssessment): string {
  switch (assessment) {
    case "too_slow":
      return "a bit slow";
    case "good":
      return "good pace";
    case "slightly_fast":
      return "slightly fast";
    case "too_fast":
      return "too fast";
  }
}

export interface DeliveryFeedback {
  score: number;
  paceAssessment: PaceAssessment;
  wordsPerMinute: number;
  fillerAnalysis: DetailedFillerAnalysis;
  missedWords?: string[];
}

/**
 * Generate spoken feedback for TTS (under 20 seconds / ~50 words)
 */
export function generateDeliverySpeech(feedback: DeliveryFeedback): string {
  const parts: string[] = [];

  // Score feedback (brief)
  if (feedback.score >= 85) {
    parts.push(`Great recall at ${Math.round(feedback.score)} percent.`);
  } else if (feedback.score >= 70) {
    parts.push(`Good work, ${Math.round(feedback.score)} percent.`);
  } else if (feedback.score >= 50) {
    parts.push(`${Math.round(feedback.score)} percent.`);
  } else {
    parts.push(`${Math.round(feedback.score)} percent. Keep practicing.`);
  }

  // Pace feedback
  const paceDesc = getPaceDescription(feedback.paceAssessment);
  if (feedback.paceAssessment !== "good") {
    parts.push(`Your pace was ${paceDesc}.`);
  }

  // Filler feedback (only if significant)
  const { totalCount, topFillers } = feedback.fillerAnalysis;
  if (totalCount > 3) {
    const topFiller = topFillers[0];
    if (topFiller) {
      parts.push(`Watch the "${topFiller.word}"s — ${topFiller.count} times.`);
    }
  } else if (totalCount > 0 && feedback.score >= 70) {
    // Encourage when score is good but still some fillers
    parts.push("Nice and smooth delivery.");
  }

  // Missed words (only top 3)
  if (feedback.missedWords && feedback.missedWords.length > 0) {
    const missed = feedback.missedWords.slice(0, 3).join(", ");
    parts.push(`Key words missed: ${missed}.`);
  }

  return parts.join(" ");
}

/**
 * Generate brief pace-only feedback for "am I on pace" command
 */
export function generatePaceFeedback(
  elapsedSeconds: number,
  currentSlideIndex: number,
  totalSlides: number,
  targetDurationMinutes?: number
): string {
  if (!targetDurationMinutes) {
    const minutesElapsed = Math.floor(elapsedSeconds / 60);
    const secondsRemaining = elapsedSeconds % 60;
    return `${minutesElapsed} minutes ${secondsRemaining} seconds so far. No target set.`;
  }

  const targetSeconds = targetDurationMinutes * 60;
  const progressFraction = (currentSlideIndex + 1) / totalSlides;
  const expectedElapsed = targetSeconds * progressFraction;
  const diff = elapsedSeconds - expectedElapsed;
  const diffAbs = Math.abs(Math.round(diff));

  if (Math.abs(diff) < 30) {
    return "You're right on pace.";
  } else if (diff > 0) {
    const mins = Math.floor(diffAbs / 60);
    const secs = diffAbs % 60;
    const timeStr = mins > 0 ? `${mins} minute${mins > 1 ? "s" : ""} ${secs} seconds` : `${secs} seconds`;
    return `You're about ${timeStr} behind. Consider speeding up.`;
  } else {
    const mins = Math.floor(diffAbs / 60);
    const secs = diffAbs % 60;
    const timeStr = mins > 0 ? `${mins} minute${mins > 1 ? "s" : ""} ${secs} seconds` : `${secs} seconds`;
    return `You're about ${timeStr} ahead. You have room to slow down.`;
  }
}
