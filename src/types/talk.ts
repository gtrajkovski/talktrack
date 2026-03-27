export interface Talk {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  totalRehearsals: number;
  source: "paste" | "pptx" | "docx" | "voice" | "demo";
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
}

export interface Section {
  id: string;
  name: string;
  slideCount: number;
  startIndex: number;
  endIndex: number;
}
