let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(
  text: string,
  opts?: { rate?: number; voiceName?: string; onEnd?: () => void }
): void {
  stop();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = opts?.rate ?? 0.95;
  utterance.pitch = 1;

  if (opts?.voiceName) {
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((v) => v.name === opts.voiceName);
    if (voice) utterance.voice = voice;
  }

  if (opts?.onEnd) {
    utterance.onend = opts.onEnd;
  }

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

export function stop(): void {
  speechSynthesis.cancel();
  currentUtterance = null;
}

export function pause(): void {
  speechSynthesis.pause();
}

export function resume(): void {
  speechSynthesis.resume();
}

export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}
