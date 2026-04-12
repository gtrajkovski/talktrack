"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BreathingExercise } from "@/components/warmup/BreathingExercise";
import { Button } from "@/components/ui/Button";
import type { WarmupExercise, ExerciseState } from "@/types/warmup";
import { useConferenceDayStore } from "@/stores/conferenceDayStore";
import { useSettingsStore } from "@/stores/settingsStore";
import * as voicebox from "@/lib/speech/voicebox";

interface CalmDownModeProps {
  talkId: string;
}

/**
 * Calm breathing exercise for pre-talk nerves
 * 2 cycles (~30 seconds) instead of the warmup's 3 cycles
 */
const CALM_BREATHING_EXERCISE: WarmupExercise = {
  id: "calm-breathing",
  type: "breathing",
  name: "Calm Down",
  description: "Quick calming exercise before your talk",
  durationSeconds: 30,
  instructions: [
    "Let's take a moment to calm your nerves.",
    "Breathe in slowly through your nose.",
    "Hold for a moment.",
    "Then breathe out through your mouth.",
    "Two slow breaths. You've got this.",
  ],
  breathCycles: 2,
  inhaleSeconds: 4,
  holdSeconds: 4,
  exhaleSeconds: 4,
};

export function CalmDownMode({ talkId }: CalmDownModeProps) {
  const router = useRouter();
  const { speechRate, voiceName } = useSettingsStore();
  const { markBreathingComplete, event } = useConferenceDayStore();

  const [exerciseState, setExerciseState] = useState<ExerciseState>("idle");
  const [currentCycle, setCurrentCycle] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale" | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Start automatically after brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setExerciseState("instructing");
    }, 500);
    return () => {
      clearTimeout(timer);
      voicebox.stop();
    };
  }, []);

  const handleStateChange = useCallback((state: ExerciseState) => {
    setExerciseState(state);
  }, []);

  const handlePhaseChange = useCallback((phase: "inhale" | "hold" | "exhale" | null) => {
    setBreathPhase(phase);
  }, []);

  const handleCycleComplete = useCallback((): boolean => {
    const nextCycle = currentCycle + 1;
    const totalCycles = CALM_BREATHING_EXERCISE.breathCycles ?? 2;

    if (nextCycle >= totalCycles) {
      return false;
    }

    setCurrentCycle(nextCycle);
    return true;
  }, [currentCycle]);

  const handleExerciseComplete = useCallback(async () => {
    setIsComplete(true);
    await markBreathingComplete();

    // Custom completion message for conference day
    voicebox.play("You're calm and focused. Go nail it.", {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        router.push(`/talk/${talkId}/conference-day`);
      },
    });
  }, [markBreathingComplete, router, talkId, speechRate, voiceName]);

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-6xl mb-4">🧘</div>
        <h2 className="text-xl font-bold mb-2">You&apos;re Ready</h2>
        <p className="text-text-dim text-center">
          Calm, focused, and prepared.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Calm Down</h2>
        <p className="text-text-dim text-sm">30-second breathing exercise</p>
      </div>

      {/* Breathing Exercise */}
      <div className="flex-1">
        <BreathingExercise
          exercise={CALM_BREATHING_EXERCISE}
          exerciseState={exerciseState}
          currentCycle={currentCycle}
          breathPhase={breathPhase}
          onStateChange={handleStateChange}
          onPhaseChange={handlePhaseChange}
          onCycleComplete={handleCycleComplete}
          onExerciseComplete={handleExerciseComplete}
          speechRate={speechRate}
          voiceName={voiceName}
        />
      </div>

      {/* Exit button */}
      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={() => {
            voicebox.stop();
            router.back();
          }}
          className="w-full"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
