/**
 * Barge-In Controller
 *
 * Enables users to interrupt TTS playback with voice commands.
 * Keeps speech recognition running during TTS on supported platforms.
 * Falls back to turn-based approach on iOS (cannot run both simultaneously).
 */

import { getCommands, matchCommand, type CommandLanguage, type VoiceCommandSet } from "../i18n/voiceCommands";

// Module state
let currentTTSText = "";
let recognition: SpeechRecognition | null = null;
let onInterruptCallback: ((command: string) => void) | null = null;
let isBargeInActive = false;
let lastCommandTime = 0;

// Commands that can interrupt TTS (short, unambiguous)
const INTERRUPT_COMMAND_NAMES = [
  "stop", "next", "back", "resume",
  "repeat", "reveal", "help", "bookmark",
  "faster", "slower",
] as const;
type InterruptCommand = typeof INTERRUPT_COMMAND_NAMES[number];

// Constants
const COMMAND_DEBOUNCE_MS = 500;
const ECHO_SIMILARITY_THRESHOLD = 0.6;

/**
 * Check if the platform supports barge-in (simultaneous TTS + recognition)
 * iOS Safari cannot run speech synthesis and recognition simultaneously
 */
export function canBargeIn(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;

  // iOS detection - cannot run TTS and recognition simultaneously
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return false;
  }

  // Check for SpeechRecognition support
  const SpeechRecognition = window.SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return false;
  }

  return true;
}

/**
 * Normalize text for comparison (lowercase, remove punctuation)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if spoken text is likely an echo of the TTS audio
 * (mic picking up speaker output)
 */
export function isEchoOfTTS(spokenText: string): boolean {
  if (!currentTTSText) return false;

  const normalizedTTS = normalizeText(currentTTSText);
  const normalizedSpoken = normalizeText(spokenText);

  if (!normalizedSpoken || !normalizedTTS) return false;

  const ttsWords = normalizedTTS.split(" ");
  const spokenWords = normalizedSpoken.split(" ");

  if (spokenWords.length === 0) return false;

  // Check if spoken words appear in TTS text in sequence
  let matches = 0;
  let ttsIndex = 0;

  for (const word of spokenWords) {
    // Skip very short words that could be noise
    if (word.length < 2) continue;

    while (ttsIndex < ttsWords.length) {
      if (ttsWords[ttsIndex] === word) {
        matches++;
        ttsIndex++;
        break;
      }
      ttsIndex++;
    }
  }

  // If >60% of spoken words match TTS in order, it's likely echo
  const meaningfulWords = spokenWords.filter(w => w.length >= 2).length;
  if (meaningfulWords === 0) return false;

  const matchRatio = matches / meaningfulWords;
  return matchRatio >= ECHO_SIMILARITY_THRESHOLD;
}

/**
 * Match against interrupt-only commands (subset used during TTS)
 */
function matchInterruptCommand(
  phrase: string,
  commands: VoiceCommandSet
): InterruptCommand | null {
  const normalizedPhrase = phrase.toLowerCase().trim();
  // Use only last 3 words for interrupt commands (they're short)
  const words = normalizedPhrase.split(/\s+/).slice(-3);
  const lastWords = words.join(" ");

  for (const commandName of INTERRUPT_COMMAND_NAMES) {
    const phrases = commands[commandName];
    if (!phrases) continue;

    for (const p of phrases) {
      const normalizedCommand = p.toLowerCase();
      if (lastWords === normalizedCommand || lastWords.endsWith(" " + normalizedCommand)) {
        return commandName;
      }
    }
  }

  return null;
}

/**
 * Start barge-in recognition during TTS playback
 *
 * @param ttsText - The text being spoken by TTS (for echo rejection)
 * @param language - Command language for matching
 * @param onInterrupt - Callback when an interrupt command is detected
 */
export function startBargeIn(
  ttsText: string,
  language: CommandLanguage,
  onInterrupt: (command: string) => void
): void {
  if (!canBargeIn()) return;

  // Stop any existing barge-in session
  stopBargeIn();

  currentTTSText = ttsText;
  onInterruptCallback = onInterrupt;
  isBargeInActive = true;

  const commands = getCommands(language);

  const SpeechRecognition = window.SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

  if (!SpeechRecognition) return;

  try {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "en" ? "en-US" :
                       language === "mk" ? "mk-MK" :
                       language === "sq" ? "sq-AL" : "it-IT";

    recognition.onresult = (event) => {
      if (!isBargeInActive) return;

      // Get the latest result
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult) return;

      const transcript = lastResult[0].transcript;
      console.log("[barge-in] heard:", transcript, lastResult.isFinal ? "(final)" : "(interim)");

      // Check for echo (mic picking up TTS audio)
      if (isEchoOfTTS(transcript)) {
        console.log("[barge-in] rejected as echo");
        return;
      }

      // Debounce commands
      const now = Date.now();
      if (now - lastCommandTime < COMMAND_DEBOUNCE_MS) return;

      // Check for interrupt command
      // Process both interim and final results for faster response
      const command = matchInterruptCommand(transcript, commands);
      console.log("[barge-in] command match:", command);
      if (command && onInterruptCallback) {
        console.log("[barge-in] executing:", command);
        lastCommandTime = now;
        onInterruptCallback(command);
      }
    };

    recognition.onerror = (event) => {
      // Ignore common non-fatal errors
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      console.warn("Barge-in recognition error:", event.error);
    };

    recognition.onend = () => {
      // Auto-restart if still active
      if (isBargeInActive && recognition) {
        try {
          recognition.start();
        } catch {
          // Ignore restart errors
        }
      }
    };

    recognition.start();
    console.log("[barge-in] started listening during TTS");
  } catch (error) {
    console.warn("Failed to start barge-in recognition:", error);
    isBargeInActive = false;
    recognition = null;
  }
}

/**
 * Stop barge-in recognition
 */
export function stopBargeIn(): void {
  isBargeInActive = false;

  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Ignore stop errors
    }
    recognition = null;
  }

  currentTTSText = "";
  onInterruptCallback = null;
}

/**
 * Check if barge-in is currently active
 */
export function isActive(): boolean {
  return isBargeInActive;
}

/**
 * Get the current TTS text (for debugging/testing)
 */
export function getCurrentTTSText(): string {
  return currentTTSText;
}
