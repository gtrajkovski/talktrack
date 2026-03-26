export type RehearsalMode = "listen" | "prompt" | "test";

export interface RehearsalSession {
  id: string;
  talkId: string;
  mode: RehearsalMode;
  startedAt: number;
  completedAt?: number;
  pausedAt?: number;           // When session was interrupted/paused
  currentSlideIndex: number;   // For resume support
  slidesCompleted: number;
  totalSlides: number;
  attempts: SlideAttempt[];
}

export interface SlideAttempt {
  slideId: string;
  slideIndex: number;
  spokenText?: string;
  similarityScore?: number;
  wordsPerMinute?: number;
  fillerWordCount?: number;
  duration?: number;
  usedHelp: boolean;
}
