// src/lib/ai/coach.ts

import type { RehearsalSession } from '@/types/session';
import type { Slide } from '@/types/talk';
import type { UserSettings } from '@/types/settings';

interface CoachFeedback {
  feedback: string;
  error?: string;
}

/**
 * Request AI coaching feedback for a completed session.
 * Calls the /api/coach route which proxies to the configured AI provider.
 */
export async function getCoachFeedback(
  session: RehearsalSession,
  slides: Slide[],
  settings: UserSettings,
  targetDurationMinutes?: number,
): Promise<CoachFeedback> {
  try {
    // Build slide summaries from session attempts
    const slideSummaries = session.attempts.map(attempt => {
      const slide = slides.find(s => s.id === attempt.slideId);
      return {
        title: slide?.title ?? `Slide ${attempt.slideIndex + 1}`,
        score: Math.round(attempt.similarityScore ?? 0),
        missedWords: attempt.missedContentWords ?? [],
        wpm: attempt.wordsPerMinute,
        fillerCount: attempt.fillerWordCount ?? 0,
      };
    });

    const scores = session.attempts
      .filter(a => a.similarityScore != null)
      .map(a => a.similarityScore!);

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0;

    const totalFillers = session.attempts
      .reduce((sum, a) => sum + (a.fillerWordCount ?? 0), 0);

    const wpms = session.attempts
      .filter(a => a.wordsPerMinute != null && a.wordsPerMinute > 0)
      .map(a => a.wordsPerMinute!);
    const averageWPM = wpms.length > 0
      ? Math.round(wpms.reduce((s, v) => s + v, 0) / wpms.length)
      : 0;

    const sessionDurationSeconds = session.attempts
      .reduce((sum, a) => sum + (a.duration ?? 0), 0);

    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: session.mode,
        slideSummaries,
        averageScore,
        totalFillers,
        averageWPM,
        sessionDurationSeconds,
        totalSlides: slides.length,
        targetDurationMinutes,
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey ?? undefined,
        model: settings.aiModel ?? undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { feedback: '', error: data.error ?? 'Failed to get coaching feedback.' };
    }

    return { feedback: data.feedback };

  } catch (error) {
    console.error('Coach request failed:', error);
    return {
      feedback: '',
      error: 'Could not connect to coaching service. Check your internet connection.',
    };
  }
}
