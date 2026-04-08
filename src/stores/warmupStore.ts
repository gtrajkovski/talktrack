import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  WarmupExercise,
  WarmupSession,
  ExerciseState,
  WarmupDuration,
} from "@/types/warmup";
import { getExercisesForDuration } from "@/lib/warmup/exercises";

interface WarmupState {
  // Session state
  session: WarmupSession | null;
  talkId: string | null;

  // Exercise state
  exercises: WarmupExercise[];
  currentExerciseIndex: number;
  exerciseState: ExerciseState;

  // Breathing exercise tracking
  currentBreathCycle: number;
  breathPhase: 'inhale' | 'hold' | 'exhale' | null;

  // Articulation exercise tracking
  currentPhraseIndex: number;

  // Actions
  startSession: (talkId: string, duration: WarmupDuration) => void;
  endSession: () => void;

  // Exercise navigation
  nextExercise: () => boolean; // Returns true if advanced, false if at end
  repeatExercise: () => void;

  // State transitions
  setExerciseState: (state: ExerciseState) => void;
  completeCurrentExercise: () => void;

  // Breathing exercise actions
  setBreathPhase: (phase: 'inhale' | 'hold' | 'exhale' | null) => void;
  advanceBreathCycle: () => boolean; // Returns true if more cycles, false if done

  // Articulation exercise actions
  nextPhrase: () => boolean; // Returns true if advanced, false if at end
  resetPhrases: () => void;

  // Getters
  getCurrentExercise: () => WarmupExercise | null;
  getProgress: () => number;
  isLastExercise: () => boolean;
  isFirstExercise: () => boolean;
  isSessionComplete: () => boolean;
}

export const useWarmupStore = create<WarmupState>((set, get) => ({
  // Initial state
  session: null,
  talkId: null,
  exercises: [],
  currentExerciseIndex: 0,
  exerciseState: 'idle',
  currentBreathCycle: 0,
  breathPhase: null,
  currentPhraseIndex: 0,

  startSession: (talkId: string, duration: WarmupDuration) => {
    const exercises = getExercisesForDuration(duration);
    const session: WarmupSession = {
      id: nanoid(),
      talkId,
      startedAt: Date.now(),
      exercisesCompleted: 0,
      totalExercises: exercises.length,
    };

    set({
      session,
      talkId,
      exercises,
      currentExerciseIndex: 0,
      exerciseState: 'idle',
      currentBreathCycle: 0,
      breathPhase: null,
      currentPhraseIndex: 0,
    });
  },

  endSession: () => {
    const { session } = get();
    if (session) {
      session.completedAt = Date.now();
    }

    set({
      session: null,
      talkId: null,
      exercises: [],
      currentExerciseIndex: 0,
      exerciseState: 'idle',
      currentBreathCycle: 0,
      breathPhase: null,
      currentPhraseIndex: 0,
    });
  },

  nextExercise: () => {
    const { exercises, currentExerciseIndex, session } = get();
    if (currentExerciseIndex >= exercises.length - 1) {
      return false;
    }

    const newIndex = currentExerciseIndex + 1;
    if (session) {
      session.exercisesCompleted = newIndex;
    }

    set({
      currentExerciseIndex: newIndex,
      exerciseState: 'idle',
      currentBreathCycle: 0,
      breathPhase: null,
      currentPhraseIndex: 0,
    });

    return true;
  },

  repeatExercise: () => {
    set({
      exerciseState: 'idle',
      currentBreathCycle: 0,
      breathPhase: null,
      currentPhraseIndex: 0,
    });
  },

  setExerciseState: (exerciseState: ExerciseState) => {
    set({ exerciseState });
  },

  completeCurrentExercise: () => {
    const { session, currentExerciseIndex } = get();
    if (session) {
      session.exercisesCompleted = currentExerciseIndex + 1;
    }
    set({ exerciseState: 'complete' });
  },

  // Breathing exercise actions
  setBreathPhase: (breathPhase: 'inhale' | 'hold' | 'exhale' | null) => {
    set({ breathPhase });
  },

  advanceBreathCycle: () => {
    const { currentBreathCycle, exercises, currentExerciseIndex } = get();
    const exercise = exercises[currentExerciseIndex];
    if (!exercise || exercise.type !== 'breathing') return false;

    const totalCycles = exercise.breathCycles ?? 3;
    const newCycle = currentBreathCycle + 1;

    if (newCycle >= totalCycles) {
      return false;
    }

    set({ currentBreathCycle: newCycle, breathPhase: null });
    return true;
  },

  // Articulation exercise actions
  nextPhrase: () => {
    const { currentPhraseIndex, exercises, currentExerciseIndex } = get();
    const exercise = exercises[currentExerciseIndex];
    if (!exercise || !exercise.phrases) return false;

    const newIndex = currentPhraseIndex + 1;
    if (newIndex >= exercise.phrases.length) {
      return false;
    }

    set({ currentPhraseIndex: newIndex });
    return true;
  },

  resetPhrases: () => {
    set({ currentPhraseIndex: 0 });
  },

  // Getters
  getCurrentExercise: () => {
    const { exercises, currentExerciseIndex } = get();
    return exercises[currentExerciseIndex] ?? null;
  },

  getProgress: () => {
    const { exercises, currentExerciseIndex } = get();
    if (exercises.length === 0) return 0;
    return ((currentExerciseIndex + 1) / exercises.length) * 100;
  },

  isLastExercise: () => {
    const { exercises, currentExerciseIndex } = get();
    return currentExerciseIndex === exercises.length - 1;
  },

  isFirstExercise: () => {
    const { currentExerciseIndex } = get();
    return currentExerciseIndex === 0;
  },

  isSessionComplete: () => {
    const { exercises, currentExerciseIndex, exerciseState } = get();
    return (
      currentExerciseIndex === exercises.length - 1 &&
      exerciseState === 'complete'
    );
  },
}));
