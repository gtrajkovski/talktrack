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
import { useChunkNavigation } from "@/hooks/useChunkNavigation";
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

// Exponential backoff delays for error recovery (module-level to avoid dependency issues)
const ERROR_RETRY_DELAYS = [500, 1000, 2000, 4000];
const SILENCE_NUDGE_DELAY = 15000; // 15 seconds before nudge

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
  const { setAudioState, setLastCommand, setTranscript: setStoreTranscript, clearTranscript } = useRehearsalStore();
  const canRecord = isRecordingSupported();
  const commands = getCommands(commandLanguage);
  const recognitionLocale = getRecognitionLocale(commandLanguage);
  const [status, setStatus] = useState<"playing" | "listening" | "idle" | "error">("idle");
  const [revealed, setRevealed] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Sync earcons with settings and play on state transitions
  useEarconSync();

  // Chunk-aware navigation
  const {
    currentContent,
    currentCue,
    currentLabel,
    progress: chunkProgress,
    positionLabel,
    isChunkMode,
    isLastChunk,
    isFirstChunk,
    onNextChunk,
    onPrevChunk,
    granularity,
  } = useChunkNavigation();

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCommandTimeRef = useRef(0);
  const errorRetryCountRef = useRef(0);
  const transcriptRef = useRef("");
  const silenceNudgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceNudgeShownRef = useRef(false); // Only show once per slide

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  const progress = isChunkMode ? chunkProgress : ((currentIndex + 1) / slides.length) * 100;
  const isAtEnd = isChunkMode ? isLastChunk : isLastSlide;
  const isAtStart = isChunkMode ? isFirstChunk : isFirstSlide;

  // Check for voice commands in transcript using localized command set
  const checkCommand = useCallback((text: string): string | null => {
    // Debounce: ignore commands within 500ms of last command
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 500) return null;

    const command = matchCommand(text, commands, "prompt");
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
  const handleStopRef = useRef<() => void>(() => {});
  const handleResumeRef = useRef<() => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});

  // Start speech recognition with error recovery
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isMountedRef.current) return;

    // iOS: Don't start listening if TTS is still speaking (300ms buffer)
    if (isIOS && isSpeaking()) {
      setTimeout(() => startListeningRef.current(), 300);
      return;
    }

    // Clear and reset silence nudge timer
    if (silenceNudgeTimerRef.current) {
      clearTimeout(silenceNudgeTimerRef.current);
    }
    silenceNudgeTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && isMountedRef.current && !silenceNudgeShownRef.current) {
        silenceNudgeShownRef.current = true;
        earcons.errorRetry();
        voicebox.play("Still listening — take your time, or say next to move on", {
          rate: 0.9,
          onEnd: () => {
            if (isMountedRef.current) startListeningRef.current();
          },
        });
      }
    }, SILENCE_NUDGE_DELAY);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
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
              case "stop":
                handleStopRef.current();
                break;
              case "resume":
                handleResumeRef.current();
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
        if (e.error === "network" || e.error === "service-not-allowed" || e.error === "audio-capture") {
          const retryIndex = Math.min(errorRetryCountRef.current, ERROR_RETRY_DELAYS.length - 1);
          const delay = ERROR_RETRY_DELAYS[retryIndex];
          errorRetryCountRef.current++;

          if (errorRetryCountRef.current <= 4) {
            // Retry with exponential backoff
            setStatus("error");
            setAudioState("error");
            setTimeout(() => {
              if (isMountedRef.current && isListeningRef.current) {
                setStatus("listening");
                setAudioState("listening");
                startListeningRef.current();
              }
            }, delay);
          } else {
            // Too many errors, stay in error state
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

  // Speak the prompt (cue, label, or title based on granularity) and start listening
  const speakPrompt = useCallback(() => {
    setRevealed(false);
    setTranscript("");
    clearTranscript();
    transcriptRef.current = "";
    stopListening();
    setStatus("playing");
    setAudioState("speaking");

    // Determine what to speak based on granularity
    let promptText: string;
    if (granularity === "sentence" && currentCue) {
      promptText = currentCue;  // First 3 words as cue
    } else if (granularity === "paragraph" && currentLabel) {
      promptText = `${currentSlide.title}, ${currentLabel}`;  // "Title, Paragraph 1"
    } else {
      promptText = currentSlide.title;  // Slide mode: full title
    }

    voicebox.play(promptText, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        setAudioState("idle");
        startListening();
      },
    });
  }, [currentSlide.title, currentCue, currentLabel, granularity, speechRate, voiceName, startListening, stopListening, setAudioState, clearTranscript]);

  const handleReveal = useCallback(() => {
    stopListening();
    earcons.micOff(); // Audio feedback that mic is off for TTS
    setRevealed(true);
    onUsedHelp();
    setStatus("playing");
    setAudioState("speaking");
    earcons.revealAnswer();

    // Reveal current chunk content in chunk mode, otherwise full notes
    const revealText = isChunkMode ? currentContent : currentSlide.notes;

    voicebox.play(revealText, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        setAudioState("idle");
        startListening();
      },
    });
  }, [currentSlide.notes, currentContent, isChunkMode, speechRate, voiceName, startListening, stopListening, onUsedHelp, setAudioState]);

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
    const contentToScore = isChunkMode ? currentContent : currentSlide.notes;
    if (transcriptRef.current) {
      const score = calculateSimilarity(contentToScore, transcriptRef.current);
      await recordSlideScore(talkId, currentSlide.id, score, "prompt");
    }

    // Save recording before advancing
    if (canRecord) {
      await saveRecording(sessionId, talkId, currentSlide.id, currentIndex);
    }

    if (isChunkMode) {
      if (isLastChunk) {
        onComplete();
      } else {
        onNextChunk();
      }
    } else {
      if (isLastSlide) {
        onComplete();
      } else {
        earcons.slideAdvance();
        onNext();
      }
    }
  }, [isChunkMode, isLastChunk, isLastSlide, onComplete, onNext, onNextChunk, stopListening, canRecord, sessionId, talkId, currentSlide.id, currentSlide.notes, currentContent, currentIndex, setAudioState, clearTranscript]);

  const handleBack = useCallback(() => {
    voicebox.stop();
    stopListening();
    setAudioState("idle");
    clearTranscript();

    if (isChunkMode && !isFirstChunk) {
      onPrevChunk();
    } else {
      earcons.slideBack();
      onPrev();
    }
  }, [isChunkMode, isFirstChunk, onPrev, onPrevChunk, stopListening, setAudioState, clearTranscript]);

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
    handleRevealRef.current = handleReveal;
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

  // Initial title speak on slide change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional TTS init
    speakPrompt();
    return () => {
      voicebox.stop();
      stopListening();
    };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <ProgressBar value={progress} size="lg" className="mb-6" />

      {/* Slide title with position label */}
      <div className="text-center mb-4 px-4">
        <h2 className="text-xl font-bold">{currentSlide.title}</h2>
        {isChunkMode && positionLabel && (
          <p className="text-sm text-text-dim mt-1">{positionLabel}</p>
        )}
      </div>

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

      {/* Revealed notes or reveal button */}
      <div className="mb-4">
        {revealed ? (
          <div className="bg-surface rounded-[var(--radius)] p-4 max-h-32 overflow-y-auto">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {isChunkMode ? currentContent : currentSlide.notes}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <Button onClick={handleReveal} variant="secondary" className="text-sm">
              Reveal Answer
            </Button>
          </div>
        )}

        {transcript && revealed && (
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
        isFirstSlide={isAtStart}
        isLastSlide={isAtEnd}
        iconOnly
      />
    </div>
  );
}
