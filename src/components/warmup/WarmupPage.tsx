"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { ExerciseCard } from "./ExerciseCard";
import { BreathingExercise } from "./BreathingExercise";
import { ArticulationExercise } from "./ArticulationExercise";
import { PacingExercise } from "./PacingExercise";
import { useWarmupStore } from "@/stores/warmupStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWarmupCommands } from "@/hooks/useWarmupCommands";
import { getRecognitionLocale } from "@/lib/i18n/voiceCommands";
import { warmupPreferredMic, stopStream } from "@/lib/audio/devices";
import * as voicebox from "@/lib/speech/voicebox";
import * as earcons from "@/lib/audio/earcons";
import type { WarmupDuration } from "@/types/warmup";

interface WarmupPageProps {
  talkId: string;
  talkTitle: string;
  duration?: WarmupDuration;
}

/**
 * Main warm-up page that orchestrates the exercise flow
 */
export function WarmupPage({
  talkId,
  talkTitle,
  duration = "medium",
}: WarmupPageProps) {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Settings
  const {
    speechRate,
    voiceName,
    commandLanguage,
    enableVoiceCommands,
  } = useSettingsStore();
  const recognitionLocale = getRecognitionLocale(commandLanguage);

  // Warmup store
  const {
    session,
    exercises,
    currentExerciseIndex,
    exerciseState,
    currentBreathCycle,
    breathPhase,
    currentPhraseIndex,
    startSession,
    endSession,
    nextExercise,
    setExerciseState,
    completeCurrentExercise,
    setBreathPhase,
    advanceBreathCycle,
    nextPhrase,
    getCurrentExercise,
    getProgress,
    isLastExercise,
    isSessionComplete,
  } = useWarmupStore();

  const currentExercise = getCurrentExercise();
  const progress = getProgress();

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors
      }
      recognitionRef.current = null;
    }
    stopStream(micStreamRef.current);
    micStreamRef.current = null;
  }, []);

  // Handle starting an exercise
  const handleStartExercise = useCallback(() => {
    if (!currentExercise) return;
    earcons.exerciseStart();
    setExerciseState("instructing");
  }, [currentExercise, setExerciseState]);

  // Handle moving to next exercise
  const handleNextExercise = useCallback(() => {
    if (isLastExercise()) {
      // All exercises complete
      voicebox.play("Warm-up complete! You're ready to rehearse.", {
        rate: speechRate,
        voiceName: voiceName || undefined,
        onEnd: () => {
          if (isMountedRef.current) {
            endSession();
            router.push(`/talk/${talkId}/rehearse?mode=listen`);
          }
        },
      });
    } else {
      nextExercise();
      // Auto-start next exercise after brief pause
      setTimeout(() => {
        if (isMountedRef.current) {
          handleStartExercise();
        }
      }, 500);
    }
  }, [isLastExercise, nextExercise, endSession, router, talkId, speechRate, voiceName, handleStartExercise]);

  // Handle quitting
  const handleQuit = useCallback(() => {
    voicebox.stop();
    stopListening();
    endSession();
    router.push(`/talk/${talkId}`);
  }, [endSession, router, talkId, stopListening]);

  // Handle help
  const handleHelp = useCallback(() => {
    if (!currentExercise) return;

    voicebox.stop();
    const helpText =
      exerciseState === "idle"
        ? 'Say "start" to begin the exercise, or "quit" to exit.'
        : 'Say "next" to continue, "repeat" to try again, or "quit" to exit.';

    voicebox.play(helpText, {
      rate: speechRate,
      voiceName: voiceName || undefined,
    });
  }, [currentExercise, exerciseState, speechRate, voiceName]);

  // Handle repeat
  const handleRepeat = useCallback(() => {
    if (!currentExercise) return;
    voicebox.stop();
    setExerciseState("idle");
    setTimeout(() => {
      if (isMountedRef.current) {
        handleStartExercise();
      }
    }, 500);
  }, [currentExercise, setExerciseState, handleStartExercise]);

  // Voice commands
  const { checkCommand } = useWarmupCommands({
    commandLanguage,
    onStart: handleStartExercise,
    onNext: () => {
      if (exerciseState === "complete") {
        handleNextExercise();
      }
    },
    onRepeat: handleRepeat,
    onQuit: handleQuit,
    onHelp: handleHelp,
  });

  // Start listening for voice commands
  const startListening = useCallback(async () => {
    if (!enableVoiceCommands) return;
    if (typeof window === "undefined") return;
    if (!isMountedRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    stopListening();

    try {
      micStreamRef.current = await warmupPreferredMic();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLocale;

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;
        const last = event.results[event.results.length - 1];
        if (last.isFinal) {
          checkCommand(last[0].transcript);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && isMountedRef.current) {
          try {
            recognition.start();
          } catch {
            // Ignore restart errors
          }
        }
      };

      recognition.onerror = (e) => {
        if (e.error === "aborted" || e.error === "no-speech") return;
        console.warn("Speech recognition error:", e.error);
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      earcons.micOn();
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
    }
  }, [enableVoiceCommands, recognitionLocale, checkCommand, stopListening]);

  // Initialize session on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!session) {
      startSession(talkId, duration);
    }

    // Start listening for commands
    startListening();

    // Welcome message
    setTimeout(() => {
      if (isMountedRef.current) {
        voicebox.play(
          `Let's warm up your voice for ${talkTitle}. Say "start" when you're ready, or tap the screen.`,
          {
            rate: speechRate,
            voiceName: voiceName || undefined,
          }
        );
      }
    }, 500);

    return () => {
      isMountedRef.current = false;
      voicebox.stop();
      stopListening();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle screen tap to start/advance
  const handleScreenTap = useCallback(() => {
    if (exerciseState === "idle") {
      handleStartExercise();
    } else if (exerciseState === "complete") {
      handleNextExercise();
    }
  }, [exerciseState, handleStartExercise, handleNextExercise]);

  // Render exercise based on type
  const renderExercise = () => {
    if (!currentExercise) return null;

    switch (currentExercise.type) {
      case "breathing":
        return (
          <BreathingExercise
            exercise={currentExercise}
            exerciseState={exerciseState}
            currentCycle={currentBreathCycle}
            breathPhase={breathPhase}
            onStateChange={setExerciseState}
            onPhaseChange={setBreathPhase}
            onCycleComplete={advanceBreathCycle}
            onExerciseComplete={completeCurrentExercise}
            speechRate={speechRate}
            voiceName={voiceName}
          />
        );
      case "articulation":
        return (
          <ArticulationExercise
            exercise={currentExercise}
            exerciseState={exerciseState}
            currentPhraseIndex={currentPhraseIndex}
            onStateChange={setExerciseState}
            onNextPhrase={nextPhrase}
            onExerciseComplete={completeCurrentExercise}
            speechRate={speechRate}
            voiceName={voiceName}
          />
        );
      case "pacing":
        return (
          <PacingExercise
            exercise={currentExercise}
            exerciseState={exerciseState}
            onStateChange={setExerciseState}
            onExerciseComplete={completeCurrentExercise}
            speechRate={speechRate}
            voiceName={voiceName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <Header
        title="Warm Up"
        backHref={`/talk/${talkId}`}
      />

      <div className="flex flex-col h-full px-4 py-4">
        {/* Overall progress */}
        <ProgressBar value={progress} size="lg" className="mb-4" />

        {/* Main exercise area */}
        <div
          className="flex-1 flex flex-col"
          onClick={handleScreenTap}
        >
          {currentExercise ? (
            <ExerciseCard
              exercise={currentExercise}
              exerciseState={exerciseState}
              exerciseNumber={currentExerciseIndex + 1}
              totalExercises={exercises.length}
            >
              {renderExercise()}
            </ExerciseCard>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-dim">Loading exercises...</p>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="mt-4 space-y-3">
          {exerciseState === "complete" && (
            <Button onClick={handleNextExercise}>
              {isLastExercise() ? "Start Rehearsal" : "Next Exercise"}
            </Button>
          )}
          {exerciseState === "idle" && (
            <Button onClick={handleStartExercise}>Start Exercise</Button>
          )}
          <Button variant="secondary" onClick={handleQuit}>
            Skip Warm-Up
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
