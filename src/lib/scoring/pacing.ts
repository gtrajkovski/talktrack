export interface PacingAnalysis {
  wordsPerMinute: number;
  totalWords: number;
  durationSeconds: number;
  assessment: "slow" | "good" | "fast";
}

export function analyzePacing(transcript: string, durationSeconds: number): PacingAnalysis {
  const words = transcript.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  // Avoid division by zero
  if (durationSeconds <= 0) {
    return {
      wordsPerMinute: 0,
      totalWords,
      durationSeconds: 0,
      assessment: "good",
    };
  }

  const wordsPerMinute = Math.round((totalWords / durationSeconds) * 60);

  // Assess pacing
  // Typical conversational speech: 120-150 WPM
  // Presentation speech: 100-130 WPM (slower for clarity)
  let assessment: "slow" | "good" | "fast";

  if (wordsPerMinute < 90) {
    assessment = "slow";
  } else if (wordsPerMinute > 160) {
    assessment = "fast";
  } else {
    assessment = "good";
  }

  return {
    wordsPerMinute,
    totalWords,
    durationSeconds,
    assessment,
  };
}

export function calculateWordsPerMinute(transcript: string, durationSeconds: number): number {
  return analyzePacing(transcript, durationSeconds).wordsPerMinute;
}
