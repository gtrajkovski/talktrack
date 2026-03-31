/**
 * MediaSession API Integration
 *
 * Makes TalkTrack appear in car dashboards (CarPlay/Android Auto)
 * and system media controls (lock screen, notification shade).
 *
 * Shows: Talk title, slide info, play/pause/skip controls.
 * No native code required - pure Web API.
 */

export interface MediaSessionState {
  talkTitle: string;
  slideNumber: number;
  totalSlides: number;
  slideTitle: string;
  isPlaying: boolean;
  mode: "listen" | "prompt" | "test";
}

type MediaSessionHandler = () => void;

let handlers: {
  onPlay?: MediaSessionHandler;
  onPause?: MediaSessionHandler;
  onNext?: MediaSessionHandler;
  onPrev?: MediaSessionHandler;
  onStop?: MediaSessionHandler;
} = {};

/**
 * Check if MediaSession API is supported
 */
export function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

/**
 * Initialize MediaSession with action handlers
 */
export function initMediaSession(options: {
  onPlay?: MediaSessionHandler;
  onPause?: MediaSessionHandler;
  onNext?: MediaSessionHandler;
  onPrev?: MediaSessionHandler;
  onStop?: MediaSessionHandler;
}): void {
  if (!isMediaSessionSupported()) return;

  handlers = options;

  // Set action handlers
  const session = navigator.mediaSession;

  if (options.onPlay) {
    session.setActionHandler("play", options.onPlay);
  }
  if (options.onPause) {
    session.setActionHandler("pause", options.onPause);
  }
  if (options.onNext) {
    session.setActionHandler("nexttrack", options.onNext);
  }
  if (options.onPrev) {
    session.setActionHandler("previoustrack", options.onPrev);
  }
  if (options.onStop) {
    session.setActionHandler("stop", options.onStop);
  }
}

/**
 * Update MediaSession metadata (call on slide change)
 */
export function updateMediaSession(state: MediaSessionState): void {
  if (!isMediaSessionSupported()) return;

  const session = navigator.mediaSession;

  // Mode label for display
  const modeLabel = state.mode === "listen" ? "Listen" :
                    state.mode === "prompt" ? "Prompt" : "Test";

  // Set metadata
  session.metadata = new MediaMetadata({
    title: `Slide ${state.slideNumber}/${state.totalSlides}: ${state.slideTitle}`,
    artist: state.talkTitle,
    album: `TalkTrack ${modeLabel} Mode`,
    artwork: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });

  // Set playback state
  session.playbackState = state.isPlaying ? "playing" : "paused";
}

/**
 * Set playback state only (call during play/pause transitions)
 */
export function setMediaSessionPlaybackState(isPlaying: boolean): void {
  if (!isMediaSessionSupported()) return;
  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
}

/**
 * Clear MediaSession (call on session end)
 */
export function clearMediaSession(): void {
  if (!isMediaSessionSupported()) return;

  const session = navigator.mediaSession;

  // Clear metadata
  session.metadata = null;
  session.playbackState = "none";

  // Clear action handlers
  session.setActionHandler("play", null);
  session.setActionHandler("pause", null);
  session.setActionHandler("nexttrack", null);
  session.setActionHandler("previoustrack", null);
  session.setActionHandler("stop", null);

  handlers = {};
}
