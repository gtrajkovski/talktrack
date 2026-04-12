import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Talk } from "@/types/talk";
import type { RehearsalSession } from "@/types/session";
import type { UserSettings } from "@/types/settings";
import type { Recording } from "@/types/recording";
import type { ConferenceEvent } from "@/types/conferenceDay";

// Hint state for progressive command disclosure
export interface HintState {
  id: string; // talkId or 'global'
  rehearsalCount: number;
  hintsShown: Record<string, number>; // command -> times shown
  commandsUsed: Record<string, number>; // command -> times used
  lastUpdated: number;
}

// Streak data for positive reinforcement
export interface StreakData {
  id: string; // always 'streak'
  currentStreak: number;
  lastPracticeDate: string; // YYYY-MM-DD
  longestStreak: number;
}

// Stored bookmark record (v4)
export interface StoredBookmark {
  talkId: string;
  slideId: string;
  createdAt: number;
}

interface TalkTrackDB extends DBSchema {
  talks: {
    key: string;
    value: Talk;
    indexes: { "by-updated": number };
  };
  sessions: {
    key: string;
    value: RehearsalSession;
    indexes: { "by-talk": string; "by-started": number };
  };
  settings: {
    key: string;
    value: UserSettings;
  };
  recordings: {
    key: string;
    value: Recording;
    indexes: { "by-session": string; "by-talk": string; "by-created": number };
  };
  hints: {
    key: string;
    value: HintState;
  };
  streaks: {
    key: string;
    value: StreakData;
  };
  bookmarks: {
    key: [string, string]; // [talkId, slideId] compound key
    value: StoredBookmark;
    indexes: { "by-talk": string };
  };
  conferenceEvents: {
    key: string;
    value: ConferenceEvent;
    indexes: { "by-talk": string; "by-scheduled": number };
  };
}

const DB_NAME = "talktrack";
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<TalkTrackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TalkTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TalkTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Talks store (v1)
        if (!db.objectStoreNames.contains("talks")) {
          const talkStore = db.createObjectStore("talks", { keyPath: "id" });
          talkStore.createIndex("by-updated", "updatedAt");
        }

        // Sessions store (v1)
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
          sessionStore.createIndex("by-talk", "talkId");
          sessionStore.createIndex("by-started", "startedAt");
        }

        // Settings store (v1)
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }

        // Recordings store (added in v2)
        if (!db.objectStoreNames.contains("recordings")) {
          const recordingStore = db.createObjectStore("recordings", { keyPath: "id" });
          recordingStore.createIndex("by-session", "sessionId");
          recordingStore.createIndex("by-talk", "talkId");
          recordingStore.createIndex("by-created", "createdAt");
        }

        // Hints store (added in v3) - for progressive command disclosure
        if (!db.objectStoreNames.contains("hints")) {
          db.createObjectStore("hints", { keyPath: "id" });
        }

        // Streaks store (added in v3) - for positive reinforcement
        if (!db.objectStoreNames.contains("streaks")) {
          db.createObjectStore("streaks", { keyPath: "id" });
        }

        // Bookmarks store (added in v4) - compound key [talkId, slideId]
        if (oldVersion < 4 && !db.objectStoreNames.contains("bookmarks")) {
          const bookmarkStore = db.createObjectStore("bookmarks", {
            keyPath: ["talkId", "slideId"],
          });
          bookmarkStore.createIndex("by-talk", "talkId");
        }

        // Conference events store (added in v5) - for Conference Day companion
        if (oldVersion < 5 && !db.objectStoreNames.contains("conferenceEvents")) {
          const eventStore = db.createObjectStore("conferenceEvents", {
            keyPath: "id",
          });
          eventStore.createIndex("by-talk", "talkId");
          eventStore.createIndex("by-scheduled", "scheduledAt");
        }
      },
    });
  }
  return dbPromise;
}
