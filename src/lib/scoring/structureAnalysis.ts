/**
 * Presentation Structure Analysis
 *
 * Analyzes talk structure for word distribution, transitions, and pacing.
 */

import type { Talk, Slide } from "@/types/talk";

// Thresholds
const BRIEF_THRESHOLD = 30;   // words
const DENSE_THRESHOLD = 300;  // words
const MAX_BAR_WORDS = 400;    // for percentage calculation

// Transition keywords (start of sentence patterns)
const TRANSITION_PATTERNS = [
  /^now\b/i,
  /^next\b/i,
  /^moving on/i,
  /^let's look at/i,
  /^let's turn to/i,
  /^turning to/i,
  /^in summary/i,
  /^to summarize/i,
  /^finally\b/i,
  /^first\b/i,
  /^second\b/i,
  /^third\b/i,
  /^another\b/i,
  /^additionally/i,
  /^furthermore/i,
  /^however\b/i,
  /^in contrast/i,
  /^on the other hand/i,
];

export type SlideAssessment = "brief" | "normal" | "dense";

export interface SlideMetrics {
  slideIndex: number;
  title: string;
  wordCount: number;
  estimatedSeconds: number;
  assessment: SlideAssessment;
  barPercent: number; // 0-100 for visualization
}

export interface TransitionIssue {
  afterSlideIndex: number;
  fromTitle: string;
  toTitle: string;
  reason: string;
}

export interface StructureAnalysis {
  // Per-slide metrics
  slides: SlideMetrics[];

  // Aggregate metrics
  totalWords: number;
  totalSeconds: number;
  avgWordsPerSlide: number;

  // Distribution assessment
  briefSlides: number;
  denseSlides: number;
  balanceScore: number; // 0-100

  // Transitions
  transitions: TransitionIssue[];

  // Pacing (if target set)
  targetSeconds?: number;
  pacingStatus?: "short" | "aligned" | "long";
  pacingPercent?: number; // e.g., 92 means 92% of target

  // Summary
  recommendations: string[];
}

/**
 * Assess a slide's word count
 */
function assessSlide(wordCount: number): SlideAssessment {
  if (wordCount < BRIEF_THRESHOLD) return "brief";
  if (wordCount > DENSE_THRESHOLD) return "dense";
  return "normal";
}

/**
 * Calculate bar percentage for visualization
 */
function calcBarPercent(wordCount: number): number {
  return Math.min(100, Math.round((wordCount / MAX_BAR_WORDS) * 100));
}

/**
 * Check if a slide has transition language at the start
 */
function hasTransitionStart(notes: string): boolean {
  const firstSentence = notes.split(/[.!?]/)[0] || "";
  return TRANSITION_PATTERNS.some((pattern) => pattern.test(firstSentence.trim()));
}

/**
 * Detect potential transition issues between slides
 */
function detectTransitionIssues(slides: Slide[]): TransitionIssue[] {
  const issues: TransitionIssue[] = [];

  for (let i = 0; i < slides.length - 1; i++) {
    const current = slides[i];
    const next = slides[i + 1];

    // Check for section boundary without transition
    if (current.sectionId && next.sectionId && current.sectionId !== next.sectionId) {
      if (!hasTransitionStart(next.notes)) {
        issues.push({
          afterSlideIndex: i,
          fromTitle: current.title,
          toTitle: next.title,
          reason: "Section change without transition phrase",
        });
      }
      continue;
    }

    // Check for large word count jump (possible topic shift)
    if (next.wordCount > current.wordCount * 3 && next.wordCount > 100) {
      if (!hasTransitionStart(next.notes)) {
        issues.push({
          afterSlideIndex: i,
          fromTitle: current.title,
          toTitle: next.title,
          reason: "Significant content increase — consider a transition",
        });
      }
    }
  }

  return issues;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  slides: SlideMetrics[],
  transitions: TransitionIssue[],
  pacingStatus?: "short" | "aligned" | "long"
): string[] {
  const recommendations: string[] = [];

  // Brief slides
  const briefSlides = slides.filter((s) => s.assessment === "brief");
  if (briefSlides.length > 0) {
    if (briefSlides.length === 1) {
      recommendations.push(
        `Slide ${briefSlides[0].slideIndex + 1} "${briefSlides[0].title}" is brief — consider adding more detail`
      );
    } else {
      recommendations.push(
        `${briefSlides.length} slides are brief — consider adding more content`
      );
    }
  }

  // Dense slides
  const denseSlides = slides.filter((s) => s.assessment === "dense");
  if (denseSlides.length > 0) {
    if (denseSlides.length === 1) {
      recommendations.push(
        `Slide ${denseSlides[0].slideIndex + 1} "${denseSlides[0].title}" is dense — consider splitting`
      );
    } else {
      recommendations.push(
        `${denseSlides.length} slides are dense — consider splitting or simplifying`
      );
    }
  }

  // Transitions
  if (transitions.length > 0) {
    recommendations.push(
      `${transitions.length} potential transition${transitions.length > 1 ? "s" : ""} could be smoother`
    );
  }

  // Pacing
  if (pacingStatus === "short") {
    recommendations.push("Talk is shorter than target — add content or slow delivery");
  } else if (pacingStatus === "long") {
    recommendations.push("Talk exceeds target — trim content or increase pace");
  }

  return recommendations;
}

/**
 * Analyze talk structure
 */
export function analyzeStructure(talk: Talk): StructureAnalysis {
  const slideMetrics: SlideMetrics[] = talk.slides.map((slide) => ({
    slideIndex: slide.index,
    title: slide.title,
    wordCount: slide.wordCount,
    estimatedSeconds: slide.estimatedSeconds,
    assessment: assessSlide(slide.wordCount),
    barPercent: calcBarPercent(slide.wordCount),
  }));

  // Aggregate metrics
  const totalWords = talk.slides.reduce((sum, s) => sum + s.wordCount, 0);
  const totalSeconds = talk.slides.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  const avgWordsPerSlide = talk.slides.length > 0 ? Math.round(totalWords / talk.slides.length) : 0;

  // Distribution counts
  const briefSlides = slideMetrics.filter((s) => s.assessment === "brief").length;
  const denseSlides = slideMetrics.filter((s) => s.assessment === "dense").length;
  const normalSlides = slideMetrics.filter((s) => s.assessment === "normal").length;
  const balanceScore = talk.slides.length > 0
    ? Math.round((normalSlides / talk.slides.length) * 100)
    : 100;

  // Transition issues
  const transitions = detectTransitionIssues(talk.slides);

  // Pacing analysis
  let targetSeconds: number | undefined;
  let pacingStatus: "short" | "aligned" | "long" | undefined;
  let pacingPercent: number | undefined;

  if (talk.targetDurationMinutes) {
    targetSeconds = talk.targetDurationMinutes * 60;
    pacingPercent = Math.round((totalSeconds / targetSeconds) * 100);

    if (pacingPercent < 80) {
      pacingStatus = "short";
    } else if (pacingPercent > 120) {
      pacingStatus = "long";
    } else {
      pacingStatus = "aligned";
    }
  }

  // Generate recommendations
  const recommendations = generateRecommendations(slideMetrics, transitions, pacingStatus);

  return {
    slides: slideMetrics,
    totalWords,
    totalSeconds,
    avgWordsPerSlide,
    briefSlides,
    denseSlides,
    balanceScore,
    transitions,
    targetSeconds,
    pacingStatus,
    pacingPercent,
    recommendations,
  };
}

/**
 * Get assessment color class
 */
export function getAssessmentColor(assessment: SlideAssessment): string {
  switch (assessment) {
    case "brief":
      return "bg-warning";
    case "dense":
      return "bg-error";
    case "normal":
      return "bg-success";
  }
}

/**
 * Get balance score color class
 */
export function getBalanceScoreColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-error";
}
