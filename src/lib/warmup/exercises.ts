/**
 * Warm-Up Exercise Definitions
 *
 * Pre-defined exercises for voice warm-up routine.
 * Exercises are designed to be completed in ~2 minutes (medium duration).
 */

import type { WarmupExercise, WarmupDuration } from "@/types/warmup";

/**
 * Breathing Exercise - Diaphragmatic breathing to calm nerves
 * ~40 seconds: 3 cycles of 4s inhale + 4s hold + 4s exhale + 1s pause
 */
export const BREATHING_EXERCISE: WarmupExercise = {
  id: "breathing-1",
  type: "breathing",
  name: "Deep Breathing",
  description: "Calm your nerves with diaphragmatic breathing",
  durationSeconds: 40,
  instructions: [
    "Let's start with some deep breathing to calm your nerves.",
    "Breathe in through your nose for 4 seconds.",
    "Hold your breath for 4 seconds.",
    "Breathe out slowly through your mouth for 4 seconds.",
    "We'll do this 3 times.",
  ],
  breathCycles: 3,
  inhaleSeconds: 4,
  holdSeconds: 4,
  exhaleSeconds: 4,
};

/**
 * Articulation Exercise - Tongue twisters for clarity
 * ~40 seconds: 4 phrases to repeat
 */
export const ARTICULATION_EXERCISE: WarmupExercise = {
  id: "articulation-1",
  type: "articulation",
  name: "Tongue Twisters",
  description: "Sharpen your articulation with challenging phrases",
  durationSeconds: 40,
  instructions: [
    "Now let's warm up your mouth and tongue with some tongue twisters.",
    "I'll say each phrase, then you repeat it.",
    "Focus on clarity, not speed.",
  ],
  phrases: [
    "Red lorry, yellow lorry, red lorry, yellow lorry",
    "Unique New York, unique New York, you know you need unique New York",
    "She sells seashells by the seashore",
    "Peter Piper picked a peck of pickled peppers",
  ],
};

/**
 * Pacing Exercise - Controlled projection
 * ~40 seconds: Read passage at different volumes
 */
export const PACING_EXERCISE: WarmupExercise = {
  id: "pacing-1",
  type: "pacing",
  name: "Voice Projection",
  description: "Practice volume control and projection",
  durationSeconds: 40,
  instructions: [
    "Finally, let's work on your projection.",
    "I'll read a short passage. Repeat it at a comfortable volume.",
    "Then repeat it again, this time projecting your voice as if speaking to someone across the room.",
  ],
  passage:
    "Good morning everyone. Thank you for being here today. I'm excited to share something important with you.",
};

/**
 * Extended articulation for longer warm-ups
 */
export const ARTICULATION_EXTENDED: WarmupExercise = {
  id: "articulation-2",
  type: "articulation",
  name: "Advanced Tongue Twisters",
  description: "More challenging articulation exercises",
  durationSeconds: 30,
  instructions: [
    "Here are some more challenging phrases.",
    "Take your time with each one.",
  ],
  phrases: [
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
    "The sixth sick sheik's sixth sheep's sick",
  ],
};

/**
 * Additional breathing for longer warm-ups
 */
export const BREATHING_EXTENDED: WarmupExercise = {
  id: "breathing-2",
  type: "breathing",
  name: "Extended Breathing",
  description: "Additional breathing cycles for deeper relaxation",
  durationSeconds: 30,
  instructions: [
    "Let's do two more breathing cycles to deepen your relaxation.",
  ],
  breathCycles: 2,
  inhaleSeconds: 4,
  holdSeconds: 4,
  exhaleSeconds: 4,
};

/**
 * All available exercises
 */
export const ALL_EXERCISES: WarmupExercise[] = [
  BREATHING_EXERCISE,
  ARTICULATION_EXERCISE,
  PACING_EXERCISE,
  ARTICULATION_EXTENDED,
  BREATHING_EXTENDED,
];

/**
 * Get exercises based on selected duration
 *
 * - short (1 min): breathing + articulation (2 exercises)
 * - medium (2 min): breathing + articulation + pacing (3 exercises)
 * - long (3 min): all 5 exercises
 */
export function getExercisesForDuration(duration: WarmupDuration): WarmupExercise[] {
  switch (duration) {
    case "short":
      return [BREATHING_EXERCISE, ARTICULATION_EXERCISE];
    case "medium":
      return [BREATHING_EXERCISE, ARTICULATION_EXERCISE, PACING_EXERCISE];
    case "long":
      return [
        BREATHING_EXERCISE,
        ARTICULATION_EXERCISE,
        PACING_EXERCISE,
        ARTICULATION_EXTENDED,
        BREATHING_EXTENDED,
      ];
    default:
      return [BREATHING_EXERCISE, ARTICULATION_EXERCISE, PACING_EXERCISE];
  }
}

/**
 * Get exercise by ID
 */
export function getExerciseById(id: string): WarmupExercise | undefined {
  return ALL_EXERCISES.find((e) => e.id === id);
}
