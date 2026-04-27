"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StateOrb } from "./StateOrb";
import { RehearsalControls } from "./RehearsalControls";
import { PlaybackIndicator } from "./PlaybackIndicator";
import { SessionTimer } from "./SessionTimer";
import { MicPermissionBanner } from "./MicPermissionBanner";
import { isSpeaking } from "@/lib/speech/synthesis";
import * as voicebox from "@/lib/speech/voicebox";
import * as earcons from "@/lib/audio/earcons";
import { getCommands, getRecognitionLocale, matchCommand } from "@/lib/i18n/voiceCommands";
import { warmupPreferredMic, stopStream, requestMicPermission } from "@/lib/audio/devices";
import { useSettingsStore } from "@/stores/settingsStore";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import { useEarconSync } from "@/hooks/useEarconSync";
import { useChunkNavigation } from "@/hooks/useChunkNavigation";
import { usePrecache } from "@/hooks/usePrecache";
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
  const {
    speechRate,
    voiceName,
    autoAdvance,
    autoAdvanceDelay,
    commandLanguage,
    useElevenLabs,
    elevenLabsApiKey,
    elevenLabsVoiceId,
    useVoiceBoxClone,
    voiceBoxCloneUrl,
    voiceBoxCloneVoiceId,
    showTimer,
  } = useSettingsStore();
  const { setAudioState, setLastCommand } = useRehearsalStore();
  const commands = getCommands(commandLanguage);
  const recognitionLocale = getRecognitionLocale(commandLanguage);
  const [status, setStatus] = useState<"playing" | "paused" | "idle" | "error">("idle");
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // Sync earcons with settings
  useEarconSync();

  // Pre-cache upcoming chunks for smoother playback
  usePrecache();

  // Chunk-aware navigation
  const {
    currentContent,
    progress: chunkProgress,
    positionLabel,
    isChunkMode,
    isLastChunk,
    isFirstChunk,
    onNextChunk,
    onPrevChunk,
    isSlideTransition,
  } = useChunkNavigation();

  // Recognition refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCommandTimeRef = useRef(0);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const micWarmupStreamRef = useRef<MediaStream | null>(null);

  // Handler refs to avoid stale closures
  const handleNextRef = useRef<() => void>(() => {});
  const handleBackRef = useRef<() => void>(() => {});
  const handleRepeatRef = useRef<() => void>(() => {});
  const handlePauseRef = useRef<() => void>(() => {});
  const handleResumeRef = useRef<() => void>(() => {});
  const handleInterruptRef = useRef<(cmd: string) => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});
  const speakContentRef = useRef<() => void>(() => {});

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  // Use chunk progress when in chunk mode, otherwise slide progress
  const progress = isChunkMode ? chunkProgress : ((currentIndex + 1) / slides.length) * 100;
  // For navigation: consider both chunk and slide boundaries
  const isAtEnd = isChunkMode ? isLastChunk : isLastSlide;
  const isAtStart = isChunkMode ? isFirstChunk : isFirstSlide;

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
    // Clean up mic warmup stream
    stopStream(micWarmupStreamRef.current);
    micWarmupStreamRef.current = null;
  }, []);

  // Start speech recognition for voice commands
  const startListening = useCallback(async () => {
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
      setStatus("error");
      setMicErrorMessage("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    stopListening();

    try {
      // Ensure we have mic permission before starting
      const permissionResult = await requestMicPermission();
      if (!permissionResult.granted) {
        setStatus("error");
        setMicPermissionGranted(false);
        setMicErrorMessage(permissionResult.error || "Microphone access denied");
        return;
      }
      // Stop the permission check stream
      stopStream(permissionResult.stream);
      setMicPermissionGranted(true);
      setMicErrorMessage(null);

      // Warm up preferred mic (may help route recognition to selected device)
      micWarmupStreamRef.current = await warmupPreferredMic();

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

        // Handle permission errors specifically
        if (e.error === "not-allowed" || e.error === "audio-capture") {
          setStatus("error");
          setMicPermissionGranted(false);
          setMicErrorMessage("Microphone access denied. Please enable microphone permission and try again.");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      earcons.micOn();
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setStatus("error");
      setMicErrorMessage("Failed to start voice recognition. Please try again.");
    }
  }, [checkCommand, stopListening, recognitionLocale]);

  // Clear auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  // Speak current content (chunk or full slide) and set up auto-advance
  const speakContent = useCallback(() => {
    clearAutoAdvanceTimer();
    setStatus("playing");
    setAudioState("speaking");

    // Use chunk content in chunk mode, otherwise full slide notes
    const textToSpeak = currentContent || currentSlide.notes;

    voicebox.play(textToSpeak, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      // TTS priority: VoiceBox Clone > ElevenLabs > Web Speech
      voiceBoxClone: useVoiceBoxClone ? {
        serverUrl: voiceBoxCloneUrl,
        voiceId: voiceBoxCloneVoiceId,
      } : undefined,
      elevenLabs: !useVoiceBoxClone && useElevenLabs ? {
        apiKey: elevenLabsApiKey,
        voiceId: elevenLabsVoiceId,
      } : undefined,
      // Barge-in: allow interrupting TTS with voice commands
      onInterrupt: (cmd) => handleInterruptRef.current(cmd),
      commandLanguage,
      onEnd: () => {
        if (!isMountedRef.current) return;
        setStatus("idle");
        setAudioState("idle");

        // Start listening for voice commands after TTS ends
        startListening();

        if (autoAdvance) {
          autoAdvanceTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;

            // In chunk mode: advance chunk first, then slide if at chunk boundary
            if (isChunkMode) {
              if (isLastChunk) {
                // All chunks done, complete the session
                onComplete();
              } else {
                // Try to advance chunk (handles earcons internally)
                const advanced = onNextChunk();
                if (advanced) {
                  // Chunk advanced successfully, speak new content after state update
                  // Use setTimeout to allow React to process the state change
                  setTimeout(() => speakContentRef.current(), 50);
                } else if (isSlideTransition("next")) {
                  // Crossed to new slide, advance slide
                  onNext();
                }
              }
            } else {
              // Slide mode: original behavior
              if (isLastSlide) {
                onComplete();
              } else {
                earcons.slideAdvance();
                onNext();
              }
            }
          }, autoAdvanceDelay * 1000);
        }
      },
    });
  }, [currentContent, currentSlide.notes, speechRate, voiceName, autoAdvance, autoAdvanceDelay, isChunkMode, isLastChunk, isLastSlide, onComplete, onNext, onNextChunk, isSlideTransition, setAudioState, clearAutoAdvanceTimer, startListening, commandLanguage]);

  const handleRepeat = useCallback(() => {
    voicebox.stop();
    stopListening();
    clearAutoAdvanceTimer();
    earcons.repeat();
    speakContent();
  }, [speakContent, stopListening, clearAutoAdvanceTimer]);

  const handleNext = useCallback(() => {
    voicebox.stop();
    stopListening();
    clearAutoAdvanceTimer();
    setAudioState("idle");

    if (isChunkMode) {
      // In chunk mode: try to advance chunk
      if (isLastChunk) {
        onComplete();
      } else {
        const advanced = onNextChunk();
        if (!advanced) {
          // Fallback to slide advance if chunk advance fails
          if (!isLastSlide) {
            earcons.slideAdvance();
            onNext();
          } else {
            onComplete();
          }
        }
      }
    } else {
      // Slide mode: original behavior
      if (isLastSlide) {
        onComplete();
      } else {
        earcons.slideAdvance();
        onNext();
      }
    }
  }, [isChunkMode, isLastChunk, isLastSlide, onComplete, onNext, onNextChunk, stopListening, clearAutoAdvanceTimer, setAudioState]);

  const handleBack = useCallback(() => {
    voicebox.stop();
    stopListening();
    clearAutoAdvanceTimer();
    setAudioState("idle");

    if (isChunkMode) {
      // In chunk mode: try to go back a chunk
      if (!isFirstChunk) {
        onPrevChunk();
      } else {
        // At first chunk, go to previous slide
        if (!isFirstSlide) {
          earcons.slideBack();
          onPrev();
        }
      }
    } else {
      // Slide mode: original behavior
      earcons.slideBack();
      onPrev();
    }
  }, [isChunkMode, isFirstChunk, isFirstSlide, onPrev, onPrevChunk, stopListening, clearAutoAdvanceTimer, setAudioState]);

  const handlePause = useCallback(() => {
    voicebox.stop();
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
    speakContent();
  }, [speakContent, stopListening]);

  // Handle barge-in (interrupt TTS with voice command)
  const handleInterrupt = useCallback((command: string) => {
    voicebox.stop();
    earcons.bargeIn();
    setLastCommand(command);

    switch (command) {
      case "next":
        handleNextRef.current();
        break;
      case "back":
        handleBackRef.current();
        break;
      case "stop":
        handlePauseRef.current();
        break;
      case "resume":
        // Already stopped TTS, just resume
        handleResumeRef.current();
        break;
      case "repeat":
        handleRepeatRef.current();
        break;
      case "bookmark": {
        const state = useRehearsalStore.getState();
        const slideId = state.talk?.slides[state.currentSlideIndex]?.id;
        if (slideId) {
          const wasAdded = state.toggleBookmark(slideId);
          if (wasAdded) earcons.bookmarkAdded(); else earcons.bookmarkRemoved();
        }
        speakContentRef.current();
        break;
      }
      case "faster":
        useRehearsalStore.getState().increaseSpeed();
        earcons.speedUp();
        speakContentRef.current();
        break;
      case "slower":
        useRehearsalStore.getState().decreaseSpeed();
        earcons.speedDown();
        speakContentRef.current();
        break;
    }
  }, [setLastCommand]);

  // Update refs - use useEffect to satisfy linter (refs should be stable between renders)
  useEffect(() => {
    handleNextRef.current = handleNext;
    handleBackRef.current = handleBack;
    handleRepeatRef.current = handleRepeat;
    handlePauseRef.current = handlePause;
    handleResumeRef.current = handleResume;
    handleInterruptRef.current = handleInterrupt;
    startListeningRef.current = startListening;
    speakContentRef.current = speakContent;
  });

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Speak slide on mount and slide change
  // Note: speakContent() sets status state which is intentional for TTS initialization
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional TTS init
    speakContent();
    return () => {
      voicebox.stop();
      stopListening();
      clearAutoAdvanceTimer();
    };
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callback for when mic permission is granted via banner
  const handleMicPermissionGranted = useCallback(() => {
    setMicPermissionGranted(true);
    setMicErrorMessage(null);
    // Re-trigger content playback which will start listening after
    speakContent();
  }, [speakContent]);

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <ProgressBar value={progress} size="lg" className="mb-6" />

      {/* Mic permission banner - shown when permission needed */}
      {!micPermissionGranted && status === "error" && (
        <MicPermissionBanner onPermissionGranted={handleMicPermissionGranted} />
      )}

      {/* Error message banner */}
      {micErrorMessage && micPermissionGranted && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mx-4 mb-4">
          <p className="text-sm text-red-400 text-center">{micErrorMessage}</p>
          <button
            onClick={() => {
              setMicErrorMessage(null);
              startListening();
            }}
            className="mt-2 w-full text-sm text-amber-400 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Slide title with position label */}
      <div className="text-center mb-4 px-4">
        <h2 className="text-xl font-bold">{currentSlide.title}</h2>
        {isChunkMode && positionLabel && (
          <p className="text-sm text-text-dim mt-1">{positionLabel}</p>
        )}
      </div>

      {/* Session timer */}
      {showTimer && (
        <div className="flex justify-center mb-4">
          <SessionTimer
            totalEstimatedSeconds={slides.reduce((sum, s) => sum + (s.estimatedSeconds || 0), 0)}
          />
        </div>
      )}

      {/* Glanceable state indicator */}
      <div className="flex justify-center mb-2">
        <StateOrb
          onTap={() => {
            console.log("[ListenMode] StateOrb tapped, current status:", status);
            // Toggle pause/resume or retry on error
            if (status === "playing") {
              handlePause();
            } else if (status === "error") {
              setMicErrorMessage(null);
              startListening();
            } else {
              handleResume();
            }
          }}
        />
      </div>

      {/* Playback progress */}
      <PlaybackIndicator showSentences className="px-4 mb-4" />

      {/* Notes Display - show current chunk in chunk mode */}
      <div className="flex-1 overflow-y-auto mb-4">
        <div className="bg-surface rounded-[var(--radius)] p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {currentContent}
          </p>
        </div>
      </div>

      {/* Controls - tap fallback for voice commands */}
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
