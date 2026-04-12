import { getDB } from "./index";
import type { ConferenceEvent, ConferenceReflection } from "@/types/conferenceDay";

export async function createEvent(event: ConferenceEvent): Promise<string> {
  const db = await getDB();
  await db.put("conferenceEvents", event);
  return event.id;
}

export async function getEvent(id: string): Promise<ConferenceEvent | undefined> {
  const db = await getDB();
  return db.get("conferenceEvents", id);
}

export async function getEventForTalk(
  talkId: string
): Promise<ConferenceEvent | undefined> {
  const db = await getDB();
  const events = await db.getAllFromIndex("conferenceEvents", "by-talk", talkId);
  // Return the most recent upcoming event, or the most recent completed event
  const upcoming = events.filter((e) => e.status === "upcoming");
  if (upcoming.length > 0) {
    return upcoming.sort((a, b) => b.scheduledAt - a.scheduledAt)[0];
  }
  // No upcoming events, return most recent completed
  return events.sort((a, b) => b.scheduledAt - a.scheduledAt)[0];
}

export async function updateEvent(event: ConferenceEvent): Promise<void> {
  const db = await getDB();
  await db.put("conferenceEvents", event);
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("conferenceEvents", id);
}

export async function completeEvent(
  id: string,
  reflection: ConferenceReflection
): Promise<void> {
  const db = await getDB();
  const event = await db.get("conferenceEvents", id);
  if (event) {
    event.status = "completed";
    event.reflection = reflection;
    await db.put("conferenceEvents", event);
  }
}

export async function getUpcomingEvents(): Promise<ConferenceEvent[]> {
  const db = await getDB();
  const now = Date.now();
  const events = await db.getAll("conferenceEvents");
  return events
    .filter((e) => e.status === "upcoming" && e.scheduledAt > now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

export async function deleteEventsForTalk(talkId: string): Promise<void> {
  const db = await getDB();
  const events = await db.getAllFromIndex("conferenceEvents", "by-talk", talkId);
  const tx = db.transaction("conferenceEvents", "readwrite");
  await Promise.all(events.map((e) => tx.store.delete(e.id)));
  await tx.done;
}
