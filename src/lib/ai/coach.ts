/**
 * AI Coach - Client-side wrapper for /api/coach endpoint
 */

import type { RehearsalSession } from "@/types/session";
import type { Talk } from "@/types/talk";

export interface CoachingFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  spokenFeedback: string;
}

interface CoachRequestBody {
  mode: "prompt" | "test";
  slideSummaries: Array<{
    title: string;
    score: number;
    missedWords: string[];
    wpm?: number;
    fillerCount?: number;
  }>;
  averageScore: number;
  totalFillers: number;
  averageWPM: number;
  sessionDurationSeconds: number;
  totalSlides: number;
  targetDurationMinutes?: number;
  provider: "free" | "anthropic" | "openai" | "google";
  apiKey?: string;
  model?: string;
}

export async function generateCoachingFeedback(
  session: RehearsalSession,
  talk: Talk,
  elapsedSeconds: number,
  options: {
    provider?: "free" | "anthropic" | "openai" | "google";
    apiKey?: string;
    model?: string;
  } = {}
): Promise<CoachingFeedback> {
  // Build slide summaries from attempts
  const slideSummaries = session.attempts.map((attempt) => {
    const slide = talk.slides.find((s) => s.id === attempt.slideId);
    return {
      title: slide?.title || `Slide ${attempt.slideIndex + 1}`,
      score: attempt.similarityScore ?? 0,
      missedWords: attempt.missedContentWords || [],
      wpm: attempt.wordsPerMinute,
      fillerCount: attempt.fillerWordCount,
    };
  });

  // Calculate aggregates
  const scores = slideSummaries.map((s) => s.score).filter((s) => s > 0);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const totalFillers = slideSummaries.reduce(
    (sum, s) => sum + (s.fillerCount || 0),
    0
  );
  const wpms = slideSummaries
    .map((s) => s.wpm)
    .filter((w): w is number => w !== undefined && w > 0);
  const averageWPM =
    wpms.length > 0
      ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length)
      : 120;

  const body: CoachRequestBody = {
    mode: session.mode as "prompt" | "test",
    slideSummaries,
    averageScore,
    totalFillers,
    averageWPM,
    sessionDurationSeconds: elapsedSeconds,
    totalSlides: talk.slides.length,
    targetDurationMinutes: talk.targetDurationMinutes,
    provider: options.provider || "free",
    apiKey: options.apiKey,
    model: options.model,
  };

  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("Coach API error:", errorData.error || response.statusText);
      throw new Error(errorData.error || "API error");
    }

    const data = await response.json();
    const feedback = data.feedback || "";

    // The API returns plain text feedback, convert to structured format
    return {
      summary: feedback.slice(0, 150),
      strengths: averageScore >= 70 ? ["Good recall"] : ["Session completed"],
      improvements:
        averageScore < 70 ? ["Practice weak slides more"] : [],
      spokenFeedback: feedback,
    };
  } catch (e) {
    console.warn("AI Coach error:", e);
    // Return fallback feedback
    return {
      summary: `Completed ${session.slidesCompleted} slides with ${averageScore}% average.`,
      strengths: averageScore >= 70 ? ["Good recall"] : ["Session completed"],
      improvements: averageScore < 70 ? ["Practice weak slides more"] : [],
      spokenFeedback:
        averageScore >= 70
          ? `Nice work! You averaged ${averageScore} percent.`
          : `Making progress at ${averageScore} percent. Keep practicing the tough slides.`,
    };
  }
}

export async function testCoachApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.length < 10) return false;
  // For now just do a basic validation
  // A full test would require calling the API which costs money
  return true;
}
