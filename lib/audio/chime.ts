let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playSlideChime() {
  playTone(880, 0.15, "sine", 0.12);
  setTimeout(() => playTone(1100, 0.2, "sine", 0.08), 100);
}

export function playStartChime() {
  playTone(523, 0.15, "sine", 0.12);
  setTimeout(() => playTone(659, 0.15, "sine", 0.1), 120);
  setTimeout(() => playTone(784, 0.25, "sine", 0.08), 240);
}

export function playCompleteChime() {
  playTone(784, 0.2, "sine", 0.12);
  setTimeout(() => playTone(988, 0.2, "sine", 0.1), 150);
  setTimeout(() => playTone(1175, 0.35, "sine", 0.08), 300);
}
