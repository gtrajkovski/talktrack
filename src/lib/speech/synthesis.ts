type SpeechCallback = () => void;

let currentUtterance: SpeechSynthesisUtterance | null = null;
let onEndCallback: SpeechCallback | null = null;

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
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

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
