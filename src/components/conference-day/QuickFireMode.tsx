"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { StateOrb } from "@/components/rehearsal/StateOrb";
import { TranscriptScore } from "@/components/rehearsal/TranscriptScore";
import * as voicebox from "@/lib/speech/voicebox";
import * as earcons from "@/lib/audio/earcons";
import { calculateSimilarity } from "@/lib/scoring/similarity";
import { recordSlideScore } from "@/lib/db/talks";
import { getCommands, getRecognitionLocale, matchCommand } from "@/lib/i18n/voiceCommands";
import { useSettingsStore } from "@/stores/settingsStore";
import { useConferenceDayStore } from "@/stores/conferenceDayStore";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import type { Slide } from "@/types/talk";

interface QuickFireModeProps {
  talkId: string;
  weakSlides: Slide[];
}

const isIOS =
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export function QuickFireMode({ talkId, weakSlides }: QuickFireModeProps) {
  const router = useRouter();
  const { speechRate, voiceName, commandLanguage } = useSettingsStore();
  const { setAudioState } = useRehearsalStore();
  const {
    quickFire,
    startQuickFire,
    recordScore,
    nextSlide,
    completeQuickFire,
    getCurrentSlide,
    getProgress,
    event,
  } = useConferenceDayStore();

  const commands = getCommands(commandLanguage);
  const recognitionLocale = getRecognitionLocale(commandLanguage);

  const [status, setStatus] = useState<"playing" | "listening" | "idle">("idle");
  const [transcript, setTranscript] = useState("");
  const [showScore, setShowScore] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const transcriptRef = useRef("");

  const currentSlide = getCurrentSlide();
  const progress = getProgress();

  // Initialize quick-fire session
  useEffect(() => {
    if (!quickFire && weakSlides.length > 0) {
      // Limit to 10 slides for speed
      const limitedSlides = weakSlides.slice(0, 10);
      startQuickFire(limitedSlides);
    }
  }, [weakSlides, quickFire, startQuickFire]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      voicebox.stop();
      stopListening();
    };
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const handleComplete = useCallback(async () => {
    stopListening();
    voicebox.stop();
    await completeQuickFire();

    voicebox.play("Quick-fire complete. You're ready.", {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        router.push(`/talk/${talkId}/conference-day`);
      },
    });
  }, [completeQuickFire, router, talkId, speechRate, voiceName, stopListening]);

  const handleNext = useCallback(async () => {
    stopListening();
    setShowScore(false);
    setLastScore(null);

    // Record score if user spoke something
    if (transcriptRef.current && currentSlide) {
      const score = calculateSimilarity(currentSlide.notes, transcriptRef.current);
      setLastScore(score);
      setShowScore(true);
      recordScore(currentSlide.id, score);
      await recordSlideScore(talkId, currentSlide.id, score, "test");

      // Brief feedback
      earcons.slideAdvance();
    }

    setTranscript("");
    transcriptRef.current = "";

    // Move to next or complete
    const hasMore = nextSlide();
    if (!hasMore) {
      setTimeout(handleComplete, 500);
    }
  }, [currentSlide, talkId, recordScore, nextSlide, handleComplete, stopListening]);

  const checkCommand = useCallback(
    (text: string): string | null => {
      const command = matchCommand(text, commands, "test");
      if (command) {
        earcons.commandRecognized();
        setAudioState("processing");
        setTimeout(() => setAudioState("listening"), 200);
      }
      return command;
    },
    [commands, setAudioState]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isMountedRef.current) return;
    if (isIOS && voicebox.getIsPlaying()) {
      setTimeout(startListening, 100);
      return;
    }

    stopListening();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("idle");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLocale;

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;

        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
        transcriptRef.current = fullTranscript;

        const last = event.results[event.results.length - 1];
        if (last.isFinal) {
          const command = checkCommand(last[0].transcript);
          if (command === "next" || command === "done") {
            handleNext();
          }
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && isMountedRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.onerror = (e) => {
        if (e.error === "aborted" || e.error === "no-speech") return;
        console.warn("Speech recognition error:", e.error);
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setStatus("listening");
      setAudioState("listening");
      earcons.micOn();
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setStatus("idle");
    }
  }, [checkCommand, handleNext, recognitionLocale, stopListening, setAudioState]);

  const speakPrompt = useCallback(() => {
    setTranscript("");
    setShowScore(false);
    transcriptRef.current = "";
    stopListening();
    setStatus("playing");
    setAudioState("speaking");

    if (!currentSlide) return;

    const promptText = `Slide ${progress.current}: ${currentSlide.title}`;

    voicebox.play(promptText, {
      rate: speechRate * 1.1, // Slightly faster for quick-fire
      voiceName: voiceName || undefined,
      onEnd: () => {
        setAudioState("idle");
        startListening();
      },
    });
  }, [currentSlide, progress, speechRate, voiceName, startListening, stopListening, setAudioState]);

  // Speak prompt when slide changes
  useEffect(() => {
    if (currentSlide && quickFire) {
      speakPrompt();
    }
  }, [quickFire?.currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // No weak slides - show encouragement
  if (weakSlides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">All Slides Mastered!</h2>
        <p className="text-text-dim mb-6">
          No weak slides to review. You&apos;re well prepared!
        </p>
        <Button onClick={() => router.back()}>Back</Button>
      </div>
    );
  }

  if (!currentSlide || !quickFire) {
    return (
      <div className="flex items-center justify-center h-64 text-text-dim">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 py-6">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-text-dim mb-2">
          <span>Quick-Fire Review</span>
          <span>
            {progress.current} of {progress.total}
          </span>
        </div>
        <ProgressBar
          value={(progress.current / progress.total) * 100}
          size="lg"
        />
      </div>

      {/* Slide title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">{currentSlide.title}</h2>
      </div>

      {/* Center area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <StateOrb
          onTap={() => {
            if (status === "listening") {
              handleNext();
            } else if (status === "idle") {
              startListening();
            }
          }}
        />

        {/* Live transcript */}
        {transcript && (
          <p className="mt-4 text-sm text-text-dim text-center max-w-xs opacity-70">
            {transcript.slice(-100)}
          </p>
        )}

        {/* Score feedback */}
        {showScore && lastScore !== null && (
          <div className="mt-4">
            <TranscriptScore
              transcript={transcript}
              originalNotes={currentSlide.notes}
              showScore={true}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 mt-6">
        <Button
          variant="secondary"
          onClick={() => {
            stopListening();
            voicebox.stop();
            router.back();
          }}
          className="flex-1"
        >
          Exit
        </Button>
        <Button onClick={handleNext} className="flex-1">
          Next
        </Button>
      </div>
    </div>
  );
}
