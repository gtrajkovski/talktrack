"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WarmupExercise, ExerciseState } from "@/types/warmup";
import * as voicebox from "@/lib/speech/voicebox";
import * as earcons from "@/lib/audio/earcons";

interface ArticulationExerciseProps {
  exercise: WarmupExercise;
  exerciseState: ExerciseState;
  currentPhraseIndex: number;
  onStateChange: (state: ExerciseState) => void;
  onNextPhrase: () => boolean;
  onExerciseComplete: () => void;
  speechRate: number;
  voiceName: string;
}

/**
 * Articulation/tongue twister exercise component
 */
export function ArticulationExercise({
  exercise,
  exerciseState,
  currentPhraseIndex,
  onStateChange,
  onNextPhrase,
  onExerciseComplete,
  speechRate,
  voiceName,
}: ArticulationExerciseProps) {
  const isMountedRef = useRef(true);
  const [showingPhrase, setShowingPhrase] = useState(false);
  const [waitingForUser, setWaitingForUser] = useState(false);

  const phrases = exercise.phrases ?? [];
  const currentPhrase = phrases[currentPhraseIndex];

  // Use ref to track current index to avoid stale closures
  const currentPhraseIndexRef = useRef(currentPhraseIndex);
  currentPhraseIndexRef.current = currentPhraseIndex;

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      voicebox.stop();
    };
  }, []);

  // Speak current phrase and wait for user to repeat
  const speakPhrase = useCallback(() => {
    if (!isMountedRef.current) return;

    // Get phrase from ref to avoid stale closure
    const phrase = phrases[currentPhraseIndexRef.current];
    if (!phrase) return;

    setShowingPhrase(true);
    setWaitingForUser(false);

    voicebox.play(phrase, {
      rate: speechRate * 0.9, // Slightly slower for clarity
      voiceName: voiceName || undefined,
      onEnd: () => {
        if (!isMountedRef.current) return;
        setWaitingForUser(true);
        // Auto-advance after 5 seconds if user doesn't say "next"
        setTimeout(() => {
          if (isMountedRef.current && waitingForUser) {
            handleNextPhrase();
          }
        }, 5000);
      },
    });
  }, [phrases, speechRate, voiceName, waitingForUser]);

  // Handle advancing to next phrase
  const handleNextPhrase = useCallback(() => {
    if (!isMountedRef.current) return;

    setWaitingForUser(false);
    earcons.slideAdvance();

    const hasMore = onNextPhrase();
    if (hasMore) {
      // Brief pause before next phrase
      setTimeout(() => {
        if (isMountedRef.current) {
          speakPhrase();
        }
      }, 500);
    } else {
      // All phrases done
      onStateChange("feedback");
      voicebox.play("Excellent! Your articulation is warmed up.", {
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
  }, [onNextPhrase, onStateChange, onExerciseComplete, speechRate, voiceName, speakPhrase]);

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
            speakPhrase();
          }
        },
      });
    }
  }, [exerciseState, exercise.instructions, speechRate, voiceName, onStateChange, speakPhrase]);

  // Handle "next" command from voice
  useEffect(() => {
    if (waitingForUser && exerciseState === "exercising") {
      // The useWarmupCommands hook will call onNext when user says "next"
      // This effect just ensures we're ready to receive commands
    }
  }, [waitingForUser, exerciseState]);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      {/* Phrase display */}
      {showingPhrase && currentPhrase && (
        <div className="bg-surface-light rounded-xl p-6 max-w-md">
          <p className="text-lg text-center leading-relaxed">{currentPhrase}</p>
        </div>
      )}

      {/* Status indicator */}
      <div className="text-center">
        {waitingForUser ? (
          <>
            <p className="text-xl font-medium text-accent">Your turn!</p>
            <p className="text-sm text-text-dim mt-2">
              Say the phrase, then &quot;next&quot; or tap to continue
            </p>
          </>
        ) : exerciseState === "exercising" ? (
          <p className="text-xl font-medium">Listen carefully...</p>
        ) : exerciseState === "idle" ? (
          <p className="text-text-dim">
            Say &quot;start&quot; or tap to begin
          </p>
        ) : null}
      </div>

      {/* Progress indicator */}
      <div className="text-sm text-text-dim">
        Phrase {currentPhraseIndex + 1} of {phrases.length}
      </div>

      {/* Tap to advance button (visible when waiting) */}
      {waitingForUser && (
        <button
          onClick={handleNextPhrase}
          className="mt-4 px-6 py-3 bg-accent text-bg rounded-xl font-medium active:scale-95 transition-transform"
        >
          Next Phrase
        </button>
      )}
    </div>
  );
}
