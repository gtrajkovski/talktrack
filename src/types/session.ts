export type RehearsalMode = "listen" | "prompt" | "test";

export interface RehearsalSession {
  id: string;
  talkId: string;
  mode: RehearsalMode;
  startedAt: number;
  completedAt?: number;
  pausedAt?: number;           // When session was interrupted/paused
  currentSlideIndex: number;   // For resume support
  slidesCompleted: number;
  totalSlides: number;
  attempts: SlideAttempt[];
}

export type PaceAssessment = 'too_slow' | 'good' | 'slightly_fast' | 'too_fast';

export interface SlideAttempt {
  slideId: string;
  slideIndex: number;
  spokenText?: string;
  similarityScore?: number;
  wordsPerMinute?: number;
  fillerWordCount?: number;
  duration?: number;
  usedHelp: boolean;
  // Chunk-level attempts (for sentence/paragraph modes)
  chunkAttempts?: ChunkAttempt[];
  // Enhanced delivery analytics
  paceAssessment?: PaceAssessment;
  fillerDetails?: Record<string, number>; // e.g., { "um": 3, "like": 2 }
  missedContentWords?: string[]; // Content words from original not in spoken
}

export interface ChunkAttempt {
  chunkId: string;
  chunkIndex: number;
  chunkType: "slide" | "paragraph" | "sentence";
  spokenText?: string;
  similarityScore?: number;
  wordsPerMinute?: number;
  fillerWordCount?: number;
  duration?: number;
  usedHelp: boolean;
}

/**
 * Aggregate chunk scores into a slide score.
 * Uses weighted average based on chunk word counts.
 */
export function aggregateChunkScores(chunks: ChunkAttempt[]): number | undefined {
  const scored = chunks.filter(c => c.similarityScore !== undefined);
  if (scored.length === 0) return undefined;

  const sum = scored.reduce((acc, c) => acc + c.similarityScore!, 0);
  return Math.round(sum / scored.length);
}

/**
 * Get qualitative feedback for a chunk score.
 */
export function getChunkFeedback(score: number): string {
  if (score >= 85) return "Nailed it!";
  if (score >= 70) return "Close!";
  if (score >= 50) return "Getting there";
  return "Not quite";
}
