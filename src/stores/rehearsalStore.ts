import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Talk, Slide } from "@/types/talk";
import type { RehearsalSession, RehearsalMode, SlideAttempt } from "@/types/session";
import * as sessionsDB from "@/lib/db/sessions";
import * as talksDB from "@/lib/db/talks";

// Audio state for multimodal sync
export type AudioState = 'idle' | 'speaking' | 'listening' | 'processing' | 'paused' | 'error';

interface RehearsalState {
  // Current session
  session: RehearsalSession | null;
  talk: Talk | null;

  // Playback state
  currentSlideIndex: number;
  isPlaying: boolean;
  isPaused: boolean;

  // Current attempt tracking
  currentAttempt: SlideAttempt | null;

  // Multimodal state sync
  audioState: AudioState;
  lastCommand: string | null;
  lastCommandTimestamp: number | null;
  currentTranscript: string;
  isSpeechSupported: boolean;

  // Actions
  startSession: (talk: Talk, mode: RehearsalMode) => Promise<void>;
  resumeSession: (session: RehearsalSession, talk: Talk) => Promise<void>;
  endSession: () => Promise<void>;

  // Navigation
  nextSlide: () => Promise<void>;
  prevSlide: () => Promise<void>;
  goToSlide: (index: number) => Promise<void>;

  // Playback
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;

  // Attempt tracking
  startAttempt: () => void;
  recordAttempt: (data: Partial<SlideAttempt>) => void;
  markUsedHelp: () => void;

  // Getters
  getCurrentSlide: () => Slide | null;
  getProgress: () => number;
  isLastSlide: () => boolean;
  isFirstSlide: () => boolean;

  // Multimodal state sync actions
  setAudioState: (state: AudioState) => void;
  setLastCommand: (command: string) => void;
  setTranscript: (text: string) => void;
  clearTranscript: () => void;
  setSpeechSupported: (supported: boolean) => void;
}

export const useRehearsalStore = create<RehearsalState>((set, get) => ({
  session: null,
  talk: null,
  currentSlideIndex: 0,
  isPlaying: false,
  isPaused: false,
  currentAttempt: null,

  // Multimodal state sync initial values
  audioState: 'idle',
  lastCommand: null,
  lastCommandTimestamp: null,
  currentTranscript: '',
  isSpeechSupported: true,

  startSession: async (talk: Talk, mode: RehearsalMode) => {
    const session: RehearsalSession = {
      id: nanoid(),
      talkId: talk.id,
      mode,
      startedAt: Date.now(),
      currentSlideIndex: 0,
      slidesCompleted: 0,
      totalSlides: talk.slides.length,
      attempts: [],
    };

    await sessionsDB.createSession(session);
    await talksDB.incrementRehearsalCount(talk.id);

    set({
      session,
      talk,
      currentSlideIndex: 0,
      isPlaying: false,
      isPaused: false,
      currentAttempt: null,
    });
  },

  resumeSession: async (session: RehearsalSession, talk: Talk) => {
    // Clear any paused timestamp since we're resuming
    session.pausedAt = undefined;
    await sessionsDB.updateSession(session);

    set({
      session,
      talk,
      currentSlideIndex: session.currentSlideIndex,
      isPlaying: false,
      isPaused: false,
      currentAttempt: null,
    });
  },

  endSession: async () => {
    const { session } = get();
    if (session) {
      session.completedAt = Date.now();
      await sessionsDB.updateSession(session);
    }
    set({
      session: null,
      talk: null,
      currentSlideIndex: 0,
      isPlaying: false,
      isPaused: false,
      currentAttempt: null,
    });
  },

  nextSlide: async () => {
    const { talk, currentSlideIndex, session, currentAttempt } = get();
    if (!talk || !session) return;

    // Save current attempt if exists - await to prevent data loss on quick navigation
    if (currentAttempt) {
      session.attempts.push(currentAttempt);
      session.slidesCompleted = currentSlideIndex + 1;
    }

    if (currentSlideIndex < talk.slides.length - 1) {
      const newIndex = currentSlideIndex + 1;
      session.currentSlideIndex = newIndex;
      await sessionsDB.updateSession(session);

      set({
        currentSlideIndex: newIndex,
        currentAttempt: null,
        isPlaying: false,
      });
    } else if (currentAttempt) {
      // Last slide - just save the attempt
      await sessionsDB.updateSession(session);
    }
  },

  prevSlide: async () => {
    const { currentSlideIndex, session } = get();
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      if (session) {
        session.currentSlideIndex = newIndex;
        await sessionsDB.updateSession(session);
      }
      set({
        currentSlideIndex: newIndex,
        currentAttempt: null,
        isPlaying: false,
      });
    }
  },

  goToSlide: async (index: number) => {
    const { talk, session } = get();
    if (!talk) return;
    if (index >= 0 && index < talk.slides.length) {
      if (session) {
        session.currentSlideIndex = index;
        await sessionsDB.updateSession(session);
      }
      set({
        currentSlideIndex: index,
        currentAttempt: null,
        isPlaying: false,
      });
    }
  },

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setPaused: (paused: boolean) => set({ isPaused: paused }),

  startAttempt: () => {
    const { talk, currentSlideIndex } = get();
    if (!talk) return;

    const slide = talk.slides[currentSlideIndex];
    set({
      currentAttempt: {
        slideId: slide.id,
        slideIndex: currentSlideIndex,
        usedHelp: false,
      },
    });
  },

  recordAttempt: (data: Partial<SlideAttempt>) => {
    const { currentAttempt } = get();
    if (currentAttempt) {
      set({
        currentAttempt: { ...currentAttempt, ...data },
      });
    }
  },

  markUsedHelp: () => {
    const { currentAttempt } = get();
    if (currentAttempt) {
      set({
        currentAttempt: { ...currentAttempt, usedHelp: true },
      });
    }
  },

  getCurrentSlide: () => {
    const { talk, currentSlideIndex } = get();
    if (!talk) return null;
    return talk.slides[currentSlideIndex] || null;
  },

  getProgress: () => {
    const { talk, currentSlideIndex } = get();
    if (!talk || talk.slides.length === 0) return 0;
    return ((currentSlideIndex + 1) / talk.slides.length) * 100;
  },

  isLastSlide: () => {
    const { talk, currentSlideIndex } = get();
    if (!talk) return false;
    return currentSlideIndex === talk.slides.length - 1;
  },

  isFirstSlide: () => {
    const { currentSlideIndex } = get();
    return currentSlideIndex === 0;
  },

  // Multimodal state sync actions
  setAudioState: (audioState: AudioState) => set({ audioState }),

  setLastCommand: (command: string) => set({
    lastCommand: command,
    lastCommandTimestamp: Date.now(),
  }),

  setTranscript: (currentTranscript: string) => set({ currentTranscript }),

  clearTranscript: () => set({ currentTranscript: '' }),

  setSpeechSupported: (isSpeechSupported: boolean) => set({ isSpeechSupported }),
}));
