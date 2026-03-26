"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { SlideHeader } from "./SlideHeader";
import { VoiceStatus } from "./VoiceStatus";
import { RehearsalControls } from "./RehearsalControls";
import { TranscriptScore } from "./TranscriptScore";
import { speak, stop, isSpeaking } from "@/lib/speech/synthesis";
import { slideTransition } from "@/lib/audio/chime";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Slide } from "@/types/talk";

interface TestModeProps {
  slides: Slide[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  onUsedHelp: () => void;
}

// Voice command keywords
const COMMANDS = {
  next: ["next", "next slide", "forward", "continue", "skip", "move on", "got it"],
  back: ["back", "previous", "go back", "last slide", "before"],
  repeat: ["repeat", "again", "say that again", "one more time", "replay"],
  help: ["help", "hint", "i need help", "stuck", "i don't know"],
};

export function TestMode({
  slides,
  currentIndex,
  onNext,
  onPrev,
  onComplete,
  onUsedHelp,
}: TestModeProps) {
  const { speechRate, voiceName, enableVoiceCommands } = useSettingsStore();
  const [status, setStatus] = useState<"playing" | "listening" | "idle">("idle");
  const [helpUsed, setHelpUsed] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
        // Build full transcript from all results
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);

        const last = event.results[event.results.length - 1];
        const command = checkCommand(last[0].transcript);
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
            case "help":
              handleHelp();
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

  // Speak the slide number and title, then start listening
  const speakPrompt = useCallback(() => {
    setHelpUsed(false);
    setTranscript("");
    stopListening();
    setStatus("playing");

    const prompt = `Slide ${currentIndex + 1}: ${currentSlide.title}`;
    speak(prompt, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        startListening();
      },
    });
  }, [currentIndex, currentSlide.title, speechRate, voiceName, startListening, stopListening]);

  // Initial prompt speak
  useEffect(() => {
    speakPrompt();
    return () => {
      stop();
      stopListening();
    };
  }, [currentIndex]); // Re-run when slide changes

  const handleHelp = () => {
    stopListening();
    setHelpUsed(true);
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
    speakPrompt();
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
      <div className="flex-1 overflow-y-auto mb-6">
        {helpUsed ? (
          <div className="bg-surface rounded-[var(--radius)] p-4">
            <div className="text-xs text-text-dim uppercase tracking-wide mb-2">
              Notes (help used)
            </div>
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {currentSlide.notes}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-text-dim mb-4">
              Recite everything from memory.<br />
              Say &quot;help&quot; if you get stuck.
            </p>
            <Button onClick={handleHelp} variant="secondary">
              Need Help
            </Button>
          </div>
        )}

        {/* Show transcript and score - always show score in test mode */}
        {transcript && (
          <TranscriptScore
            transcript={transcript}
            originalNotes={currentSlide.notes}
            showScore={true}
          />
        )}
      </div>

      {/* Controls */}
      <RehearsalControls
        onBack={handleBack}
        onRepeat={handleRepeat}
        onNext={handleNext}
        isFirstSlide={isFirstSlide}
        isLastSlide={isLastSlide}
        nextLabel="Got it"
      />
    </div>
  );
}
