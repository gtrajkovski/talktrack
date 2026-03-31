/**
 * Spaced Repetition Module
 *
 * Leitner-style box system for scheduling slide reviews.
 * Box 1 = review immediately, Box 5 = well-learned.
 */

import type { Slide } from "@/types/talk";

// Box intervals in hours
// Box 1: 0h (immediate), Box 2: 4h, Box 3: 24h (1 day), Box 4: 72h (3 days), Box 5: 168h (1 week)
const BOX_INTERVALS_HOURS: Record<number, number> = {
  1: 0,
  2: 4,
  3: 24,
  4: 72,
  5: 168,
};

// Score thresholds for promotion/demotion
const PROMOTE_THRESHOLD = 75; // Score >= 75% moves to next box
const DEMOTE_THRESHOLD = 50;  // Score < 50% moves back one box

export interface SRUpdate {
  newBox: number;
  nextReviewAt: number;
  promoted: boolean;
  demoted: boolean;
}

/**
 * Compute spaced repetition update based on score
 *
 * @param currentBox - Current Leitner box (1-5)
 * @param score - Similarity score (0-100)
 * @returns Updated SR state
 */
export function computeSRUpdate(currentBox: number, score: number): SRUpdate {
  const now = Date.now();
  let newBox = currentBox;
  let promoted = false;
  let demoted = false;

  if (score >= PROMOTE_THRESHOLD) {
    // Promote to next box (max 5)
    if (currentBox < 5) {
      newBox = currentBox + 1;
      promoted = true;
    }
  } else if (score < DEMOTE_THRESHOLD) {
    // Demote to previous box (min 1)
    if (currentBox > 1) {
      newBox = currentBox - 1;
      demoted = true;
    }
  }
  // Scores between thresholds stay in same box

  // Calculate next review time
  const intervalHours = BOX_INTERVALS_HOURS[newBox] || 0;
  const nextReviewAt = now + intervalHours * 60 * 60 * 1000;

  return {
    newBox,
    nextReviewAt,
    promoted,
    demoted,
  };
}

/**
 * Check if a slide is due for review
 */
export function isDue(slide: Slide): boolean {
  const now = Date.now();
  // If never reviewed or no next review time set, it's due
  if (!slide.srNextReviewAt) return true;
  return now >= slide.srNextReviewAt;
}

/**
 * Calculate priority score for a slide (higher = more urgent)
 * Factors: overdue time + box level (lower boxes are higher priority)
 */
export function getReviewPriority(slide: Slide): number {
  const now = Date.now();
  const nextReview = slide.srNextReviewAt ?? 0;
  const box = slide.srBox ?? 1;

  // Overdue time in hours (negative if not due yet)
  const overdueMs = now - nextReview;
  const overdueHours = overdueMs / (1000 * 60 * 60);

  // Priority formula: overdue hours + (6 - box) * 10
  // This makes box 1 slides 50 points higher priority than box 5
  return overdueHours + (6 - box) * 10;
}

/**
 * Sort slides by review priority (most urgent first)
 */
export function sortByReviewPriority(slides: Slide[]): Slide[] {
  return [...slides].sort((a, b) => getReviewPriority(b) - getReviewPriority(a));
}

/**
 * Get slides sorted for smart rehearsal (overdue first, then by box)
 */
export function getSlidesForSmartRehearse(slides: Slide[]): Slide[] {
  const due = slides.filter(isDue);
  const notDue = slides.filter(s => !isDue(s));

  // Sort due slides by priority
  const sortedDue = sortByReviewPriority(due);

  // Sort not-due by next review time (soonest first)
  const sortedNotDue = [...notDue].sort((a, b) => {
    const aTime = a.srNextReviewAt || 0;
    const bTime = b.srNextReviewAt || 0;
    return aTime - bTime;
  });

  return [...sortedDue, ...sortedNotDue];
}

/**
 * Count slides due for review
 */
export function countDueSlides(slides: Slide[]): number {
  return slides.filter(isDue).length;
}

/**
 * Get counts by box level
 */
export function getBoxCounts(slides: Slide[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const slide of slides) {
    const box = slide.srBox ?? 1;
    counts[box] = (counts[box] || 0) + 1;
  }
  return counts;
}

/**
 * Generate spoken SR summary for TTS
 */
export function generateSRSummary(slides: Slide[]): string {
  const dueCount = countDueSlides(slides);
  const boxCounts = getBoxCounts(slides);
  const totalSlides = slides.length;

  const parts: string[] = [];

  // Due status
  if (dueCount === 0) {
    parts.push("No slides due for review right now.");
  } else if (dueCount === 1) {
    parts.push("1 slide is due for review.");
  } else {
    parts.push(`${dueCount} slides are due for review.`);
  }

  // Mastery summary (how many in box 4-5)
  const mastered = boxCounts[4] + boxCounts[5];
  if (mastered > 0) {
    const percentage = Math.round((mastered / totalSlides) * 100);
    parts.push(`${mastered} of ${totalSlides} slides well-learned, ${percentage} percent mastery.`);
  }

  // Struggling slides (box 1)
  if (boxCounts[1] > 0 && boxCounts[1] <= 3) {
    parts.push(`${boxCounts[1]} slide${boxCounts[1] > 1 ? "s" : ""} still need work.`);
  } else if (boxCounts[1] > 3) {
    parts.push(`${boxCounts[1]} slides need more practice.`);
  }

  return parts.join(" ");
}

/**
 * Get the most overdue slide for "smart rehearse" command
 * Returns null if no slides are due
 */
export function getMostOverdueSlide(slides: Slide[]): Slide | null {
  const due = slides.filter(isDue);
  if (due.length === 0) return null;
  return sortByReviewPriority(due)[0];
}

/**
 * Initialize SR fields for slides that don't have them
 */
/**
 * Initialize SR fields for slides that don't have them.
 * Returns new slides array with srBox defaulted to 1 if undefined.
 */
export function initializeSRFields(slides: Slide[]): Slide[] {
  return slides.map(slide => {
    // Only return new object if we need to add defaults
    if (slide.srBox === undefined) {
      return {
        ...slide,
        srBox: 1,
      };
    }
    return slide;
  });
}

/**
 * Apply SR update to a slide after attempt
 */
export function applySRUpdate(slide: Slide, score: number): Slide {
  const update = computeSRUpdate(slide.srBox ?? 1, score);
  return {
    ...slide,
    srBox: update.newBox,
    srLastReviewedAt: Date.now(),
    srNextReviewAt: update.nextReviewAt,
  };
}

/**
 * Get srBox with default fallback
 */
export function getBox(slide: Slide): number {
  return slide.srBox ?? 1;
}
