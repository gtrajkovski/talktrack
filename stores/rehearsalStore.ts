import { create } from "zustand";
import type { Talk, Slide } from "@/types/talk";
import type { SlideAttempt } from "@/types/session";

export type RehearsalMode = "listen" | "prompt" | "test";
export type RehearsalStatus =
  | "idle"
  | "playing"
  | "waiting"
  | "revealed"
  | "complete";

interface RehearsalState {
  talk: Talk | null;
  mode: RehearsalMode;
  currentSlideIndex: number;
  status: RehearsalStatus;
  startedAt: number;
  attempts: SlideAttempt[];

  // Actions
  startRehearsal: (talk: Talk, mode: RehearsalMode) => void;
  setStatus: (status: RehearsalStatus) => void;
  nextSlide: () => boolean; // returns false if at end
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  recordAttempt: (attempt: SlideAttempt) => void;
  currentSlide: () => Slide | null;
  reset: () => void;
}

export const useRehearsalStore = create<RehearsalState>((set, get) => ({
  talk: null,
  mode: "listen",
  currentSlideIndex: 0,
  status: "idle",
  startedAt: 0,
  attempts: [],

  startRehearsal: (talk, mode) => {
    set({
      talk,
      mode,
      currentSlideIndex: 0,
      status: "idle",
      startedAt: Date.now(),
      attempts: [],
    });
  },

  setStatus: (status) => set({ status }),

  nextSlide: () => {
    const { currentSlideIndex, talk } = get();
    if (!talk) return false;
    if (currentSlideIndex >= talk.slides.length - 1) {
      set({ status: "complete" });
      return false;
    }
    set({ currentSlideIndex: currentSlideIndex + 1, status: "idle" });
    return true;
  },

  prevSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1, status: "idle" });
    }
  },

  goToSlide: (index) => {
    const { talk } = get();
    if (talk && index >= 0 && index < talk.slides.length) {
      set({ currentSlideIndex: index, status: "idle" });
    }
  },

  recordAttempt: (attempt) => {
    set({ attempts: [...get().attempts, attempt] });
  },

  currentSlide: () => {
    const { talk, currentSlideIndex } = get();
    return talk?.slides[currentSlideIndex] ?? null;
  },

  reset: () => {
    set({
      talk: null,
      mode: "listen",
      currentSlideIndex: 0,
      status: "idle",
      startedAt: 0,
      attempts: [],
    });
  },
}));
