/**
 * Earcon Feedback System
 *
 * Provides distinct audio confirmation for every state change in voice-first UX.
 * All sounds generated programmatically via Web Audio API (no mp3 files).
 * Each earcon is ≤300ms, non-intrusive, and tonally distinct.
 */

let audioContext: AudioContext | null = null;
let globalVolume = 0.3;
let enabled = true;

/**
 * Check if earcons should play based on settings and reduced motion preference
 */
function shouldPlay(): boolean {
  if (!enabled) return false;
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
}

/**
 * Get or create AudioContext with iOS resume handling
 */
function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Resume if suspended (iOS requires user gesture to activate)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Helper to play a single tone with exponential decay
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue: number = 0.3
): void {
  try {
    const ctx = getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(gainValue * globalVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Earcon playback failed:', e);
  }
}

// ============================================================================
// VOLUME & ENABLE CONTROLS
// ============================================================================

/**
 * Set master volume (0-1)
 */
export function setVolume(vol: number): void {
  globalVolume = Math.max(0, Math.min(1, vol));
}

/**
 * Get current volume level
 */
export function getVolume(): number {
  return globalVolume;
}

/**
 * Enable or disable all earcons
 */
export function setEnabled(value: boolean): void {
  enabled = value;
}

/**
 * Check if earcons are enabled
 */
export function isEnabled(): boolean {
  return enabled;
}

// ============================================================================
// EARCON FUNCTIONS
// ============================================================================

/**
 * Slide advance - quick rising two-note chime
 * C5 (523Hz) → E5 (659Hz)
 */
export function slideAdvance(): void {
  if (!shouldPlay()) return;
  playTone(523, 0.1, 'sine', 0.7);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.6), 80);
}

/**
 * Slide back - quick falling two-note (reverse of advance)
 * E5 (659Hz) → C5 (523Hz)
 */
export function slideBack(): void {
  if (!shouldPlay()) return;
  playTone(659, 0.1, 'sine', 0.7);
  setTimeout(() => playTone(523, 0.12, 'sine', 0.6), 80);
}

/**
 * Mic on - soft single ping when recognition starts
 * G5 (784Hz), gentle attack
 */
export function micOn(): void {
  if (!shouldPlay()) return;
  playTone(784, 0.1, 'sine', 0.5);
}

/**
 * Mic off - same pitch as micOn but quieter, fast decay
 * G5 (784Hz)
 */
export function micOff(): void {
  if (!shouldPlay()) return;
  playTone(784, 0.06, 'sine', 0.25);
}

/**
 * Command recognized - crisp short click/tick
 * White noise burst, 30ms
 */
export function commandRecognized(): void {
  if (!shouldPlay()) return;
  try {
    const ctx = getContext();
    const bufferSize = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise with quick decay envelope
    for (let i = 0; i < bufferSize; i++) {
      const envelope = 1 - (i / bufferSize); // Linear decay
      data[i] = (Math.random() * 2 - 1) * 0.3 * envelope;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(globalVolume * 0.5, ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
  } catch (e) {
    console.warn('Earcon playback failed:', e);
  }
}

/**
 * Reveal answer - descending gentle three-note
 * G5 (784Hz) → E5 (659Hz) → C5 (523Hz)
 */
export function revealAnswer(): void {
  if (!shouldPlay()) return;
  playTone(784, 0.1, 'sine', 0.5);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.5), 100);
  setTimeout(() => playTone(523, 0.15, 'sine', 0.5), 200);
}

/**
 * Error retry - two quick low pops
 * C4 (262Hz) double tap
 */
export function errorRetry(): void {
  if (!shouldPlay()) return;
  playTone(262, 0.08, 'sine', 0.4);
  setTimeout(() => playTone(262, 0.08, 'sine', 0.4), 120);
}

/**
 * Session start - ascending arpeggio
 * C4 (262Hz) → E4 (330Hz) → G4 (392Hz) → C5 (523Hz)
 */
export function sessionStart(): void {
  if (!shouldPlay()) return;
  playTone(262, 0.12, 'sine', 0.5);
  setTimeout(() => playTone(330, 0.12, 'sine', 0.5), 120);
  setTimeout(() => playTone(392, 0.12, 'sine', 0.5), 240);
  setTimeout(() => playTone(523, 0.18, 'sine', 0.6), 360);
}

/**
 * Session complete - warm major chord swell
 * C4 + E4 + G4 played together with fade
 */
export function sessionComplete(): void {
  if (!shouldPlay()) return;
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // Play chord with slight stagger for warmth
    [262, 330, 392].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = freq;
      osc.type = 'sine';

      // Swell envelope: quiet → loud → fade
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(globalVolume * 0.4, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.02); // Slight stagger
      osc.stop(now + 0.7);
    });
  } catch (e) {
    console.warn('Earcon playback failed:', e);
  }
}

/**
 * High score - bright sparkle for ≥85% similarity
 * C5 → E5 → G5 → C6, fast ascending, triangle wave
 */
export function highScore(): void {
  if (!shouldPlay()) return;
  playTone(523, 0.08, 'triangle', 0.4);
  setTimeout(() => playTone(659, 0.08, 'triangle', 0.4), 60);
  setTimeout(() => playTone(784, 0.08, 'triangle', 0.4), 120);
  setTimeout(() => playTone(1047, 0.15, 'triangle', 0.5), 180);
}

/**
 * Repeat - neutral single ping
 * E5 (659Hz), 80ms
 */
export function repeat(): void {
  if (!shouldPlay()) return;
  playTone(659, 0.12, 'sine', 0.5);
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

export const earcons = {
  setVolume,
  getVolume,
  setEnabled,
  isEnabled,
  slideAdvance,
  slideBack,
  micOn,
  micOff,
  commandRecognized,
  revealAnswer,
  errorRetry,
  sessionStart,
  sessionComplete,
  highScore,
  repeat,
};

export default earcons;
