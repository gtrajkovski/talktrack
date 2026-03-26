import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Talk, Slide } from "@/types/talk";
import type { RehearsalSession, RehearsalMode, SlideAttempt } from "@/types/session";
import * as sessionsDB from "@/lib/db/sessions";
import * as talksDB from "@/lib/db/talks";

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

  // Actions
  startSession: (talk: Talk, mode: RehearsalMode) => Promise<void>;
  endSession: () => Promise<void>;

  // Navigation
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;

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
}

export const useRehearsalStore = create<RehearsalState>((set, get) => ({
  session: null,
  talk: null,
  currentSlideIndex: 0,
  isPlaying: false,
  isPaused: false,
  currentAttempt: null,

  startSession: async (talk: Talk, mode: RehearsalMode) => {
    const session: RehearsalSession = {
      id: nanoid(),
      talkId: talk.id,
      mode,
      startedAt: Date.now(),
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

  nextSlide: () => {
    const { talk, currentSlideIndex, session, currentAttempt } = get();
    if (!talk || !session) return;

    // Save current attempt if exists
    if (currentAttempt) {
      session.attempts.push(currentAttempt);
      session.slidesCompleted = currentSlideIndex + 1;
      sessionsDB.updateSession(session);
    }

    if (currentSlideIndex < talk.slides.length - 1) {
      set({
        currentSlideIndex: currentSlideIndex + 1,
        currentAttempt: null,
        isPlaying: false,
      });
    }
  },

  prevSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({
        currentSlideIndex: currentSlideIndex - 1,
        currentAttempt: null,
        isPlaying: false,
      });
    }
  },

  goToSlide: (index: number) => {
    const { talk } = get();
    if (!talk) return;
    if (index >= 0 && index < talk.slides.length) {
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
}));
