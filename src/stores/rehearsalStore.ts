import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Talk, Slide } from "@/types/talk";
import type { RehearsalSession, RehearsalMode, SlideAttempt } from "@/types/session";
import * as sessionsDB from "@/lib/db/sessions";
import * as talksDB from "@/lib/db/talks";

// Audio state for multimodal sync
export type AudioState = 'idle' | 'speaking' | 'listening' | 'processing' | 'paused' | 'error';

// Practice mode options
export type PracticeMode = 'all' | 'bookmarksOnly' | 'hardOnly';

// Speed multiplier constants
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2.0;
export const DEFAULT_SPEED = 1.0;
export const SPEED_STEP = 0.1;

// Score threshold for "hard" slides
export const HARD_SCORE_THRESHOLD = 50;

interface RehearsalState {
  // Current session
  session: RehearsalSession | null;
  talk: Talk | null;

  // Playback state
  currentSlideIndex: number;
  isPlaying: boolean;
  isPaused: boolean;

  // Speed control (multiplier applied on top of settings.speechRate)
  speedMultiplier: number;

  // Bookmark and practice mode
  bookmarkedSlides: Set<string>;  // Slide IDs
  practiceMode: PracticeMode;

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

  // Speed control actions
  increaseSpeed: () => number;  // Returns new speed
  decreaseSpeed: () => number;  // Returns new speed
  resetSpeed: () => void;
  setSpeedMultiplier: (speed: number) => void;
  getEffectiveSpeed: (baseRate: number) => number;  // baseRate * speedMultiplier

  // Bookmark actions
  toggleBookmark: (slideId: string) => boolean;  // Returns true if now bookmarked
  addBookmark: (slideId: string) => void;
  removeBookmark: (slideId: string) => void;
  clearBookmarks: () => void;
  isBookmarked: (slideId: string) => boolean;
  getBookmarkedSlideIndices: () => number[];

  // Practice mode actions
  setPracticeMode: (mode: PracticeMode) => void;
  getFilteredSlideIndices: () => number[];  // Indices based on current practice mode
  getHardSlideIndices: () => number[];  // Slides with lastScore < threshold

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

  // Speed control initial value
  speedMultiplier: DEFAULT_SPEED,

  // Bookmark and practice mode initial values
  bookmarkedSlides: new Set<string>(),
  practiceMode: 'all' as PracticeMode,

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
      speedMultiplier: DEFAULT_SPEED,
      // Preserve bookmarks across sessions (don't reset)
      practiceMode: 'all' as PracticeMode,
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
      speedMultiplier: DEFAULT_SPEED,
      bookmarkedSlides: new Set<string>(),
      practiceMode: 'all' as PracticeMode,
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

  // Speed control actions
  increaseSpeed: () => {
    const { speedMultiplier } = get();
    const newSpeed = Math.min(MAX_SPEED, Math.round((speedMultiplier + SPEED_STEP) * 10) / 10);
    set({ speedMultiplier: newSpeed });
    return newSpeed;
  },

  decreaseSpeed: () => {
    const { speedMultiplier } = get();
    const newSpeed = Math.max(MIN_SPEED, Math.round((speedMultiplier - SPEED_STEP) * 10) / 10);
    set({ speedMultiplier: newSpeed });
    return newSpeed;
  },

  resetSpeed: () => {
    set({ speedMultiplier: DEFAULT_SPEED });
  },

  setSpeedMultiplier: (speed: number) => {
    const clampedSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    set({ speedMultiplier: clampedSpeed });
  },

  getEffectiveSpeed: (baseRate: number) => {
    const { speedMultiplier } = get();
    return baseRate * speedMultiplier;
  },

  // Bookmark actions
  toggleBookmark: (slideId: string) => {
    const { bookmarkedSlides } = get();
    const newSet = new Set(bookmarkedSlides);
    const isNowBookmarked = !newSet.has(slideId);
    if (isNowBookmarked) {
      newSet.add(slideId);
    } else {
      newSet.delete(slideId);
    }
    set({ bookmarkedSlides: newSet });
    return isNowBookmarked;
  },

  addBookmark: (slideId: string) => {
    const { bookmarkedSlides } = get();
    const newSet = new Set(bookmarkedSlides);
    newSet.add(slideId);
    set({ bookmarkedSlides: newSet });
  },

  removeBookmark: (slideId: string) => {
    const { bookmarkedSlides } = get();
    const newSet = new Set(bookmarkedSlides);
    newSet.delete(slideId);
    set({ bookmarkedSlides: newSet });
  },

  clearBookmarks: () => {
    set({ bookmarkedSlides: new Set<string>() });
  },

  isBookmarked: (slideId: string) => {
    const { bookmarkedSlides } = get();
    return bookmarkedSlides.has(slideId);
  },

  getBookmarkedSlideIndices: () => {
    const { talk, bookmarkedSlides } = get();
    if (!talk) return [];
    return talk.slides
      .filter(slide => bookmarkedSlides.has(slide.id))
      .map(slide => slide.index);
  },

  // Practice mode actions
  setPracticeMode: (mode: PracticeMode) => {
    set({ practiceMode: mode });
  },

  getFilteredSlideIndices: () => {
    const { talk, practiceMode, bookmarkedSlides } = get();
    if (!talk) return [];

    switch (practiceMode) {
      case 'bookmarksOnly':
        return talk.slides
          .filter(slide => bookmarkedSlides.has(slide.id))
          .map(slide => slide.index);
      case 'hardOnly':
        return talk.slides
          .filter(slide =>
            slide.lastScore !== undefined && slide.lastScore < HARD_SCORE_THRESHOLD
          )
          .map(slide => slide.index);
      case 'all':
      default:
        return talk.slides.map(slide => slide.index);
    }
  },

  getHardSlideIndices: () => {
    const { talk } = get();
    if (!talk) return [];
    return talk.slides
      .filter(slide =>
        slide.lastScore !== undefined && slide.lastScore < HARD_SCORE_THRESHOLD
      )
      .map(slide => slide.index);
  },
}));
