/**
 * Conference Day Types
 *
 * Types for the day-of-event companion feature.
 */

export interface ConferenceReflection {
  rating: "great" | "okay" | "rough";
  notes?: string;
  recordedAt: number;
}

export interface ConferenceEvent {
  id: string;
  talkId: string;
  scheduledAt: number;
  createdAt: number;
  status: "upcoming" | "completed";
  quickFireCompleted: boolean;
  breathingCompleted: boolean;
  reflection?: ConferenceReflection;
}

export interface QuickFireSession {
  slideIds: string[];
  currentIndex: number;
  scores: { slideId: string; score: number }[];
}

export type ConferenceDayPhase =
  | "setup" // Setting event time
  | "countdown" // Waiting for talk time
  | "go-time" // Within 5 minutes of talk
  | "reflect"; // Post-talk reflection time
