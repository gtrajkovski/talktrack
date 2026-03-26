"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { SlideHeader } from "./SlideHeader";
import { VoiceStatus } from "./VoiceStatus";
import { RehearsalControls } from "./RehearsalControls";
import { speak, stop, isSpeaking } from "@/lib/speech/synthesis";
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
  const { speechRate, voiceName, enableVoiceCommands } = useSettingsStore();
  const [status, setStatus] = useState<"playing" | "listening" | "idle">("idle");
  const [revealed, setRevealed] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  const progress = ((currentIndex + 1) / slides.length) * 100;

  // Check for voice commands in transcript
  const checkCommand = useCallback((transcript: string): string | null => {
    const words = transcript.toLowerCase().split(/\s+/).slice(-5);
    const text = words.join(" ");

    for (const [command, phrases] of Object.entries(COMMANDS)) {
      for (const phrase of phrases) {
        if (text.includes(phrase)) {
          return command;
        }
      }
    }
    return null;
  }, []);

  // Start speech recognition
  const startListening = useCallback(() => {
    if (!enableVoiceCommands || typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Don't start if TTS is speaking
    if (isSpeaking()) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const transcript = last[0].transcript;

        const command = checkCommand(transcript);
        if (command && last.isFinal) {
          recognition.stop();

          switch (command) {
            case "next":
              handleNext();
              break;
            case "back":
              handleBack();
              break;
            case "repeat":
              handleRepeat();
              break;
            case "reveal":
              handleReveal();
              break;
          }
        }
      };

      recognition.onend = () => {
        // Auto-restart if still in listening mode
        if (status === "listening" && !isSpeaking()) {
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
      setStatus("listening");
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
    }
  }, [enableVoiceCommands, checkCommand, status]);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Speak the slide title and start listening
  const speakTitle = useCallback(() => {
    setRevealed(false);
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

  // Initial title speak
  useEffect(() => {
    speakTitle();
    return () => {
      stop();
      stopListening();
    };
  }, [currentIndex]); // Re-run when slide changes

  const handleReveal = () => {
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
  };

  const handleRepeat = () => {
    stop();
    speakTitle();
  };

  const handleNext = () => {
    stop();
    stopListening();
    if (isLastSlide) {
      onComplete();
    } else {
      slideTransition();
      onNext();
    }
  };

  const handleBack = () => {
    stop();
    stopListening();
    onPrev();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <ProgressBar value={progress} size="lg" className="mb-6" />

      {/* Slide Info */}
      <SlideHeader
        currentSlide={currentIndex + 1}
        totalSlides={slides.length}
        title={currentSlide.title}
      />

      {/* Status */}
      <VoiceStatus status={status} />

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center mb-6">
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
      </div>

      {/* Controls */}
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
