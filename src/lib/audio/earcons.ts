/**
 * Earcon Feedback System
 *
 * Provides distinct audio confirmation for every state change in voice-first UX.
 * All sounds generated programmatically via Web Audio API (no mp3 files).
 * Each earcon is ≤300ms, non-intrusive, and tonally distinct.
 */

import { getCachedSpeakerPreference, applySpeakerToContext } from "./devices";

let audioContext: AudioContext | null = null;
let globalVolume = 0.3;
let enabled = true;
let speakerApplied = false;

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
 * Get or create AudioContext with iOS resume handling and speaker routing
 */
function getContext(): AudioContext | null {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    speakerApplied = false;
  }
  // Resume if suspended (iOS requires user gesture to activate)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  // Apply speaker preference (async, but we don't wait - it applies for future sounds)
  if (!speakerApplied && audioContext) {
    speakerApplied = true;
    const { label, groupId } = getCachedSpeakerPreference();
    if (label) {
      applySpeakerToContext(audioContext, label, groupId).catch(() => {
        // Ignore errors - fallback to default speaker
      });
    }
  }
  return audioContext;
}

/**
 * Force refresh of speaker routing (call when settings change)
 */
export function refreshSpeakerRouting(): void {
  speakerApplied = false;
  // Next getContext() call will re-apply speaker preference
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
    if (!ctx) return;
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
    if (!ctx) return;
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
    if (!ctx) return;
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

/**
 * Speed up - quick ascending two-note chirp
 * A4 (440Hz) → D5 (587Hz)
 */
export function speedUp(): void {
  if (!shouldPlay()) return;
  playTone(440, 0.08, 'triangle', 0.4);
  setTimeout(() => playTone(587, 0.1, 'triangle', 0.5), 60);
}

/**
 * Speed down - quick descending two-note chirp
 * D5 (587Hz) → A4 (440Hz)
 */
export function speedDown(): void {
  if (!shouldPlay()) return;
  playTone(587, 0.08, 'triangle', 0.4);
  setTimeout(() => playTone(440, 0.1, 'triangle', 0.5), 60);
}

/**
 * Navigation jump - whoosh effect for first/last/goto
 * Quick frequency sweep
 */
export function navigationJump(): void {
  if (!shouldPlay()) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3 * globalVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn('Earcon playback failed:', e);
  }
}

/**
 * Info query - gentle ping before speaking info
 * B4 (494Hz), soft
 */
export function infoQuery(): void {
  if (!shouldPlay()) return;
  playTone(494, 0.1, 'sine', 0.3);
}

/**
 * Volume up - ascending tone
 * C5 (523Hz), short
 */
export function volumeUp(): void {
  if (!shouldPlay()) return;
  playTone(523, 0.1, 'sine', 0.4);
}

/**
 * Volume down - descending tone
 * G4 (392Hz), short
 */
export function volumeDown(): void {
  if (!shouldPlay()) return;
  playTone(392, 0.1, 'sine', 0.4);
}

/**
 * Mute/unmute toggle - double click
 * Two quick tones
 */
export function muteToggle(): void {
  if (!shouldPlay()) return;
  playTone(440, 0.05, 'sine', 0.3);
  setTimeout(() => playTone(440, 0.05, 'sine', 0.3), 80);
}

/**
 * Bookmark added - positive chirp
 * G4 → B4 ascending
 */
export function bookmarkAdded(): void {
  if (!shouldPlay()) return;
  playTone(392, 0.08, 'triangle', 0.4);
  setTimeout(() => playTone(494, 0.12, 'triangle', 0.5), 60);
}

/**
 * Bookmark removed - descending chirp
 * B4 → G4 descending
 */
export function bookmarkRemoved(): void {
  if (!shouldPlay()) return;
  playTone(494, 0.08, 'triangle', 0.4);
  setTimeout(() => playTone(392, 0.1, 'triangle', 0.4), 60);
}

/**
 * Paragraph break - subtle G4 tone for paragraph transitions
 * Single soft tone indicating paragraph boundary
 */
export function paragraphBreak(): void {
  if (!shouldPlay()) return;
  playTone(392, 0.15, 'sine', 0.25);
}

/**
 * Sentence advance - very subtle tick for sentence progression
 * Quick soft ping
 */
export function sentenceAdvance(): void {
  if (!shouldPlay()) return;
  playTone(587, 0.06, 'sine', 0.2);
}

/**
 * Mode change - distinctive two-tone indicating granularity switch
 * D5 → A5 ascending
 */
export function modeChange(): void {
  if (!shouldPlay()) return;
  playTone(587, 0.08, 'triangle', 0.35);
  setTimeout(() => playTone(880, 0.1, 'triangle', 0.4), 70);
}

/**
 * Dead air nudge - gentle double-tap to prompt user during silence
 * A3 (220Hz), quiet, two quick taps
 */
export function deadAirNudge(): void {
  if (!shouldPlay()) return;
  playTone(220, 0.06, 'sine', 0.15);
  setTimeout(() => playTone(220, 0.06, 'sine', 0.15), 100);
}

/**
 * Level up - ascending C-E-G arpeggio for SR box promotion
 * Celebratory feel when mastering a slide
 */
export function levelUp(): void {
  if (!shouldPlay()) return;
  playTone(523, 0.1, 'triangle', 0.4);   // C5
  setTimeout(() => playTone(659, 0.1, 'triangle', 0.4), 80);   // E5
  setTimeout(() => playTone(784, 0.15, 'triangle', 0.5), 160); // G5
}

/**
 * Level down - descending G-C for SR box demotion
 * Gentle indication to keep practicing
 */
export function levelDown(): void {
  if (!shouldPlay()) return;
  playTone(392, 0.1, 'sine', 0.3);  // G4
  setTimeout(() => playTone(262, 0.12, 'sine', 0.3), 100); // C4
}

/**
 * On pace - single soft tone for timing checkpoint
 * B4 (494Hz), very gentle
 */
export function onPace(): void {
  if (!shouldPlay()) return;
  playTone(494, 0.15, 'sine', 0.2);
}

/**
 * Barge-in success - quick double-tap indicating TTS was interrupted
 * F4 (349Hz) double tap, faster than errorRetry, distinct pitch
 */
export function bargeIn(): void {
  if (!shouldPlay()) return;
  playTone(349, 0.05, 'triangle', 0.4);
  setTimeout(() => playTone(349, 0.05, 'triangle', 0.4), 60);
}

/**
 * Coach start - warm, friendly tone that says "here's your coach"
 * Two ascending notes with a soft attack — distinct from level-up (which is a celebration)
 * A3 → C#4 (warm major third)
 */
export function coachStart(): void {
  if (!shouldPlay()) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Warm major third: A3 → C#4
    [220, 277.2].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; // Softer than sine
      osc.frequency.value = freq;
      const offset = i * 0.15;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.1 * globalVolume, now + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.35);
    });
  } catch (e) {
    console.warn('Earcon playback failed:', e);
  }
}

/**
 * Exercise start - warm rising two-note for warm-up exercises
 * F4 (349Hz) → A4 (440Hz) - anticipation feeling
 */
export function exerciseStart(): void {
  if (!shouldPlay()) return;
  playTone(349, 0.12, 'triangle', 0.4);
  setTimeout(() => playTone(440, 0.15, 'triangle', 0.5), 100);
}

/**
 * Breathing tone - sustained soft sine for breath sync
 * Returns stop function to allow caller to end the tone
 * @param frequency - Hz (default 220 = A3, calming low tone)
 */
export function breathingTone(frequency: number = 220): () => void {
  if (!shouldPlay()) {
    return () => {};
  }

  try {
    const ctx = getContext();
    if (!ctx) return () => {};
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    // Very soft, ambient volume
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08 * globalVolume, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    // Return stop function
    return () => {
      try {
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.stop(now + 0.35);
      } catch {
        // Ignore errors when stopping
      }
    };
  } catch (e) {
    console.warn('Earcon playback failed:', e);
    return () => {};
  }
}

/**
 * Exercise complete - light celebration arpeggio
 * G4 (392Hz) → B4 (494Hz) → D5 (587Hz)
 */
export function exerciseComplete(): void {
  if (!shouldPlay()) return;
  playTone(392, 0.1, 'triangle', 0.4);
  setTimeout(() => playTone(494, 0.1, 'triangle', 0.4), 80);
  setTimeout(() => playTone(587, 0.15, 'triangle', 0.5), 160);
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

export const earcons = {
  setVolume,
  getVolume,
  setEnabled,
  isEnabled,
  refreshSpeakerRouting,
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
  speedUp,
  speedDown,
  navigationJump,
  infoQuery,
  volumeUp,
  volumeDown,
  muteToggle,
  bookmarkAdded,
  bookmarkRemoved,
  paragraphBreak,
  sentenceAdvance,
  modeChange,
  deadAirNudge,
  levelUp,
  levelDown,
  onPace,
  bargeIn,
  coachStart,
  exerciseStart,
  breathingTone,
  exerciseComplete,
};

export default earcons;
