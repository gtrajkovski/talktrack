"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { SlideHeader } from "./SlideHeader";
import { VoiceStatus } from "./VoiceStatus";
import { RehearsalControls } from "./RehearsalControls";
import { TranscriptScore } from "./TranscriptScore";
import { speak, stop } from "@/lib/speech/synthesis";
import { slideTransition } from "@/lib/audio/chime";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Slide } from "@/types/talk";

interface PromptModeProps {
  slides: Slide[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  onUsedHelp: () => void;
}

// Voice command keywords
const COMMANDS = {
  next: ["next", "next slide", "forward", "continue", "skip", "move on"],
  back: ["back", "previous", "go back", "last slide", "before"],
  repeat: ["repeat", "again", "say that again", "one more time", "replay"],
  reveal: ["reveal", "show me", "tell me", "what is it", "answer"],
};

export function PromptMode({
  slides,
  currentIndex,
  onNext,
  onPrev,
  onComplete,
  onUsedHelp,
}: PromptModeProps) {
  const { speechRate, voiceName } = useSettingsStore();
  const [status, setStatus] = useState<"playing" | "listening" | "idle">("idle");
  const [revealed, setRevealed] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  const progress = ((currentIndex + 1) / slides.length) * 100;

  // Check for voice commands in transcript
  const checkCommand = useCallback((text: string): string | null => {
    const words = text.toLowerCase().split(/\s+/).slice(-5);
    const phrase = words.join(" ");

    for (const [command, phrases] of Object.entries(COMMANDS)) {
      for (const p of phrases) {
        if (phrase.includes(p)) {
          return command;
        }
      }
    }
    return null;
  }, []);

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

  // Start speech recognition
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

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
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);

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
        // Auto-restart if we should still be listening
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            // Ignore restart errors
          }
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== "aborted" && e.error !== "no-speech") {
          console.warn("Speech recognition error:", e.error);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setStatus("listening");
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
    }
  }, [checkCommand, stopListening]);

  // Speak the slide title and start listening
  const speakTitle = useCallback(() => {
    setRevealed(false);
    setTranscript("");
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

  const handleNext = useCallback(() => {
    stop();
    stopListening();
    if (isLastSlide) {
      onComplete();
    } else {
      slideTransition();
      onNext();
    }
  }, [isLastSlide, onComplete, onNext, stopListening]);

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

  // Initial title speak
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
