/**
 * Audio Device Utilities
 *
 * Handles device enumeration, resolution, and output routing.
 * Device IDs rotate for privacy, so we store labels/groupIds and resolve at runtime.
 */

// Extended types for setSinkId support (Chrome 110+)
// These properties may or may not exist depending on browser support
type AudioContextWithSink = AudioContext & {
  setSinkId?: (deviceId: string) => Promise<void>;
};

type AudioElementWithSink = HTMLAudioElement & {
  setSinkId?: (deviceId: string) => Promise<void>;
};

/**
 * Check if setSinkId is supported on AudioContext (Chrome 110+)
 */
export function supportsAudioContextSinkId(): boolean {
  if (typeof window === "undefined") return false;
  const AudioContextClass = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return false;
  const ctx = new AudioContextClass();
  const supported = typeof (ctx as AudioContextWithSink).setSinkId === "function";
  ctx.close();
  return supported;
}

/**
 * Check if setSinkId is supported on HTMLAudioElement
 */
export function supportsAudioElementSinkId(): boolean {
  if (typeof window === "undefined") return false;
  const audio = document.createElement("audio");
  return typeof (audio as AudioElementWithSink).setSinkId === "function";
}

/**
 * Resolve a saved device preference (label + groupId) to a current deviceId.
 * Returns null if no match found or if preference is empty.
 */
export async function resolveDeviceId(
  kind: "audioinput" | "audiooutput",
  preferredLabel: string,
  preferredGroupId: string
): Promise<string | null> {
  if (!preferredLabel) return null;
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return null;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const matching = devices.filter(d => d.kind === kind);

    // First try exact label match
    const exactMatch = matching.find(d => d.label === preferredLabel);
    if (exactMatch) return exactMatch.deviceId;

    // Fall back to groupId match (same physical device, different browser session)
    if (preferredGroupId) {
      const groupMatch = matching.find(d => d.groupId === preferredGroupId);
      if (groupMatch) return groupMatch.deviceId;
    }

    // No match found
    return null;
  } catch (e) {
    console.warn("Failed to resolve device ID:", e);
    return null;
  }
}

/**
 * Apply speaker selection to an HTMLAudioElement via setSinkId.
 * Gracefully handles unsupported browsers.
 */
export async function applySpeakerToAudio(
  audio: HTMLAudioElement,
  preferredLabel: string,
  preferredGroupId: string
): Promise<void> {
  const audioWithSink = audio as AudioElementWithSink;
  if (typeof audioWithSink.setSinkId !== "function") return;

  const deviceId = await resolveDeviceId("audiooutput", preferredLabel, preferredGroupId);
  if (!deviceId) return;

  try {
    await audioWithSink.setSinkId(deviceId);
  } catch (e) {
    // DOMException if device not available or permission denied
    console.warn("Failed to set audio output device:", e);
  }
}

/**
 * Apply speaker selection to an AudioContext via setSinkId.
 * Gracefully handles unsupported browsers.
 */
export async function applySpeakerToContext(
  ctx: AudioContext,
  preferredLabel: string,
  preferredGroupId: string
): Promise<void> {
  const ctxWithSink = ctx as AudioContextWithSink;
  if (typeof ctxWithSink.setSinkId !== "function") return;

  const deviceId = await resolveDeviceId("audiooutput", preferredLabel, preferredGroupId);
  if (!deviceId) return;

  try {
    await ctxWithSink.setSinkId(deviceId);
  } catch (e) {
    console.warn("Failed to set AudioContext output device:", e);
  }
}

/**
 * Get audio constraints for a specific microphone device.
 * Returns constraints object for getUserMedia.
 */
export async function getMicConstraints(
  preferredLabel: string,
  preferredGroupId: string
): Promise<MediaStreamConstraints> {
  const deviceId = await resolveDeviceId("audioinput", preferredLabel, preferredGroupId);

  if (deviceId) {
    return {
      audio: {
        deviceId: { exact: deviceId },
      },
    };
  }

  // Default: use any available mic
  return { audio: true };
}

// Cached speaker preference for earcons (set from settings store)
let cachedSpeakerLabel = "";
let cachedSpeakerGroupId = "";

/**
 * Set the cached speaker preference (called from settings sync)
 */
export function setCachedSpeakerPreference(label: string, groupId: string): void {
  cachedSpeakerLabel = label;
  cachedSpeakerGroupId = groupId;
}

/**
 * Get the cached speaker preference
 */
export function getCachedSpeakerPreference(): { label: string; groupId: string } {
  return { label: cachedSpeakerLabel, groupId: cachedSpeakerGroupId };
}

// Cached mic preference
let cachedMicLabel = "";
let cachedMicGroupId = "";

/**
 * Set the cached mic preference (called from settings sync)
 */
export function setCachedMicPreference(label: string, groupId: string): void {
  cachedMicLabel = label;
  cachedMicGroupId = groupId;
}

/**
 * Get the cached mic preference
 */
export function getCachedMicPreference(): { label: string; groupId: string } {
  return { label: cachedMicLabel, groupId: cachedMicGroupId };
}

/**
 * Warm up the preferred microphone before starting SpeechRecognition.
 *
 * The Web Speech API doesn't directly support device selection, but some browsers
 * use the most recently accessed mic from getUserMedia. This function requests
 * access to the preferred device, which may help route recognition to that device.
 *
 * The returned stream should be stopped after recognition starts.
 */
export async function warmupPreferredMic(): Promise<MediaStream | null> {
  const { label, groupId } = getCachedMicPreference();
  if (!label) return null;

  try {
    const deviceId = await resolveDeviceId("audioinput", label, groupId);
    if (!deviceId) return null;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
    });
    return stream;
  } catch (e) {
    console.warn("Failed to warm up preferred mic:", e);
    return null;
  }
}

/**
 * Stop a media stream (cleanup after mic warmup)
 */
export function stopStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
