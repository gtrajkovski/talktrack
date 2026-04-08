"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WarmupExercise, ExerciseState } from "@/types/warmup";
import * as voicebox from "@/lib/speech/voicebox";
import * as earcons from "@/lib/audio/earcons";

interface BreathingExerciseProps {
  exercise: WarmupExercise;
  exerciseState: ExerciseState;
  currentCycle: number;
  breathPhase: "inhale" | "hold" | "exhale" | null;
  onStateChange: (state: ExerciseState) => void;
  onPhaseChange: (phase: "inhale" | "hold" | "exhale" | null) => void;
  onCycleComplete: () => boolean;
  onExerciseComplete: () => void;
  speechRate: number;
  voiceName: string;
}

/**
 * Breathing exercise component with visual and audio guidance
 */
export function BreathingExercise({
  exercise,
  exerciseState,
  currentCycle,
  breathPhase,
  onStateChange,
  onPhaseChange,
  onCycleComplete,
  onExerciseComplete,
  speechRate,
  voiceName,
}: BreathingExerciseProps) {
  const isMountedRef = useRef(true);
  const stopToneRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const totalCycles = exercise.breathCycles ?? 3;
  const inhaleSeconds = exercise.inhaleSeconds ?? 4;
  const holdSeconds = exercise.holdSeconds ?? 4;
  const exhaleSeconds = exercise.exhaleSeconds ?? 4;

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      voicebox.stop();
      stopToneRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start countdown timer
  const startCountdown = useCallback((seconds: number, onComplete: () => void) => {
    setCountdown(seconds);
    let remaining = seconds;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (!isMountedRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      setCountdown(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCountdown(null);
        onComplete();
      }
    }, 1000);
  }, []);

  // Run breathing cycle
  const runBreathCycle = useCallback(() => {
    if (!isMountedRef.current) return;

    // Inhale phase
    onPhaseChange("inhale");
    stopToneRef.current = earcons.breathingTone(220); // A3 for inhale

    voicebox.play("Breathe in", {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        if (!isMountedRef.current) return;

        startCountdown(inhaleSeconds, () => {
          if (!isMountedRef.current) return;
          stopToneRef.current?.();

          // Hold phase
          onPhaseChange("hold");

          voicebox.play("Hold", {
            rate: speechRate,
            voiceName: voiceName || undefined,
            onEnd: () => {
              if (!isMountedRef.current) return;

              startCountdown(holdSeconds, () => {
                if (!isMountedRef.current) return;

                // Exhale phase
                onPhaseChange("exhale");
                stopToneRef.current = earcons.breathingTone(196); // G3 for exhale (slightly lower)

                voicebox.play("Breathe out", {
                  rate: speechRate,
                  voiceName: voiceName || undefined,
                  onEnd: () => {
                    if (!isMountedRef.current) return;

                    startCountdown(exhaleSeconds, () => {
                      if (!isMountedRef.current) return;
                      stopToneRef.current?.();
                      onPhaseChange(null);

                      // Check if more cycles
                      const hasMore = onCycleComplete();
                      if (hasMore) {
                        // Brief pause before next cycle
                        setTimeout(() => {
                          if (isMountedRef.current) {
                            runBreathCycle();
                          }
                        }, 1000);
                      } else {
                        // Exercise complete
                        onStateChange("feedback");
                        voicebox.play("Well done! Your breathing is now calm and controlled.", {
                          rate: speechRate,
                          voiceName: voiceName || undefined,
                          onEnd: () => {
                            if (isMountedRef.current) {
                              earcons.exerciseComplete();
                              onExerciseComplete();
                            }
                          },
                        });
                      }
                    });
                  },
                });
              });
            },
          });
        });
      },
    });
  }, [
    speechRate,
    voiceName,
    inhaleSeconds,
    holdSeconds,
    exhaleSeconds,
    startCountdown,
    onPhaseChange,
    onCycleComplete,
    onStateChange,
    onExerciseComplete,
  ]);

  // Start exercise when state changes to instructing
  useEffect(() => {
    if (exerciseState === "instructing") {
      const instructions = exercise.instructions.join(" ");
      voicebox.play(instructions, {
        rate: speechRate,
        voiceName: voiceName || undefined,
        onEnd: () => {
          if (isMountedRef.current) {
            onStateChange("exercising");
            runBreathCycle();
          }
        },
      });
    }
  }, [exerciseState, exercise.instructions, speechRate, voiceName, onStateChange, runBreathCycle]);

  // Visual breath indicator size
  const getBreathSize = () => {
    switch (breathPhase) {
      case "inhale":
        return "scale-150";
      case "hold":
        return "scale-150";
      case "exhale":
        return "scale-100";
      default:
        return "scale-100";
    }
  };

  // Visual breath color
  const getBreathColor = () => {
    switch (breathPhase) {
      case "inhale":
        return "bg-blue";
      case "hold":
        return "bg-accent";
      case "exhale":
        return "bg-success";
      default:
        return "bg-surface-light";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      {/* Breathing circle visualization */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        <div
          className={`
            w-32 h-32 rounded-full transition-all duration-1000 ease-in-out
            ${getBreathColor()} ${getBreathSize()}
          `}
        />
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-bg">{countdown}</span>
          </div>
        )}
      </div>

      {/* Phase instruction */}
      <div className="text-center">
        <p className="text-xl font-medium capitalize">
          {breathPhase ?? "Get ready"}
        </p>
        <p className="text-sm text-text-dim mt-2">
          Cycle {currentCycle + 1} of {totalCycles}
        </p>
      </div>

      {/* Instructions when idle */}
      {exerciseState === "idle" && (
        <p className="text-center text-text-dim max-w-xs">
          Say &quot;start&quot; or tap the screen to begin the breathing exercise
        </p>
      )}
    </div>
  );
}
