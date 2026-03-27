import { getDB, type StreakData } from "./index";

/**
 * Get current streak data
 */
export async function getStreak(): Promise<StreakData> {
  const db = await getDB();
  const data = await db.get("streaks", "streak");

  if (data) return data;

  return {
    id: "streak",
    currentStreak: 0,
    lastPracticeDate: "",
    longestStreak: 0,
  };
}

/**
 * Update streak after completing a session
 * Returns the new streak count
 */
export async function updateStreak(): Promise<number> {
  const db = await getDB();
  const today = new Date().toISOString().split("T")[0];
  const data = await getStreak();

  if (data.lastPracticeDate === today) {
    // Already practiced today
    return data.currentStreak;
  }

  const lastDate = data.lastPracticeDate ? new Date(data.lastPracticeDate) : null;
  const todayDate = new Date(today);

  let newStreak: number;

  if (!lastDate) {
    // First practice ever
    newStreak = 1;
  } else {
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      // Consecutive day - extend streak
      newStreak = data.currentStreak + 1;
    } else {
      // Streak broken - start fresh
      newStreak = 1;
    }
  }

  const updatedData: StreakData = {
    id: "streak",
    currentStreak: newStreak,
    lastPracticeDate: today,
    longestStreak: Math.max(data.longestStreak, newStreak),
  };

  await db.put("streaks", updatedData);
  return newStreak;
}
