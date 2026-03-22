import { openDB, type IDBPDatabase } from "idb";
import type { Talk } from "@/types/talk";
import type { RehearsalSession } from "@/types/session";

export interface TalkTrackDB {
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
}

let dbPromise: Promise<IDBPDatabase<TalkTrackDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TalkTrackDB>("talktrack", 1, {
      upgrade(db) {
        const talkStore = db.createObjectStore("talks", { keyPath: "id" });
        talkStore.createIndex("by-updated", "updatedAt");

        const sessionStore = db.createObjectStore("sessions", {
          keyPath: "id",
        });
        sessionStore.createIndex("by-talk", "talkId");
        sessionStore.createIndex("by-started", "startedAt");
      },
    });
  }
  return dbPromise;
}
