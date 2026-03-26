type SpeechCallback = () => void;

let currentUtterance: SpeechSynthesisUtterance | null = null;
let onEndCallback: SpeechCallback | null = null;

// Common abbreviations that shouldn't trigger sentence breaks
const ABBREVIATIONS = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Inc|Ltd|Corp|vs|etc|e\.g|i\.e|al|St|Rd|Ave|Blvd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.$/i;

/**
 * Split text into sentences for TTS, avoiding breaks on abbreviations.
 * Handles: "Dr. Smith said hello. He was happy." -> ["Dr. Smith said hello.", "He was happy."]
 */
function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [text];

  const sentences: string[] = [];
  let current = "";

  // Split on sentence-ending punctuation followed by space
  const parts = text.split(/([.!?]+\s+)/);

  for (let i = 0; i < parts.length; i++) {
    current += parts[i];

    // Check if this part ends with sentence-ending punctuation + space
    if (/[.!?]+\s+$/.test(parts[i])) {
      // Check if previous content ends with an abbreviation
      const contentBeforePunc = current.replace(/[.!?]+\s+$/, "");
      if (!ABBREVIATIONS.test(contentBeforePunc)) {
        sentences.push(current.trim());
        current = "";
      }
    }
  }

  // Add any remaining text
  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences.length > 0 ? sentences : [text];
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined") return [];
  return speechSynthesis.getVoices();
}

export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
  });
}

export function speak(
  text: string,
  options: {
    rate?: number;
    voiceName?: string;
    onEnd?: SpeechCallback;
  } = {}
): void {
  if (typeof window === "undefined") return;

  // Cancel any current speech
  stop();

  const { rate = 0.95, voiceName, onEnd } = options;

  // Break long text into sentences to avoid Chrome Android bug
  // Use smarter splitting that avoids breaking on abbreviations (Dr., Mr., etc.)
  const sentences = splitIntoSentences(text);

  let sentenceIndex = 0;

  const speakNextSentence = () => {
    if (sentenceIndex >= sentences.length) {
      currentUtterance = null;
      onEndCallback = null;
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[sentenceIndex].trim());
    utterance.rate = rate;

    if (voiceName) {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find((v) => v.name === voiceName);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      sentenceIndex++;
      speakNextSentence();
    };

    utterance.onerror = (e) => {
      // Ignore "interrupted" and "canceled" errors - these are expected when stopping
      const error = e as SpeechSynthesisErrorEvent;
      if (error.error === "interrupted" || error.error === "canceled") {
        return;
      }
      console.warn("Speech synthesis error:", error.error);
      currentUtterance = null;
      onEndCallback = null;
      // Still call onEnd so the app can continue
      onEnd?.();
    };

    currentUtterance = utterance;
    onEndCallback = onEnd || null;
    speechSynthesis.speak(utterance);
  };

  speakNextSentence();
}

export function stop(): void {
  if (typeof window === "undefined") return;
  speechSynthesis.cancel();
  currentUtterance = null;
  onEndCallback = null;
}

export function pause(): void {
  if (typeof window === "undefined") return;
  speechSynthesis.pause();
}

export function resume(): void {
  if (typeof window === "undefined") return;
  speechSynthesis.resume();
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return speechSynthesis.speaking;
}

export function isPaused(): boolean {
  if (typeof window === "undefined") return false;
  return speechSynthesis.paused;
}
