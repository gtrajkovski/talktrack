/**
 * Session Debrief Module
 *
 * Generates spoken end-of-session summaries combining completion stats,
 * scores, delivery feedback, timing, and spaced repetition status.
 */

import type { RehearsalSession } from "@/types/session";
import type { Talk, Slide } from "@/types/talk";
import { countDueSlides, getBoxCounts } from "@/lib/scoring/spacedRepetition";

export interface DebriefContext {
  session: RehearsalSession;
  talk: Talk;
  elapsedSeconds: number;
  updatedSlides: Slide[]; // Slides with updated SR state
}

/**
 * Generate spoken session debrief (aim for ~30-45 seconds of speech)
 */
export function generateSessionDebrief(context: DebriefContext): string {
  const { session, talk, elapsedSeconds, updatedSlides } = context;
  const parts: string[] = [];

  // 1. Completion acknowledgment
  parts.push(generateCompletionPhrase(session, elapsedSeconds));

  // 2. Score summary
  const scorePhrase = generateScoreSummary(session);
  if (scorePhrase) {
    parts.push(scorePhrase);
  }

  // 3. Delivery feedback (if we have data)
  const deliveryPhrase = generateDeliveryFeedback(session);
  if (deliveryPhrase) {
    parts.push(deliveryPhrase);
  }

  // 4. Timing vs target (if target was set)
  if (talk.targetDurationMinutes) {
    parts.push(generateTimingFeedback(elapsedSeconds, talk.targetDurationMinutes));
  }

  // 5. SR status
  const srPhrase = generateSRFeedback(updatedSlides, session);
  if (srPhrase) {
    parts.push(srPhrase);
  }

  // 6. What's next prompt
  parts.push(generateNextPrompt(updatedSlides, session));

  return parts.join(" ");
}

function generateCompletionPhrase(session: RehearsalSession, elapsedSeconds: number): string {
  const slidesCompleted = session.slidesCompleted;
  const totalSlides = session.totalSlides;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  let timeStr: string;
  if (minutes === 0) {
    timeStr = `${seconds} seconds`;
  } else if (seconds === 0) {
    timeStr = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else {
    timeStr = `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} seconds`;
  }

  if (slidesCompleted === totalSlides) {
    return `Great job! You completed all ${totalSlides} slides in ${timeStr}.`;
  } else {
    return `Session complete. You covered ${slidesCompleted} of ${totalSlides} slides in ${timeStr}.`;
  }
}

function generateScoreSummary(session: RehearsalSession): string | null {
  const scores = session.attempts
    .filter(a => a.similarityScore !== undefined)
    .map(a => a.similarityScore!);

  if (scores.length === 0) return null;

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const highScores = scores.filter(s => s >= 85).length;
  const lowScores = scores.filter(s => s < 50).length;

  if (avg >= 85) {
    return `Excellent recall! You averaged ${avg} percent.`;
  } else if (avg >= 70) {
    if (highScores > 0) {
      return `Solid performance at ${avg} percent average. ${highScores} slide${highScores > 1 ? "s" : ""} nailed.`;
    }
    return `Good work with ${avg} percent average.`;
  } else if (avg >= 50) {
    if (lowScores > 0) {
      return `${avg} percent average. ${lowScores} slide${lowScores > 1 ? "s" : ""} need more practice.`;
    }
    return `${avg} percent average. Keep practicing!`;
  } else {
    return `${avg} percent average. Consider reviewing the material before your next session.`;
  }
}

function generateDeliveryFeedback(session: RehearsalSession): string | null {
  // Collect pace assessments
  const paceAssessments = session.attempts
    .filter(a => a.paceAssessment)
    .map(a => a.paceAssessment!);

  // Collect filler counts
  const totalFillers = session.attempts.reduce((sum, a) => sum + (a.fillerWordCount || 0), 0);

  // Collect missed words
  const allMissed = session.attempts
    .flatMap(a => a.missedContentWords || []);
  const missedCounts = new Map<string, number>();
  for (const word of allMissed) {
    missedCounts.set(word, (missedCounts.get(word) || 0) + 1);
  }
  const topMissed = Array.from(missedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  const parts: string[] = [];

  // Pace feedback
  if (paceAssessments.length > 0) {
    const tooFast = paceAssessments.filter(p => p === "too_fast" || p === "slightly_fast").length;
    const tooSlow = paceAssessments.filter(p => p === "too_slow").length;

    if (tooFast > paceAssessments.length / 2) {
      parts.push("You were rushing on several slides. Try slowing down.");
    } else if (tooSlow > paceAssessments.length / 2) {
      parts.push("Your pace was a bit slow. Consider picking up the tempo.");
    }
  }

  // Filler feedback
  if (totalFillers > 10) {
    parts.push(`Watch the filler words — ${totalFillers} total.`);
  } else if (totalFillers > 5) {
    parts.push(`${totalFillers} filler words. Try to cut those down.`);
  }

  // Top missed words
  if (topMissed.length > 0) {
    parts.push(`Key words to focus on: ${topMissed.join(", ")}.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function generateTimingFeedback(elapsedSeconds: number, targetMinutes: number): string {
  const targetSeconds = targetMinutes * 60;
  const diff = elapsedSeconds - targetSeconds;
  const diffAbs = Math.abs(diff);

  const mins = Math.floor(diffAbs / 60);
  const secs = diffAbs % 60;

  if (diffAbs < 30) {
    return "Right on target timing!";
  }

  let timeStr: string;
  if (mins > 0) {
    timeStr = `${mins} minute${mins > 1 ? "s" : ""}`;
    if (secs > 0) timeStr += ` ${secs} seconds`;
  } else {
    timeStr = `${secs} seconds`;
  }

  if (diff > 0) {
    return `You ran ${timeStr} over your ${targetMinutes}-minute target.`;
  } else {
    return `You finished ${timeStr} under your ${targetMinutes}-minute target.`;
  }
}

function generateSRFeedback(slides: Slide[], session: RehearsalSession): string | null {
  const boxCounts = getBoxCounts(slides);
  const promoted = session.attempts.filter(a =>
    a.similarityScore !== undefined && a.similarityScore >= 75
  ).length;
  const demoted = session.attempts.filter(a =>
    a.similarityScore !== undefined && a.similarityScore < 50
  ).length;

  const parts: string[] = [];

  if (promoted > 0) {
    parts.push(`${promoted} slide${promoted > 1 ? "s" : ""} leveled up.`);
  }

  if (demoted > 0) {
    parts.push(`${demoted} slide${demoted > 1 ? "s" : ""} need${demoted === 1 ? "s" : ""} more work.`);
  }

  // Mastery progress
  const mastered = boxCounts[4] + boxCounts[5];
  const total = slides.length;
  if (mastered > 0) {
    const percentage = Math.round((mastered / total) * 100);
    parts.push(`${percentage}% mastery overall.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function generateNextPrompt(slides: Slide[], session: RehearsalSession): string {
  const dueCount = countDueSlides(slides);
  const avgScore = session.attempts
    .filter(a => a.similarityScore !== undefined)
    .map(a => a.similarityScore!)
    .reduce((sum, s, _, arr) => sum + s / arr.length, 0);

  if (avgScore < 50 && session.attempts.length > 0) {
    return "Say \"again\" to practice more, or \"done\" to exit.";
  }

  if (dueCount > 3) {
    return `${dueCount} slides are due for review. Practice again soon!`;
  }

  return "Great session! Say \"again\" to continue, or \"done\" to finish.";
}

/**
 * Generate brief progress summary for mid-session "summary" command
 * @param _slides - Reserved for future SR status in progress summary
 */
export function generateProgressSummary(
  session: RehearsalSession,
  elapsedSeconds: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _slides: Slide[]
): string {
  const total = session.totalSlides;
  const remaining = total - session.currentSlideIndex - 1;

  const scores = session.attempts
    .filter(a => a.similarityScore !== undefined)
    .map(a => a.similarityScore!);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = minutes > 0 ? `${minutes} minutes ${seconds} seconds` : `${seconds} seconds`;

  const parts: string[] = [];

  // Progress
  parts.push(`Slide ${session.currentSlideIndex + 1} of ${total}.`);
  parts.push(`${remaining} remaining.`);

  // Time so far
  parts.push(`${timeStr} elapsed.`);

  // Average if available
  if (avgScore !== null) {
    parts.push(`Averaging ${avgScore} percent.`);
  }

  return parts.join(" ");
}
