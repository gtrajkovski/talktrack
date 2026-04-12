/**
 * Audience Simulation
 *
 * Generates ambient crowd sounds to simulate real presentation conditions.
 * All sounds generated programmatically via Web Audio API.
 * Includes: background murmur, occasional coughs, paper shuffling.
 */

import { getCachedSpeakerPreference, applySpeakerToContext } from "./devices";

let audioContext: AudioContext | null = null;
let isRunning = false;
let murmurNode: AudioBufferSourceNode | null = null;
let murmurGain: GainNode | null = null;
let eventInterval: NodeJS.Timeout | null = null;
let masterVolume = 0.15; // Keep audience quiet by default
let speakerApplied = false;

/**
 * Get or create AudioContext
 */
function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    speakerApplied = false;
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  // Apply speaker preference
  if (!speakerApplied && audioContext) {
    speakerApplied = true;
    const { label, groupId } = getCachedSpeakerPreference();
    if (label) {
      applySpeakerToContext(audioContext, label, groupId).catch(() => {});
    }
  }
  return audioContext;
}

/**
 * Generate pink noise buffer (more natural sounding than white noise)
 */
function createPinkNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  // Pink noise algorithm (Paul Kellet's refined method)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

/**
 * Create low-frequency murmur from filtered noise
 */
function startMurmur(): void {
  const ctx = getContext();

  // Create pink noise buffer (loop every 3 seconds)
  const buffer = createPinkNoiseBuffer(ctx, 3);

  // Source node (looping)
  murmurNode = ctx.createBufferSource();
  murmurNode.buffer = buffer;
  murmurNode.loop = true;

  // Low-pass filter to create murmur effect
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 400;
  lowpass.Q.value = 1;

  // Bandpass to emphasize "voice-like" frequencies
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 250;
  bandpass.Q.value = 0.5;

  // Gain control
  murmurGain = ctx.createGain();
  murmurGain.gain.value = masterVolume * 0.3;

  // Connect: source -> lowpass -> bandpass -> gain -> output
  murmurNode.connect(lowpass);
  lowpass.connect(bandpass);
  bandpass.connect(murmurGain);
  murmurGain.connect(ctx.destination);

  murmurNode.start();
}

/**
 * Play a cough sound
 */
function playCough(): void {
  const ctx = getContext();

  // Cough is a burst of filtered noise
  const duration = 0.15 + Math.random() * 0.1;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate burst with quick attack and decay
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    const envelope = Math.sin(t * Math.PI); // Quick rise and fall
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Bandpass for cough-like sound
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800 + Math.random() * 400;
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.value = masterVolume * (0.2 + Math.random() * 0.15);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start();
}

/**
 * Play paper shuffle sound
 */
function playPaperShuffle(): void {
  const ctx = getContext();

  const duration = 0.3 + Math.random() * 0.2;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // High-frequency filtered noise with multiple bursts
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    // Multiple small bursts
    const burst1 = Math.exp(-(((t - 0.2) * 20) ** 2));
    const burst2 = Math.exp(-(((t - 0.5) * 25) ** 2));
    const burst3 = Math.exp(-(((t - 0.8) * 20) ** 2));
    const envelope = burst1 + burst2 * 0.7 + burst3 * 0.5;
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // High-pass for paper-like crinkle
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 2000;

  const gain = ctx.createGain();
  gain.gain.value = masterVolume * 0.08;

  source.connect(highpass);
  highpass.connect(gain);
  gain.connect(ctx.destination);

  source.start();
}

/**
 * Play chair creak
 */
function playChairCreak(): void {
  const ctx = getContext();

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.1);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(masterVolume * 0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

/**
 * Schedule random audience events (coughs, shuffles, etc.)
 */
function startRandomEvents(): void {
  const scheduleNext = () => {
    if (!isRunning) return;

    // Random interval between 3-12 seconds
    const delay = 3000 + Math.random() * 9000;

    eventInterval = setTimeout(() => {
      if (!isRunning) return;

      // Pick a random event
      const eventType = Math.random();
      if (eventType < 0.4) {
        playCough();
      } else if (eventType < 0.7) {
        playPaperShuffle();
      } else {
        playChairCreak();
      }

      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

/**
 * Start audience simulation
 */
export function start(): void {
  if (isRunning) return;
  if (typeof window === "undefined") return;

  isRunning = true;
  startMurmur();
  startRandomEvents();
}

/**
 * Stop audience simulation
 */
export function stop(): void {
  isRunning = false;

  if (murmurNode) {
    try {
      murmurNode.stop();
    } catch {
      // Ignore
    }
    murmurNode = null;
  }

  if (murmurGain) {
    murmurGain = null;
  }

  if (eventInterval) {
    clearTimeout(eventInterval);
    eventInterval = null;
  }
}

/**
 * Set audience volume (0-1)
 */
export function setVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol));
  if (murmurGain) {
    murmurGain.gain.value = masterVolume * 0.3;
  }
}

/**
 * Get current volume
 */
export function getVolume(): number {
  return masterVolume;
}

/**
 * Check if simulation is running
 */
export function isActive(): boolean {
  return isRunning;
}
