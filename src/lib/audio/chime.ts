let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainValue: number = 0.3
): void {
  try {
    const ctx = getAudioContext();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
}

export function slideTransition(): void {
  // Pleasant short chime - two notes
  playTone(880, 0.1, "sine", 0.2);
  setTimeout(() => playTone(1100, 0.15, "sine", 0.15), 100);
}

export function sessionStart(): void {
  // Ascending three-note tone
  playTone(440, 0.15, "sine", 0.2);
  setTimeout(() => playTone(550, 0.15, "sine", 0.2), 150);
  setTimeout(() => playTone(660, 0.2, "sine", 0.25), 300);
}

export function sessionComplete(): void {
  // Celebratory ascending chord
  playTone(523, 0.3, "sine", 0.2); // C
  setTimeout(() => playTone(659, 0.3, "sine", 0.2), 100); // E
  setTimeout(() => playTone(784, 0.3, "sine", 0.2), 200); // G
  setTimeout(() => playTone(1047, 0.4, "sine", 0.25), 300); // High C
}

export function errorTone(): void {
  // Low descending tone
  playTone(300, 0.2, "sawtooth", 0.15);
  setTimeout(() => playTone(200, 0.3, "sawtooth", 0.1), 150);
}

export function timerWarning(): void {
  // Quick tick sound for timer warning
  playTone(800, 0.08, "sine", 0.15);
}

export function timerExpired(): void {
  // Two-tone alert when time runs out
  playTone(600, 0.15, "triangle", 0.25);
  setTimeout(() => playTone(400, 0.2, "triangle", 0.2), 150);
}
