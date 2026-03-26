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

// Voice command keywords - use exact word matching to avoid false positives
const COMMANDS = {
  next: ["next", "next slide", "forward", "continue", "skip", "move on", "got it"],
  back: ["back", "previous", "go back", "last slide", "before"],
  repeat: ["repeat", "again", "say that again", "one more time", "replay"],
  help: ["help", "hint", "i need help", "stuck", "i don't know"],
};

// Detect iOS for speech overlap workaround
const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export function TestMode({
  slides,
  currentIndex,
  onNext,
  onPrev,
  onComplete,
  onUsedHelp,
}: TestModeProps) {
  const { speechRate, voiceName } = useSettingsStore();
  const [status, setStatus] = useState<"playing" | "listening" | "idle" | "error">("idle");
  const [helpUsed, setHelpUsed] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCommandTimeRef = useRef(0);
  const errorRetryCountRef = useRef(0);

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  const progress = ((currentIndex + 1) / slides.length) * 100;

  // Check for voice commands - use word boundary matching to avoid false positives
  const checkCommand = useCallback((text: string): string | null => {
    // Debounce: ignore commands within 500ms of last command
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 500) return null;

    const words = text.toLowerCase().trim().split(/\s+/).slice(-5);
    const phrase = words.join(" ");

    for (const [command, phrases] of Object.entries(COMMANDS)) {
      for (const p of phrases) {
        // Use word boundary matching: phrase must end with the command phrase
        if (phrase === p || phrase.endsWith(" " + p)) {
          lastCommandTimeRef.current = now;
          return command;
        }
      }
    }
    return null;
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const handleNextRef = useRef<() => void>(() => {});
  const handleBackRef = useRef<() => void>(() => {});
  const handleRepeatRef = useRef<() => void>(() => {});
  const handleHelpRef = useRef<() => void>(() => {});

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
      setStatus("idle");
      return;
    }

    stopListening();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;
        errorRetryCountRef.current = 0; // Reset error count on successful result

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
              case "next": handleNextRef.current(); break;
              case "back": handleBackRef.current(); break;
              case "repeat": handleRepeatRef.current(); break;
              case "help": handleHelpRef.current(); break;
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
          try { recognition.start(); } catch { /* ignore */ }
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
            setStatus("error");
            setTimeout(() => {
              if (isMountedRef.current && isListeningRef.current) {
                setStatus("listening");
                startListening();
              }
            }, 2000);
          } else {
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
  }, [checkCommand, stopListening]);

  const speakPrompt = useCallback(() => {
    setHelpUsed(false);
    setTranscript("");
    stopListening();
    setStatus("playing");

    speak(`Slide ${currentIndex + 1}: ${currentSlide.title}`, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => startListening(),
    });
  }, [currentIndex, currentSlide.title, speechRate, voiceName, startListening, stopListening]);

  const handleHelp = useCallback(() => {
    stopListening();
    setHelpUsed(true);
    onUsedHelp();
    setStatus("playing");
    speak(currentSlide.notes, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => startListening(),
    });
  }, [currentSlide.notes, speechRate, voiceName, startListening, stopListening, onUsedHelp]);

  const handleRepeat = useCallback(() => { stop(); speakPrompt(); }, [speakPrompt]);

  const handleNext = useCallback(() => {
    stop();
    stopListening();
    if (isLastSlide) onComplete();
    else { slideTransition(); onNext(); }
  }, [isLastSlide, onComplete, onNext, stopListening]);

  const handleBack = useCallback(() => { stop(); stopListening(); onPrev(); }, [onPrev, stopListening]);

  handleNextRef.current = handleNext;
  handleBackRef.current = handleBack;
  handleRepeatRef.current = handleRepeat;
  handleHelpRef.current = handleHelp;

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial prompt speak on slide change
  useEffect(() => {
    speakPrompt();
    return () => { stop(); stopListening(); };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <ProgressBar value={progress} size="lg" className="mb-6" />
      <SlideHeader currentSlide={currentIndex + 1} totalSlides={slides.length} title={currentSlide.title} />
      <VoiceStatus status={status} />

      <div className="flex-1 overflow-y-auto mb-6">
        {helpUsed ? (
          <div className="bg-surface rounded-[var(--radius)] p-4">
            <div className="text-xs text-text-dim uppercase tracking-wide mb-2">Notes (help used)</div>
            <p className="text-base leading-relaxed whitespace-pre-wrap">{currentSlide.notes}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-text-dim mb-4">Recite everything from memory.<br />Say &quot;help&quot; if you get stuck.</p>
            <Button onClick={handleHelp} variant="secondary">Need Help</Button>
          </div>
        )}
        {transcript && <TranscriptScore transcript={transcript} originalNotes={currentSlide.notes} showScore={true} />}
      </div>

      <RehearsalControls onBack={handleBack} onRepeat={handleRepeat} onNext={handleNext} isFirstSlide={isFirstSlide} isLastSlide={isLastSlide} nextLabel="Got it" />
    </div>
  );
}
