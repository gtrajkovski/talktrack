"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StateOrb } from "./StateOrb";
import { RehearsalControls } from "./RehearsalControls";
import { speak, stop, isSpeaking } from "@/lib/speech/synthesis";
import * as earcons from "@/lib/audio/earcons";
import { getCommands, getRecognitionLocale, matchCommand } from "@/lib/i18n/voiceCommands";
import { useSettingsStore } from "@/stores/settingsStore";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import { useEarconSync } from "@/hooks/useEarconSync";
import type { Slide } from "@/types/talk";

interface ListenModeProps {
  slides: Slide[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
}

// Detect iOS for speech overlap workaround
const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export function ListenMode({
  slides,
  currentIndex,
  onNext,
  onPrev,
  onComplete,
}: ListenModeProps) {
  const { speechRate, voiceName, autoAdvance, autoAdvanceDelay, commandLanguage } = useSettingsStore();
  const { setAudioState, setLastCommand } = useRehearsalStore();
  const commands = getCommands(commandLanguage);
  const recognitionLocale = getRecognitionLocale(commandLanguage);
  const [status, setStatus] = useState<"playing" | "paused" | "idle">("idle");

  // Sync earcons with settings
  useEarconSync();

  // Recognition refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCommandTimeRef = useRef(0);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handler refs to avoid stale closures
  const handleNextRef = useRef<() => void>(() => {});
  const handleBackRef = useRef<() => void>(() => {});
  const handleRepeatRef = useRef<() => void>(() => {});
  const handlePauseRef = useRef<() => void>(() => {});
  const handleResumeRef = useRef<() => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  const progress = ((currentIndex + 1) / slides.length) * 100;

  // Check for voice commands
  const checkCommand = useCallback((text: string): string | null => {
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 500) return null;

    const command = matchCommand(text, commands, "listen");
    if (command) {
      lastCommandTimeRef.current = now;
      setLastCommand(command);
      earcons.commandRecognized();
    }
    return command;
  }, [commands, setLastCommand]);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
  }, []);

  // Start speech recognition for voice commands
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isMountedRef.current) return;

    // iOS: Don't start listening if TTS is still speaking
    if (isIOS && isSpeaking()) {
      setTimeout(() => startListeningRef.current(), 300);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    stopListening();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLocale;

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;

        const last = event.results[event.results.length - 1];
        if (last.isFinal) {
          const command = checkCommand(last[0].transcript);
          if (command) {
            switch (command) {
              case "next":
                handleNextRef.current();
                break;
              case "back":
                handleBackRef.current();
                break;
              case "repeat":
                handleRepeatRef.current();
                break;
              case "stop":
                handlePauseRef.current();
                break;
              case "resume":
                handleResumeRef.current();
                break;
            }
          }
        }
      };

      recognition.onend = () => {
        // Auto-restart if we should still be listening
        if (isListeningRef.current && isMountedRef.current) {
          if (isIOS && isSpeaking()) {
            setTimeout(() => {
              if (isListeningRef.current && isMountedRef.current) {
                try { recognition.start(); } catch { /* ignore */ }
              }
            }, 100);
            return;
          }
          try {
            recognition.start();
          } catch {
            // Ignore restart errors
          }
        }
      };

      recognition.onerror = (e) => {
        if (!isMountedRef.current) return;
        // Ignore expected errors
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
  }, [checkCommand, stopListening, recognitionLocale]);

  // Clear auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  // Speak slide and set up auto-advance
  const speakSlide = useCallback(() => {
    clearAutoAdvanceTimer();
    setStatus("playing");
    setAudioState("speaking");

    speak(currentSlide.notes, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        if (!isMountedRef.current) return;
        setStatus("idle");
        setAudioState("idle");

        // Start listening for voice commands after TTS ends
        startListening();

        if (autoAdvance) {
          autoAdvanceTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            if (isLastSlide) {
              onComplete();
            } else {
              earcons.slideAdvance();
              onNext();
            }
          }, autoAdvanceDelay * 1000);
        }
      },
    });
  }, [currentSlide.notes, speechRate, voiceName, autoAdvance, autoAdvanceDelay, isLastSlide, onComplete, onNext, setAudioState, clearAutoAdvanceTimer, startListening]);

  const handleRepeat = useCallback(() => {
    stop();
    stopListening();
    clearAutoAdvanceTimer();
    earcons.repeat();
    speakSlide();
  }, [speakSlide, stopListening, clearAutoAdvanceTimer]);

  const handleNext = useCallback(() => {
    stop();
    stopListening();
    clearAutoAdvanceTimer();
    setAudioState("idle");
    if (isLastSlide) {
      onComplete();
    } else {
      earcons.slideAdvance();
      onNext();
    }
  }, [isLastSlide, onComplete, onNext, stopListening, clearAutoAdvanceTimer, setAudioState]);

  const handleBack = useCallback(() => {
    stop();
    stopListening();
    clearAutoAdvanceTimer();
    setAudioState("idle");
    earcons.slideBack();
    onPrev();
  }, [onPrev, stopListening, clearAutoAdvanceTimer, setAudioState]);

  const handlePause = useCallback(() => {
    stop();
    stopListening();
    clearAutoAdvanceTimer();
    earcons.micOff();
    setStatus("paused");
    setAudioState("paused");
    // Keep listening for "resume" command
    startListeningRef.current();
  }, [stopListening, clearAutoAdvanceTimer, setAudioState]);

  const handleResume = useCallback(() => {
    stopListening();
    speakSlide();
  }, [speakSlide, stopListening]);

  // Update refs - use useEffect to satisfy linter (refs should be stable between renders)
  useEffect(() => {
    handleNextRef.current = handleNext;
    handleBackRef.current = handleBack;
    handleRepeatRef.current = handleRepeat;
    handlePauseRef.current = handlePause;
    handleResumeRef.current = handleResume;
    startListeningRef.current = startListening;
  });

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Speak slide on mount and slide change
  useEffect(() => {
    speakSlide();
    return () => {
      stop();
      stopListening();
      clearAutoAdvanceTimer();
    };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <ProgressBar value={progress} size="lg" className="mb-6" />

      {/* Slide title */}
      <h2 className="text-xl font-bold text-center mb-4 px-4">{currentSlide.title}</h2>

      {/* Glanceable state indicator */}
      <div className="flex justify-center mb-4">
        <StateOrb
          onTap={() => {
            // Toggle pause/resume
            if (status === "playing") {
              handlePause();
            } else {
              handleResume();
            }
          }}
        />
      </div>

      {/* Notes Display */}
      <div className="flex-1 overflow-y-auto mb-4">
        <div className="bg-surface rounded-[var(--radius)] p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {currentSlide.notes}
          </p>
        </div>
      </div>

      {/* Controls - tap fallback for voice commands */}
      <RehearsalControls
        onBack={handleBack}
        onRepeat={handleRepeat}
        onNext={handleNext}
        isFirstSlide={isFirstSlide}
        isLastSlide={isLastSlide}
        iconOnly
      />
    </div>
  );
}
