import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Slide } from "@/types/talk";
import type {
  ConferenceEvent,
  ConferenceReflection,
  QuickFireSession,
  ConferenceDayPhase,
} from "@/types/conferenceDay";
import * as db from "@/lib/db/conferenceEvents";

interface ConferenceDayState {
  // Event state
  event: ConferenceEvent | null;
  talkId: string | null;

  // Phase tracking
  phase: ConferenceDayPhase;

  // Quick-fire state
  quickFire: QuickFireSession | null;
  weakSlides: Slide[];

  // Actions
  createEvent: (talkId: string, scheduledAt: number) => Promise<void>;
  loadEvent: (talkId: string) => Promise<boolean>;
  updateTime: (scheduledAt: number) => Promise<void>;

  // Quick-fire actions
  startQuickFire: (slides: Slide[]) => void;
  recordScore: (slideId: string, score: number) => void;
  nextSlide: () => boolean;
  completeQuickFire: () => Promise<void>;

  // Activity completion
  markBreathingComplete: () => Promise<void>;
  submitReflection: (
    rating: ConferenceReflection["rating"],
    notes?: string
  ) => Promise<void>;

  // Cleanup
  clearEvent: () => void;

  // Getters
  getPhase: () => ConferenceDayPhase;
  getTimeUntilTalk: () => number;
  getCurrentSlide: () => Slide | null;
  getProgress: () => { current: number; total: number };
}

export const useConferenceDayStore = create<ConferenceDayState>((set, get) => ({
  // Initial state
  event: null,
  talkId: null,
  phase: "setup",
  quickFire: null,
  weakSlides: [],

  createEvent: async (talkId: string, scheduledAt: number) => {
    const event: ConferenceEvent = {
      id: nanoid(),
      talkId,
      scheduledAt,
      createdAt: Date.now(),
      status: "upcoming",
      quickFireCompleted: false,
      breathingCompleted: false,
    };

    await db.createEvent(event);

    set({
      event,
      talkId,
      phase: "countdown",
    });
  },

  loadEvent: async (talkId: string) => {
    const event = await db.getEventForTalk(talkId);
    if (event && event.status === "upcoming") {
      const now = Date.now();
      const timeUntil = event.scheduledAt - now;

      // Determine phase based on time
      let phase: ConferenceDayPhase = "countdown";
      if (timeUntil <= 0) {
        phase = "reflect";
      } else if (timeUntil <= 5 * 60 * 1000) {
        phase = "go-time";
      }

      set({
        event,
        talkId,
        phase,
      });
      return true;
    }
    return false;
  },

  updateTime: async (scheduledAt: number) => {
    const { event } = get();
    if (!event) return;

    const updated = { ...event, scheduledAt };
    await db.updateEvent(updated);
    set({ event: updated, phase: "countdown" });
  },

  startQuickFire: (slides: Slide[]) => {
    const slideIds = slides.map((s) => s.id);
    set({
      weakSlides: slides,
      quickFire: {
        slideIds,
        currentIndex: 0,
        scores: [],
      },
    });
  },

  recordScore: (slideId: string, score: number) => {
    const { quickFire } = get();
    if (!quickFire) return;

    set({
      quickFire: {
        ...quickFire,
        scores: [...quickFire.scores, { slideId, score }],
      },
    });
  },

  nextSlide: () => {
    const { quickFire } = get();
    if (!quickFire) return false;

    const nextIndex = quickFire.currentIndex + 1;
    if (nextIndex >= quickFire.slideIds.length) {
      return false;
    }

    set({
      quickFire: {
        ...quickFire,
        currentIndex: nextIndex,
      },
    });
    return true;
  },

  completeQuickFire: async () => {
    const { event } = get();
    if (!event) return;

    const updated = { ...event, quickFireCompleted: true };
    await db.updateEvent(updated);
    set({
      event: updated,
      quickFire: null,
      weakSlides: [],
    });
  },

  markBreathingComplete: async () => {
    const { event } = get();
    if (!event) return;

    const updated = { ...event, breathingCompleted: true };
    await db.updateEvent(updated);
    set({ event: updated });
  },

  submitReflection: async (
    rating: ConferenceReflection["rating"],
    notes?: string
  ) => {
    const { event } = get();
    if (!event) return;

    const reflection: ConferenceReflection = {
      rating,
      notes,
      recordedAt: Date.now(),
    };

    await db.completeEvent(event.id, reflection);

    const updated = { ...event, status: "completed" as const, reflection };
    set({ event: updated, phase: "reflect" });
  },

  clearEvent: () => {
    set({
      event: null,
      talkId: null,
      phase: "setup",
      quickFire: null,
      weakSlides: [],
    });
  },

  getPhase: () => {
    const { event, phase } = get();
    if (!event) return "setup";

    const now = Date.now();
    const timeUntil = event.scheduledAt - now;

    if (event.status === "completed") return "reflect";
    if (timeUntil <= 0) return "reflect";
    if (timeUntil <= 5 * 60 * 1000) return "go-time";
    return phase;
  },

  getTimeUntilTalk: () => {
    const { event } = get();
    if (!event) return 0;
    return Math.max(0, event.scheduledAt - Date.now());
  },

  getCurrentSlide: () => {
    const { quickFire, weakSlides } = get();
    if (!quickFire || weakSlides.length === 0) return null;
    return weakSlides[quickFire.currentIndex] ?? null;
  },

  getProgress: () => {
    const { quickFire } = get();
    if (!quickFire) return { current: 0, total: 0 };
    return {
      current: quickFire.currentIndex + 1,
      total: quickFire.slideIds.length,
    };
  },
}));
