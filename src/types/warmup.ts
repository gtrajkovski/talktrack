/**
 * Warm-Up Exercise Types
 *
 * Types for the voice-guided warm-up routine before rehearsal.
 */

export type ExerciseType = 'breathing' | 'articulation' | 'pacing';

export type ExerciseState = 'idle' | 'instructing' | 'exercising' | 'feedback' | 'complete';

export interface WarmupExercise {
  id: string;
  type: ExerciseType;
  name: string;
  description: string;
  durationSeconds: number;
  instructions: string[];
  // Breathing-specific
  breathCycles?: number;
  inhaleSeconds?: number;
  holdSeconds?: number;
  exhaleSeconds?: number;
  // Articulation-specific
  phrases?: string[];
  // Pacing-specific
  passage?: string;
}

export interface WarmupSession {
  id: string;
  talkId: string;
  startedAt: number;
  completedAt?: number;
  exercisesCompleted: number;
  totalExercises: number;
}

export type WarmupDuration = 'short' | 'medium' | 'long';

// Duration mapping: short=1min, medium=2min, long=3min
export const WARMUP_DURATION_SECONDS: Record<WarmupDuration, number> = {
  short: 60,
  medium: 120,
  long: 180,
};
