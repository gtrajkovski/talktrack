export interface Talk {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  totalRehearsals: number;
  source: "paste" | "pptx" | "docx" | "pdf" | "url" | "voice" | "demo";
  targetDurationMinutes?: number; // Target duration for pacing feedback
}

export interface ScoreEntry {
  score: number;
  timestamp: number;
  mode: "prompt" | "test";
}

export interface Slide {
  id: string;
  index: number;
  title: string;
  notes: string;
  wordCount: number;
  estimatedSeconds: number;
  timesRehearsed: number;
  lastScore?: number;
  keyPhrases?: string[];
  scoreHistory?: ScoreEntry[];
  sectionId?: string;
  sectionName?: string;
  // Spaced repetition fields (all optional, defaults handled in SR module)
  srBox?: number;             // 1-5, Leitner box (default 1)
  srLastReviewedAt?: number;  // Timestamp of last review
  srNextReviewAt?: number;    // Timestamp when next review is due
}

export interface Section {
  id: string;
  name: string;
  slideCount: number;
  startIndex: number;
  endIndex: number;
}
