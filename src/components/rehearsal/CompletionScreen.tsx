"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import * as earcons from "@/lib/audio/earcons";
import { speak, stop, isSpeaking } from "@/lib/speech/synthesis";
import { updateStreak } from "@/lib/db/streaks";
import { getCommands, getRecognitionLocale, matchCommand } from "@/lib/i18n/voiceCommands";
import { useSettingsStore } from "@/stores/settingsStore";
import { generateCoachingFeedback, type CoachingFeedback } from "@/lib/ai/coach";
import type { RehearsalSession } from "@/types/session";
import type { Talk } from "@/types/talk";

const COMPLETION_MESSAGES = [
  "Great work! You're getting better with each run.",
  "Nice job! Practice makes perfect.",
  "Well done! Keep up the momentum.",
];

// Detect iOS for speech overlap workaround
const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

interface CompletionScreenProps {
  talkId: string;
  talkTitle: string;
  slidesCompleted: number;
  mode: string;
  session?: RehearsalSession | null;
  talk?: Talk | null;
  elapsedSeconds?: number;
}

export function CompletionScreen({
  talkId,
  talkTitle,
  slidesCompleted,
  mode,
  session,
  talk,
  elapsedSeconds = 0,
}: CompletionScreenProps) {
  const router = useRouter();
  const { commandLanguage, enableAiCoach, aiApiKey, aiProvider } = useSettingsStore();
  const commands = getCommands(commandLanguage);
  const recognitionLocale = getRecognitionLocale(commandLanguage);

  const [streak, setStreak] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<CoachingFeedback | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);

  // Recognition refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCommandTimeRef = useRef(0);
  const silencePromptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startListeningRef = useRef<() => void>(() => {});

  // Check for voice commands
  const checkCommand = useCallback((text: string): string | null => {
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 500) return null;

    const command = matchCommand(text, commands, "completion");
    if (command) {
      lastCommandTimeRef.current = now;
      earcons.commandRecognized();
    }
    return command;
  }, [commands]);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    if (silencePromptTimerRef.current) {
      clearTimeout(silencePromptTimerRef.current);
      silencePromptTimerRef.current = null;
    }
  }, []);

  // Handle "again" command - restart rehearsal
  const handleAgain = useCallback(() => {
    stopListening();
    stop();
    router.push(`/talk/${talkId}/rehearse?mode=${mode}`);
  }, [router, talkId, mode, stopListening]);

  // Handle "done" command - exit to talk detail
  const handleDone = useCallback(() => {
    stopListening();
    stop();
    router.push(`/talk/${talkId}`);
  }, [router, talkId, stopListening]);

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

        // Reset silence timer on any result
        if (silencePromptTimerRef.current) {
          clearTimeout(silencePromptTimerRef.current);
        }

        const last = event.results[event.results.length - 1];
        if (last.isFinal) {
          const command = checkCommand(last[0].transcript);
          if (command === "again") {
            handleAgain();
          } else if (command === "done") {
            handleDone();
          }
        }

        // Set up new silence timer
        silencePromptTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && isListeningRef.current) {
            // Gentle prompt after 30 seconds of silence
            speak("Say again to practice more, or done to finish.", {
              rate: 0.9,
              onEnd: () => {
                if (isMountedRef.current) startListeningRef.current();
              },
            });
          }
        }, 30000);
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
        if (e.error === "aborted" || e.error === "no-speech") return;
        console.warn("Speech recognition error:", e.error);
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
      earcons.micOn();

      // Initial silence timer
      silencePromptTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && isListeningRef.current) {
          speak("Say again to practice more, or done to finish.", {
            rate: 0.9,
            onEnd: () => {
              if (isMountedRef.current) startListeningRef.current();
            },
          });
        }
      }, 30000);
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
    }
  }, [checkCommand, stopListening, recognitionLocale, handleAgain, handleDone]);

  // Update ref after startListening is defined (use useEffect to satisfy linter)
  useEffect(() => {
    startListeningRef.current = startListening;
  });

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch AI Coach feedback if enabled
  useEffect(() => {
    if (!enableAiCoach || !session || !talk) return;
    // Only for prompt/test modes (not listen mode which has no attempts)
    if (mode === "listen") return;

    // For BYOK providers, require an API key
    if (aiProvider !== "free" && !aiApiKey) return;

    setIsLoadingCoach(true);
    generateCoachingFeedback(session, talk, elapsedSeconds, {
      provider: aiProvider,
      apiKey: aiApiKey || undefined,
    })
      .then((feedback) => {
        if (isMountedRef.current) {
          setCoachFeedback(feedback);
        }
      })
      .catch((err) => {
        console.warn("AI Coach error:", err);
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoadingCoach(false);
        }
      });
  }, [enableAiCoach, session, talk, elapsedSeconds, aiApiKey, aiProvider, mode]);

  // Speak AI Coach feedback when it arrives (after initial TTS)
  const coachSpokenRef = useRef(false);
  useEffect(() => {
    if (!coachFeedback?.spokenFeedback || coachSpokenRef.current) return;
    coachSpokenRef.current = true;

    // Wait a bit for any current TTS to finish, then speak coach feedback
    const timer = setTimeout(() => {
      if (isMountedRef.current && !isSpeaking()) {
        earcons.coachStart?.();
        speak(coachFeedback.spokenFeedback, {
          rate: 0.95,
          onEnd: () => {
            if (isMountedRef.current) {
              startListeningRef.current();
            }
          },
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [coachFeedback]);

  // Initial setup: earcon, streak, TTS, then start listening
  useEffect(() => {
    // Play completion earcon
    earcons.sessionComplete();

    // Update streak
    updateStreak().then(setStreak);

    // Speak encouragement, then voice prompt, then start listening
    const message = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
    setTimeout(() => {
      speak(message, {
        rate: 0.95,
        onEnd: () => {
          // After encouragement, give voice options and start listening
          setTimeout(() => {
            speak("Say again to rehearse again, or done to finish.", {
              rate: 0.9,
              onEnd: () => {
                // Start listening for voice commands
                setTimeout(() => {
                  if (isMountedRef.current) {
                    startListeningRef.current();
                  }
                }, 300);
              },
            });
          }, 500);
        },
      });
    }, 800);

    return () => {
      stop();
      stopListening();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-bg">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">Done!</div>
        <h1 className="text-2xl font-extrabold mb-2">Rehearsal Complete</h1>
        <p className="text-text-dim">{talkTitle}</p>
      </div>

      <Card className="w-full max-w-sm mb-8">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold">{slidesCompleted}</div>
            <div className="text-sm text-text-dim">Slides</div>
          </div>
          <div>
            <div className="text-3xl font-bold capitalize">{mode}</div>
            <div className="text-sm text-text-dim">Mode</div>
          </div>
        </div>
        {streak >= 2 && (
          <div className="mt-4 pt-4 border-t border-surface-light text-center">
            <span className="text-accent font-bold">{streak}-day streak!</span>
          </div>
        )}
      </Card>

      {/* AI Coach Feedback */}
      {isLoadingCoach && (
        <Card className="w-full max-w-sm mb-4">
          <div className="text-center text-text-dim text-sm">
            <div className="animate-pulse">Getting AI coaching feedback...</div>
          </div>
        </Card>
      )}
      {coachFeedback && (
        <Card className="w-full max-w-sm mb-4">
          <div className="text-sm">
            <p className="text-text mb-3">{coachFeedback.summary}</p>
            {coachFeedback.strengths.length > 0 && (
              <div className="mb-2">
                <span className="text-success font-medium">Strengths: </span>
                <span className="text-text-dim">{coachFeedback.strengths.join(", ")}</span>
              </div>
            )}
            {coachFeedback.improvements.length > 0 && (
              <div>
                <span className="text-accent font-medium">Work on: </span>
                <span className="text-text-dim">{coachFeedback.improvements.join(", ")}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Voice status indicator */}
      {isListening && (
        <div className="mb-6 flex items-center gap-2 text-sm text-text-dim">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>Listening... say &quot;again&quot; or &quot;done&quot;</span>
        </div>
      )}

      {/* Tap buttons as fallback */}
      <div className="w-full max-w-sm space-y-3">
        <Button onClick={handleAgain}>Practice Again</Button>
        <Button variant="secondary" onClick={handleDone}>Back to Talk</Button>
      </div>
    </div>
  );
}
