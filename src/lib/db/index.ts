import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Talk } from "@/types/talk";
import type { RehearsalSession } from "@/types/session";
import type { UserSettings } from "@/types/settings";

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
}

const DB_NAME = "talktrack";
const DB_VERSION = 1;

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
      },
    });
  }
  return dbPromise;
}
