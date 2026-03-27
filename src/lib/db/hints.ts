import { getDB, type HintState } from "./index";

/**
 * Get hint state for a talk (or global state)
 */
export async function getHintState(talkId: string = "global"): Promise<HintState> {
  const db = await getDB();
  const state = await db.get("hints", talkId);

  if (state) {
    return state;
  }

  // Return default state
  return {
    id: talkId,
    rehearsalCount: 0,
    hintsShown: {},
    commandsUsed: {},
    lastUpdated: Date.now(),
  };
}

/**
 * Increment rehearsal count for a talk
 */
export async function incrementRehearsalCount(talkId: string = "global"): Promise<number> {
  const db = await getDB();
  const state = await getHintState(talkId);

  state.rehearsalCount++;
  state.lastUpdated = Date.now();

  await db.put("hints", state);
  return state.rehearsalCount;
}

/**
 * Get current rehearsal count
 */
export async function getRehearsalCount(talkId: string = "global"): Promise<number> {
  const state = await getHintState(talkId);
  return state.rehearsalCount;
}

/**
 * Record that a hint was shown
 */
export async function recordHintShown(talkId: string, command: string): Promise<void> {
  const db = await getDB();
  const state = await getHintState(talkId);

  state.hintsShown[command] = (state.hintsShown[command] || 0) + 1;
  state.lastUpdated = Date.now();

  await db.put("hints", state);
}

/**
 * Get number of times a hint was shown
 */
export async function getHintShownCount(talkId: string, command: string): Promise<number> {
  const state = await getHintState(talkId);
  return state.hintsShown[command] || 0;
}

/**
 * Record that a command was successfully used
 */
export async function recordCommandUsed(talkId: string, command: string): Promise<void> {
  const db = await getDB();
  const state = await getHintState(talkId);

  state.commandsUsed[command] = (state.commandsUsed[command] || 0) + 1;
  state.lastUpdated = Date.now();

  await db.put("hints", state);
}

/**
 * Get number of times a command was used
 */
export async function getCommandUsedCount(talkId: string, command: string): Promise<number> {
  const state = await getHintState(talkId);
  return state.commandsUsed[command] || 0;
}

/**
 * Check if user has mastered a command (used it 3+ times)
 */
export async function hasLearnedCommand(talkId: string, command: string): Promise<boolean> {
  const count = await getCommandUsedCount(talkId, command);
  return count >= 3;
}

/**
 * Reset hint state for a talk
 */
export async function resetHintState(talkId: string = "global"): Promise<void> {
  const db = await getDB();
  await db.delete("hints", talkId);
}

/**
 * Reset all hint states
 */
export async function resetAllHints(): Promise<void> {
  const db = await getDB();
  await db.clear("hints");
}
