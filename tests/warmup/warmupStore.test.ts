import { describe, it, expect, beforeEach } from "vitest";
import { useWarmupStore } from "@/stores/warmupStore";

describe("warmupStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useWarmupStore.setState({
      session: null,
      talkId: null,
      exercises: [],
      currentExerciseIndex: 0,
      exerciseState: "idle",
      currentBreathCycle: 0,
      breathPhase: null,
      currentPhraseIndex: 0,
    });
  });

  describe("startSession", () => {
    it("initializes session with correct data", () => {
      const { startSession, session, exercises, talkId } = useWarmupStore.getState();
      startSession("talk-123", "medium");

      const state = useWarmupStore.getState();
      expect(state.session).not.toBeNull();
      expect(state.session!.talkId).toBe("talk-123");
      expect(state.talkId).toBe("talk-123");
      expect(state.exercises.length).toBe(3); // medium = 3 exercises
      expect(state.exerciseState).toBe("idle");
      expect(state.currentExerciseIndex).toBe(0);
    });

    it("uses short duration correctly", () => {
      useWarmupStore.getState().startSession("talk-123", "short");
      const state = useWarmupStore.getState();
      expect(state.exercises.length).toBe(2);
    });

    it("uses long duration correctly", () => {
      useWarmupStore.getState().startSession("talk-123", "long");
      const state = useWarmupStore.getState();
      expect(state.exercises.length).toBe(5);
    });
  });

  describe("endSession", () => {
    it("clears all session state", () => {
      useWarmupStore.getState().startSession("talk-123", "medium");
      useWarmupStore.getState().endSession();

      const state = useWarmupStore.getState();
      expect(state.session).toBeNull();
      expect(state.talkId).toBeNull();
      expect(state.exercises).toEqual([]);
      expect(state.exerciseState).toBe("idle");
    });
  });

  describe("nextExercise", () => {
    it("advances to next exercise", () => {
      useWarmupStore.getState().startSession("talk-123", "medium");
      const result = useWarmupStore.getState().nextExercise();

      expect(result).toBe(true);
      expect(useWarmupStore.getState().currentExerciseIndex).toBe(1);
      expect(useWarmupStore.getState().exerciseState).toBe("idle");
    });

    it("returns false when at last exercise", () => {
      useWarmupStore.getState().startSession("talk-123", "medium");
      useWarmupStore.setState({ currentExerciseIndex: 2 }); // Last of 3

      const result = useWarmupStore.getState().nextExercise();
      expect(result).toBe(false);
      expect(useWarmupStore.getState().currentExerciseIndex).toBe(2);
    });

    it("resets exercise-specific state", () => {
      useWarmupStore.getState().startSession("talk-123", "medium");
      useWarmupStore.setState({
        currentBreathCycle: 2,
        breathPhase: "hold",
        currentPhraseIndex: 3,
      });

      useWarmupStore.getState().nextExercise();

      const state = useWarmupStore.getState();
      expect(state.currentBreathCycle).toBe(0);
      expect(state.breathPhase).toBeNull();
      expect(state.currentPhraseIndex).toBe(0);
    });
  });

  describe("setExerciseState", () => {
    it("updates exercise state", () => {
      useWarmupStore.getState().startSession("talk-123", "medium");
      useWarmupStore.getState().setExerciseState("instructing");

      expect(useWarmupStore.getState().exerciseState).toBe("instructing");
    });
  });

  describe("breathing exercise actions", () => {
    beforeEach(() => {
      useWarmupStore.getState().startSession("talk-123", "medium");
    });

    it("setBreathPhase updates breath phase", () => {
      useWarmupStore.getState().setBreathPhase("inhale");
      expect(useWarmupStore.getState().breathPhase).toBe("inhale");

      useWarmupStore.getState().setBreathPhase("hold");
      expect(useWarmupStore.getState().breathPhase).toBe("hold");

      useWarmupStore.getState().setBreathPhase("exhale");
      expect(useWarmupStore.getState().breathPhase).toBe("exhale");
    });

    it("advanceBreathCycle increments cycle counter", () => {
      const result = useWarmupStore.getState().advanceBreathCycle();
      expect(result).toBe(true);
      expect(useWarmupStore.getState().currentBreathCycle).toBe(1);
    });

    it("advanceBreathCycle returns false on last cycle", () => {
      useWarmupStore.setState({ currentBreathCycle: 2 }); // 3 cycles total (0,1,2)
      const result = useWarmupStore.getState().advanceBreathCycle();
      expect(result).toBe(false);
    });
  });

  describe("articulation exercise actions", () => {
    beforeEach(() => {
      useWarmupStore.getState().startSession("talk-123", "medium");
      useWarmupStore.setState({ currentExerciseIndex: 1 }); // Articulation exercise
    });

    it("nextPhrase advances phrase index", () => {
      const result = useWarmupStore.getState().nextPhrase();
      expect(result).toBe(true);
      expect(useWarmupStore.getState().currentPhraseIndex).toBe(1);
    });

    it("nextPhrase returns false on last phrase", () => {
      useWarmupStore.setState({ currentPhraseIndex: 3 }); // 4 phrases (0,1,2,3)
      const result = useWarmupStore.getState().nextPhrase();
      expect(result).toBe(false);
    });

    it("resetPhrases resets to first phrase", () => {
      useWarmupStore.setState({ currentPhraseIndex: 2 });
      useWarmupStore.getState().resetPhrases();
      expect(useWarmupStore.getState().currentPhraseIndex).toBe(0);
    });
  });

  describe("getters", () => {
    beforeEach(() => {
      useWarmupStore.getState().startSession("talk-123", "medium");
    });

    it("getCurrentExercise returns current exercise", () => {
      const exercise = useWarmupStore.getState().getCurrentExercise();
      expect(exercise).not.toBeNull();
      expect(exercise!.type).toBe("breathing");
    });

    it("getProgress returns correct percentage", () => {
      expect(useWarmupStore.getState().getProgress()).toBeCloseTo(33.33, 1);

      useWarmupStore.setState({ currentExerciseIndex: 1 });
      expect(useWarmupStore.getState().getProgress()).toBeCloseTo(66.67, 1);

      useWarmupStore.setState({ currentExerciseIndex: 2 });
      expect(useWarmupStore.getState().getProgress()).toBe(100);
    });

    it("isLastExercise returns correct value", () => {
      expect(useWarmupStore.getState().isLastExercise()).toBe(false);

      useWarmupStore.setState({ currentExerciseIndex: 2 });
      expect(useWarmupStore.getState().isLastExercise()).toBe(true);
    });

    it("isFirstExercise returns correct value", () => {
      expect(useWarmupStore.getState().isFirstExercise()).toBe(true);

      useWarmupStore.setState({ currentExerciseIndex: 1 });
      expect(useWarmupStore.getState().isFirstExercise()).toBe(false);
    });

    it("isSessionComplete returns correct value", () => {
      expect(useWarmupStore.getState().isSessionComplete()).toBe(false);

      useWarmupStore.setState({
        currentExerciseIndex: 2,
        exerciseState: "complete",
      });
      expect(useWarmupStore.getState().isSessionComplete()).toBe(true);
    });
  });
});
