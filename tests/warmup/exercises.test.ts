import { describe, it, expect } from "vitest";
import {
  BREATHING_EXERCISE,
  ARTICULATION_EXERCISE,
  PACING_EXERCISE,
  ALL_EXERCISES,
  getExercisesForDuration,
  getExerciseById,
} from "@/lib/warmup/exercises";

describe("Warmup Exercises", () => {
  describe("Exercise definitions", () => {
    it("BREATHING_EXERCISE has correct structure", () => {
      expect(BREATHING_EXERCISE.id).toBe("breathing-1");
      expect(BREATHING_EXERCISE.type).toBe("breathing");
      expect(BREATHING_EXERCISE.name).toBe("Deep Breathing");
      expect(BREATHING_EXERCISE.breathCycles).toBe(3);
      expect(BREATHING_EXERCISE.inhaleSeconds).toBe(4);
      expect(BREATHING_EXERCISE.holdSeconds).toBe(4);
      expect(BREATHING_EXERCISE.exhaleSeconds).toBe(4);
      expect(BREATHING_EXERCISE.instructions.length).toBeGreaterThan(0);
    });

    it("ARTICULATION_EXERCISE has correct structure", () => {
      expect(ARTICULATION_EXERCISE.id).toBe("articulation-1");
      expect(ARTICULATION_EXERCISE.type).toBe("articulation");
      expect(ARTICULATION_EXERCISE.name).toBe("Tongue Twisters");
      expect(ARTICULATION_EXERCISE.phrases).toBeDefined();
      expect(ARTICULATION_EXERCISE.phrases!.length).toBe(4);
      expect(ARTICULATION_EXERCISE.instructions.length).toBeGreaterThan(0);
    });

    it("PACING_EXERCISE has correct structure", () => {
      expect(PACING_EXERCISE.id).toBe("pacing-1");
      expect(PACING_EXERCISE.type).toBe("pacing");
      expect(PACING_EXERCISE.name).toBe("Voice Projection");
      expect(PACING_EXERCISE.passage).toBeDefined();
      expect(PACING_EXERCISE.passage!.length).toBeGreaterThan(0);
      expect(PACING_EXERCISE.instructions.length).toBeGreaterThan(0);
    });

    it("ALL_EXERCISES contains all defined exercises", () => {
      expect(ALL_EXERCISES.length).toBe(5);
      expect(ALL_EXERCISES).toContain(BREATHING_EXERCISE);
      expect(ALL_EXERCISES).toContain(ARTICULATION_EXERCISE);
      expect(ALL_EXERCISES).toContain(PACING_EXERCISE);
    });
  });

  describe("getExercisesForDuration", () => {
    it("returns 2 exercises for short duration", () => {
      const exercises = getExercisesForDuration("short");
      expect(exercises.length).toBe(2);
      expect(exercises[0].type).toBe("breathing");
      expect(exercises[1].type).toBe("articulation");
    });

    it("returns 3 exercises for medium duration", () => {
      const exercises = getExercisesForDuration("medium");
      expect(exercises.length).toBe(3);
      expect(exercises[0].type).toBe("breathing");
      expect(exercises[1].type).toBe("articulation");
      expect(exercises[2].type).toBe("pacing");
    });

    it("returns 5 exercises for long duration", () => {
      const exercises = getExercisesForDuration("long");
      expect(exercises.length).toBe(5);
    });
  });

  describe("getExerciseById", () => {
    it("returns correct exercise for valid ID", () => {
      const exercise = getExerciseById("breathing-1");
      expect(exercise).toBe(BREATHING_EXERCISE);
    });

    it("returns correct exercise for articulation ID", () => {
      const exercise = getExerciseById("articulation-1");
      expect(exercise).toBe(ARTICULATION_EXERCISE);
    });

    it("returns undefined for invalid ID", () => {
      const exercise = getExerciseById("invalid-id");
      expect(exercise).toBeUndefined();
    });
  });
});
