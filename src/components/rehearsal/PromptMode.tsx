"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { SlideHeader } from "./SlideHeader";
import { VoiceStatus } from "./VoiceStatus";
import { RehearsalControls } from "./RehearsalControls";
import { TranscriptScore } from "./TranscriptScore";
import { TimerOverlay } from "./TimerOverlay";
import { speak, stop, isSpeaking } from "@/lib/speech/synthesis";
import { slideTransition } from "@/lib/audio/chime";
import { startRecording, saveRecording, isRecordingSupported } from "@/lib/audio/recorder";
import { calculateSimilarity } from "@/lib/scoring/similarity";
import { recordSlideScore } from "@/lib/db/talks";
import { getCommands, getRecognitionLocale, matchCommand } from "@/lib/i18n/voiceCommands";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Slide } from "@/types/talk";

interface PromptModeProps {
  slides: Slide[];
  currentIndex: number;
  sessionId: string;
  talkId: string;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  onUsedHelp: () => void;
}

// Detect iOS for speech overlap workaround
const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export function PromptMode({
  slides,
  currentIndex,
  sessionId,
  talkId,
  onNext,
  onPrev,
  onComplete,
  onUsedHelp,
}: PromptModeProps) {
  const { speechRate, voiceName, showTimer, timerWarningSeconds, commandLanguage } = useSettingsStore();
  const canRecord = isRecordingSupported();
  const commands = getCommands(commandLanguage);
  const recognitionLocale = getRecognitionLocale(commandLanguage);
  const [status, setStatus] = useState<"playing" | "listening" | "idle" | "error">("idle");
  const [revealed, setRevealed] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCommandTimeRef = useRef(0);
  const errorRetryCountRef = useRef(0);
  const transcriptRef = useRef("");

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  const progress = ((currentIndex + 1) / slides.length) * 100;

  // Check for voice commands in transcript using localized command set
  const checkCommand = useCallback((text: string): string | null => {
    // Debounce: ignore commands within 500ms of last command
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 500) return null;

    const command = matchCommand(text, commands, "prompt");
    if (command) {
      lastCommandTimeRef.current = now;
    }
    return command;
  }, [commands]);

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

  // Handlers need to be refs to avoid stale closures
  const handleNextRef = useRef<() => void>(() => {});
  const handleBackRef = useRef<() => void>(() => {});
  const handleRepeatRef = useRef<() => void>(() => {});
  const handleRevealRef = useRef<() => void>(() => {});

  // Start speech recognition with error recovery
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isMountedRef.current) return;

    // iOS: Don't start listening if TTS is still speaking
    if (isIOS && isSpeaking()) {
      setTimeout(() => startListening(), 100);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      setStatus("idle");
      return;
    }

    stopListening();

    // Start audio recording alongside speech recognition
    if (canRecord) {
      startRecording();
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLocale;

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;
        errorRetryCountRef.current = 0; // Reset error count on successful result

        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
        transcriptRef.current = fullTranscript;

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
              case "reveal":
                handleRevealRef.current();
                break;
            }
          }
        }
      };

      recognition.onend = () => {
        // Auto-restart if we should still be listening and component is mounted
        if (isListeningRef.current && isMountedRef.current) {
          // iOS: Check TTS isn't speaking before restarting
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

        // Handle network/service errors with recovery
        if (e.error === "network" || e.error === "service-not-allowed") {
          errorRetryCountRef.current++;

          if (errorRetryCountRef.current <= 3) {
            // Retry after delay
            setStatus("error");
            setTimeout(() => {
              if (isMountedRef.current && isListeningRef.current) {
                setStatus("listening");
                startListening();
              }
            }, 2000);
          } else {
            // Too many errors, stay in error state
            setStatus("error");
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      errorRetryCountRef.current = 0;
      setStatus("listening");
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setStatus("error");
    }
  }, [checkCommand, stopListening, recognitionLocale, canRecord]);

  // Speak the slide title and start listening
  const speakTitle = useCallback(() => {
    setRevealed(false);
    setTranscript("");
    transcriptRef.current = "";
    stopListening();
    setStatus("playing");

    speak(currentSlide.title, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        startListening();
      },
    });
  }, [currentSlide.title, speechRate, voiceName, startListening, stopListening]);

  const handleReveal = useCallback(() => {
    stopListening();
    setRevealed(true);
    onUsedHelp();
    setStatus("playing");

    speak(currentSlide.notes, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        startListening();
      },
    });
  }, [currentSlide.notes, speechRate, voiceName, startListening, stopListening, onUsedHelp]);

  const handleRepeat = useCallback(() => {
    stop();
    speakTitle();
  }, [speakTitle]);

  const handleNext = useCallback(async () => {
    stop();
    stopListening();

    // Calculate and record score if user spoke something
    if (transcriptRef.current) {
      const score = calculateSimilarity(currentSlide.notes, transcriptRef.current);
      await recordSlideScore(talkId, currentSlide.id, score, "prompt");
    }

    // Save recording before advancing
    if (canRecord) {
      await saveRecording(sessionId, talkId, currentSlide.id, currentIndex);
    }

    if (isLastSlide) {
      onComplete();
    } else {
      slideTransition();
      onNext();
    }
  }, [isLastSlide, onComplete, onNext, stopListening, canRecord, sessionId, talkId, currentSlide.id, currentSlide.notes, currentIndex]);

  const handleBack = useCallback(() => {
    stop();
    stopListening();
    onPrev();
  }, [onPrev, stopListening]);

  // Update refs
  handleNextRef.current = handleNext;
  handleBackRef.current = handleBack;
  handleRepeatRef.current = handleRepeat;
  handleRevealRef.current = handleReveal;

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial title speak on slide change
  useEffect(() => {
    speakTitle();
    return () => {
      stop();
      stopListening();
    };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <ProgressBar value={progress} size="lg" className="mb-6" />

      <SlideHeader
        currentSlide={currentIndex + 1}
        totalSlides={slides.length}
        title={currentSlide.title}
      />

      <VoiceStatus status={status} />

      {showTimer && (
        <TimerOverlay
          totalSeconds={currentSlide.estimatedSeconds}
          warningSeconds={timerWarningSeconds}
          isActive={status === "listening"}
        />
      )}

      <div className="flex-1 overflow-y-auto mb-6">
        {revealed ? (
          <div className="bg-surface rounded-[var(--radius)] p-4">
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {currentSlide.notes}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-text-dim mb-4">
              Recite from memory, or say &quot;reveal&quot; to hear the notes.
            </p>
            <Button onClick={handleReveal} variant="secondary">
              Reveal Answer
            </Button>
          </div>
        )}

        {transcript && (
          <TranscriptScore
            transcript={transcript}
            originalNotes={currentSlide.notes}
            showScore={revealed}
          />
        )}
      </div>

      <RehearsalControls
        onBack={handleBack}
        onRepeat={handleRepeat}
        onNext={handleNext}
        isFirstSlide={isFirstSlide}
        isLastSlide={isLastSlide}
      />
    </div>
  );
}
