export interface Talk {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  totalRehearsals: number;
  source: "paste" | "pptx" | "docx" | "voice" | "demo";
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
}
