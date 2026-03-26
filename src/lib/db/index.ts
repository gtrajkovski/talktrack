import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Talk } from "@/types/talk";
import type { RehearsalSession } from "@/types/session";
import type { UserSettings } from "@/types/settings";
import type { Recording } from "@/types/recording";

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
}

const DB_NAME = "talktrack";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<TalkTrackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TalkTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TalkTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Talks store
        if (!db.objectStoreNames.contains("talks")) {
          const talkStore = db.createObjectStore("talks", { keyPath: "id" });
          talkStore.createIndex("by-updated", "updatedAt");
        }

        // Sessions store
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
          sessionStore.createIndex("by-talk", "talkId");
          sessionStore.createIndex("by-started", "startedAt");
        }

        // Settings store
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
      },
    });
  }
  return dbPromise;
}
