export interface RehearsalSession {
  id: string;
  talkId: string;
  mode: "listen" | "prompt" | "test";
  startedAt: number;
  completedAt?: number;
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
