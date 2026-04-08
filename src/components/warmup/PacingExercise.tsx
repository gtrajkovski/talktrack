"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WarmupExercise, ExerciseState } from "@/types/warmup";
import * as voicebox from "@/lib/speech/voicebox";
import * as earcons from "@/lib/audio/earcons";

interface PacingExerciseProps {
  exercise: WarmupExercise;
  exerciseState: ExerciseState;
  onStateChange: (state: ExerciseState) => void;
  onExerciseComplete: () => void;
  speechRate: number;
  voiceName: string;
}

type PacingPhase = "first-listen" | "first-repeat" | "projection-prompt" | "projection-repeat" | "done";

/**
 * Pacing/projection exercise component
 */
export function PacingExercise({
  exercise,
  exerciseState,
  onStateChange,
  onExerciseComplete,
  speechRate,
  voiceName,
}: PacingExerciseProps) {
  const isMountedRef = useRef(true);
  const [phase, setPhase] = useState<PacingPhase>("first-listen");
  const [waitingForUser, setWaitingForUser] = useState(false);

  const passage = exercise.passage ?? "";

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      voicebox.stop();
    };
  }, []);

  // Run the pacing exercise sequence
  const runExercise = useCallback(() => {
    if (!isMountedRef.current) return;

    // Phase 1: Speak passage slowly
    setPhase("first-listen");
    setWaitingForUser(false);

    voicebox.play("Listen to this passage, then repeat it at the same pace.", {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        if (!isMountedRef.current) return;

        voicebox.play(passage, {
          rate: speechRate * 0.85, // Slower for demonstration
          voiceName: voiceName || undefined,
          onEnd: () => {
            if (!isMountedRef.current) return;

            // Phase 2: Wait for user to repeat
            setPhase("first-repeat");
            setWaitingForUser(true);
          },
        });
      },
    });
  }, [passage, speechRate, voiceName]);

  // Handle user completing first repeat
  const handleFirstRepeatDone = useCallback(() => {
    if (!isMountedRef.current) return;

    setWaitingForUser(false);
    earcons.slideAdvance();

    // Phase 3: Prompt for projection
    setPhase("projection-prompt");

    voicebox.play(
      "Great! Now say it again, but this time project your voice as if speaking to someone across the room.",
      {
        rate: speechRate,
        voiceName: voiceName || undefined,
        onEnd: () => {
          if (!isMountedRef.current) return;

          // Phase 4: Wait for projected repeat
          setPhase("projection-repeat");
          setWaitingForUser(true);
        },
      }
    );
  }, [speechRate, voiceName]);

  // Handle user completing projection repeat
  const handleProjectionDone = useCallback(() => {
    if (!isMountedRef.current) return;

    setWaitingForUser(false);
    setPhase("done");

    // Complete exercise
    onStateChange("feedback");
    voicebox.play(
      "Wonderful! Your voice is now warmed up and ready for your presentation.",
      {
        rate: speechRate,
        voiceName: voiceName || undefined,
        onEnd: () => {
          if (isMountedRef.current) {
            earcons.exerciseComplete();
            onExerciseComplete();
          }
        },
      }
    );
  }, [onStateChange, onExerciseComplete, speechRate, voiceName]);

  // Handle "next" command
  const handleNext = useCallback(() => {
    if (phase === "first-repeat") {
      handleFirstRepeatDone();
    } else if (phase === "projection-repeat") {
      handleProjectionDone();
    }
  }, [phase, handleFirstRepeatDone, handleProjectionDone]);

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
            runExercise();
          }
        },
      });
    }
  }, [exerciseState, exercise.instructions, speechRate, voiceName, onStateChange, runExercise]);

  // Get phase instruction text
  const getPhaseText = () => {
    switch (phase) {
      case "first-listen":
        return "Listen carefully...";
      case "first-repeat":
        return "Now repeat at the same pace";
      case "projection-prompt":
        return "Getting ready...";
      case "projection-repeat":
        return "Now PROJECT your voice!";
      case "done":
        return "All done!";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      {/* Passage display */}
      <div className="bg-surface-light rounded-xl p-6 max-w-md">
        <p className="text-lg text-center leading-relaxed">{passage}</p>
      </div>

      {/* Phase indicator */}
      <div className="text-center">
        <p
          className={`text-xl font-medium ${
            phase === "projection-repeat" ? "text-accent" : ""
          }`}
        >
          {getPhaseText()}
        </p>
        {waitingForUser && (
          <p className="text-sm text-text-dim mt-2">
            Say &quot;next&quot; or tap when done
          </p>
        )}
      </div>

      {/* Volume indicator for projection phase */}
      {phase === "projection-repeat" && (
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔊</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-2 h-8 bg-accent rounded animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Instructions when idle */}
      {exerciseState === "idle" && (
        <p className="text-center text-text-dim max-w-xs">
          Say &quot;start&quot; or tap to begin the projection exercise
        </p>
      )}

      {/* Tap to advance button (visible when waiting) */}
      {waitingForUser && (
        <button
          onClick={handleNext}
          className="mt-4 px-6 py-3 bg-accent text-bg rounded-xl font-medium active:scale-95 transition-transform"
        >
          {phase === "first-repeat" ? "I'm Done" : "Finished!"}
        </button>
      )}
    </div>
  );
}
