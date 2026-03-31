/**
 * AI Coach - LLM-powered coaching feedback (BYOK Anthropic API)
 */

import type { RehearsalSession } from "@/types/session";
import type { Talk } from "@/types/talk";

export interface CoachingFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  spokenFeedback: string;
}

export async function generateCoachingFeedback(
  session: RehearsalSession,
  talk: Talk,
  elapsedSeconds: number,
  apiKey: string
): Promise<CoachingFeedback> {
  const scores = session.attempts
    .filter((a) => a.similarityScore !== undefined)
    .map((a) => a.similarityScore!);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const fillers = session.attempts.reduce((sum, a) => sum + (a.fillerWordCount || 0), 0);
  const missed = [...new Set(session.attempts.flatMap((a) => a.missedContentWords || []))].slice(0, 8);
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  const prompt = `Coach feedback for rehearsal:
Talk: "${talk.title}" (${talk.slides.length} slides), Mode: ${session.mode}
Duration: ${mins}m ${secs}s, Score: ${avg}%, Fillers: ${fillers}, Missed words: ${missed.join(", ") || "none"}
Reply as JSON: {"summary":"2 sentences","strengths":["..."],"improvements":["..."],"spokenFeedback":"30 second TTS, encouraging"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as CoachingFeedback;
  } catch (e) {
    console.error("AI Coach error:", e);
  }

  // Fallback
  return {
    summary: `Completed ${session.slidesCompleted} slides with ${avg}% average.`,
    strengths: avg >= 70 ? ["Good recall"] : ["Session completed"],
    improvements: avg < 70 ? ["Practice weak slides more"] : [],
    spokenFeedback:
      avg >= 70
        ? `Nice work! You averaged ${avg} percent.`
        : `Making progress at ${avg} percent. Keep practicing the tough slides.`,
  };
}

export async function testCoachApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.length < 10) return false;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 5,
        messages: [{ role: "user", content: "test" }],
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
