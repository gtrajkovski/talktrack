"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { StateOrb } from "./StateOrb";
import { RehearsalControls } from "./RehearsalControls";
import { TranscriptScore } from "./TranscriptScore";
import { TimerOverlay } from "./TimerOverlay";
import { isSpeaking } from "@/lib/speech/synthesis";
import * as voicebox from "@/lib/speech/voicebox";
import { PlaybackIndicator } from "./PlaybackIndicator";
import * as earcons from "@/lib/audio/earcons";
import { startRecording, saveRecording, isRecordingSupported } from "@/lib/audio/recorder";
import { calculateSimilarity } from "@/lib/scoring/similarity";
import { recordSlideScore } from "@/lib/db/talks";
import { getCommands, getRecognitionLocale, matchCommand } from "@/lib/i18n/voiceCommands";
import { useSettingsStore } from "@/stores/settingsStore";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import { useEarconSync } from "@/hooks/useEarconSync";
import type { Slide } from "@/types/talk";

interface TestModeProps {
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

export function TestMode({
  slides,
  currentIndex,
  sessionId,
  talkId,
  onNext,
  onPrev,
  onComplete,
  onUsedHelp,
}: TestModeProps) {
  const { speechRate, voiceName, showTimer, timerWarningSeconds, commandLanguage } = useSettingsStore();
  const { setAudioState, setLastCommand, setTranscript: setStoreTranscript, clearTranscript } = useRehearsalStore();
  const canRecord = isRecordingSupported();
  const commands = getCommands(commandLanguage);
  const recognitionLocale = getRecognitionLocale(commandLanguage);
  const [status, setStatus] = useState<"playing" | "listening" | "idle" | "error">("idle");
  const [helpUsed, setHelpUsed] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Sync earcons with settings and play on state transitions
  useEarconSync();
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

  // Check for voice commands using localized command set
  const checkCommand = useCallback((text: string): string | null => {
    // Debounce: ignore commands within 500ms of last command
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 500) return null;

    const command = matchCommand(text, commands, "test");
    if (command) {
      lastCommandTimeRef.current = now;
      setLastCommand(command);
      earcons.commandRecognized(); // Audio feedback for command detection
      // Brief processing state
      setAudioState('processing');
      setTimeout(() => setAudioState('listening'), 200);
    }
    return command;
  }, [commands, setLastCommand, setAudioState]);

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
  const handleStopRef = useRef<() => void>(() => {});
  const handleResumeRef = useRef<() => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});

  // Start speech recognition with error recovery
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isMountedRef.current) return;

    // iOS: Don't start listening if TTS is still speaking
    if (isIOS && isSpeaking()) {
      setTimeout(() => startListeningRef.current(), 100);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("idle");
      setAudioState("idle");
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
        setStoreTranscript(fullTranscript);
        transcriptRef.current = fullTranscript;

        const last = event.results[event.results.length - 1];
        if (last.isFinal) {
          const command = checkCommand(last[0].transcript);
          if (command) {
            switch (command) {
              case "next": handleNextRef.current(); break;
              case "back": handleBackRef.current(); break;
              case "repeat": handleRepeatRef.current(); break;
              case "help": handleHelpRef.current(); break;
              case "stop": handleStopRef.current(); break;
              case "resume": handleResumeRef.current(); break;
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
            setAudioState("error");
            setTimeout(() => {
              if (isMountedRef.current && isListeningRef.current) {
                setStatus("listening");
                setAudioState("listening");
                startListeningRef.current();
              }
            }, 2000);
          } else {
            setStatus("error");
            setAudioState("error");
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      errorRetryCountRef.current = 0;
      setStatus("listening");
      setAudioState("listening");
      earcons.micOn(); // Audio feedback that mic is now active
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setStatus("error");
      setAudioState("error");
    }
  }, [checkCommand, stopListening, recognitionLocale, canRecord, setAudioState, setStoreTranscript]);

  // Update refs - use useEffect to satisfy linter (refs should be stable between renders)
  useEffect(() => {
    startListeningRef.current = startListening;
  });

  const speakPrompt = useCallback(() => {
    setHelpUsed(false);
    setTranscript("");
    clearTranscript();
    transcriptRef.current = "";
    stopListening();
    setStatus("playing");
    setAudioState("speaking");

    voicebox.play(`Slide ${currentIndex + 1}: ${currentSlide.title}`, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        setAudioState("idle");
        startListening();
      },
    });
  }, [currentIndex, currentSlide.title, speechRate, voiceName, startListening, stopListening, setAudioState, clearTranscript]);

  const handleHelp = useCallback(() => {
    stopListening();
    earcons.micOff(); // Audio feedback that mic is off for TTS
    setHelpUsed(true);
    onUsedHelp();
    setStatus("playing");
    setAudioState("speaking");
    earcons.revealAnswer();
    voicebox.play(currentSlide.notes, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        setAudioState("idle");
        startListening();
      },
    });
  }, [currentSlide.notes, speechRate, voiceName, startListening, stopListening, onUsedHelp, setAudioState]);

  const handleRepeat = useCallback(() => {
    voicebox.stop();
    earcons.repeat();
    speakPrompt();
  }, [speakPrompt]);

  const handleNext = useCallback(async () => {
    voicebox.stop();
    stopListening();
    setAudioState("idle");
    clearTranscript();

    // Calculate and record score if user spoke something
    if (transcriptRef.current) {
      const score = calculateSimilarity(currentSlide.notes, transcriptRef.current);
      await recordSlideScore(talkId, currentSlide.id, score, "test");
    }

    // Save recording before advancing
    if (canRecord) {
      await saveRecording(sessionId, talkId, currentSlide.id, currentIndex);
    }

    if (isLastSlide) onComplete();
    else { earcons.slideAdvance(); onNext(); }
  }, [isLastSlide, onComplete, onNext, stopListening, canRecord, sessionId, talkId, currentSlide.id, currentSlide.notes, currentIndex, setAudioState, clearTranscript]);

  const handleBack = useCallback(() => {
    voicebox.stop();
    stopListening();
    setAudioState("idle");
    clearTranscript();
    earcons.slideBack();
    onPrev();
  }, [onPrev, stopListening, setAudioState, clearTranscript]);

  const handleStop = useCallback(() => {
    voicebox.stop();
    stopListening();
    earcons.micOff();
    setStatus("idle");
    setAudioState("paused");
    // Keep listening for resume command only
    startListening();
  }, [stopListening, setAudioState, startListening]);

  const handleResume = useCallback(() => {
    stopListening();
    startListening();
    setStatus("listening");
    setAudioState("listening");
  }, [stopListening, startListening, setAudioState]);

  // Update refs - use useEffect to satisfy linter (refs should be stable between renders)
  useEffect(() => {
    handleNextRef.current = handleNext;
    handleBackRef.current = handleBack;
    handleRepeatRef.current = handleRepeat;
    handleHelpRef.current = handleHelp;
    handleStopRef.current = handleStop;
    handleResumeRef.current = handleResume;
  });

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial prompt speak on slide change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional TTS init
    speakPrompt();
    return () => { voicebox.stop(); stopListening(); };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <ProgressBar value={progress} size="lg" className="mb-6" />

      {/* Slide title - large and visible */}
      <h2 className="text-xl font-bold text-center mb-4 px-4">{currentSlide.title}</h2>

      {showTimer && (
        <TimerOverlay
          totalSeconds={currentSlide.estimatedSeconds}
          warningSeconds={timerWarningSeconds}
          isActive={status === "listening"}
        />
      )}

      {/* Glanceable center area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <StateOrb
          onTap={() => {
            // Toggle pause/resume
            if (status === "listening") {
              stopListening();
              setStatus("idle");
              setAudioState("paused");
            } else if (status === "idle") {
              startListening();
            }
          }}
        />

        {/* Playback progress (visible during TTS) */}
        {status === "playing" && (
          <PlaybackIndicator compact className="w-48 mt-3" />
        )}

        {/* Live transcript below orb */}
        {transcript && (
          <p className="mt-4 text-sm text-text-dim text-center max-w-xs opacity-70 transition-opacity">
            {transcript.slice(-100)}
          </p>
        )}
      </div>

      {/* Help notes or help button */}
      <div className="mb-4">
        {helpUsed ? (
          <div className="bg-surface rounded-[var(--radius)] p-4 max-h-32 overflow-y-auto">
            <div className="text-xs text-text-dim uppercase tracking-wide mb-2">Notes (help used)</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentSlide.notes}</p>
          </div>
        ) : (
          <div className="text-center">
            <Button onClick={handleHelp} variant="secondary" className="text-sm">Need Help</Button>
          </div>
        )}
        {transcript && helpUsed && <TranscriptScore transcript={transcript} originalNotes={currentSlide.notes} showScore={true} />}
      </div>

      <RehearsalControls onBack={handleBack} onRepeat={handleRepeat} onNext={handleNext} isFirstSlide={isFirstSlide} isLastSlide={isLastSlide} nextLabel="Got it" iconOnly />
    </div>
  );
}
