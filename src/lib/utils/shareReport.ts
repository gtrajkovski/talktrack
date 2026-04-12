/**
 * Share Report Generation
 *
 * Generate shareable progress reports for coaches/teams.
 */

import type { Talk } from "@/types/talk";
import { getBoxCounts } from "@/lib/scoring/spacedRepetition";

/**
 * Generate a text report for sharing
 */
export function generateShareReport(talk: Talk): string {
  const boxCounts = getBoxCounts(talk.slides);
  const mastered = boxCounts[4] + boxCounts[5];
  const totalWords = talk.slides.reduce((sum, s) => sum + s.wordCount, 0);

  let report = `📊 TalkTrack Progress Report\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  report += `📝 ${talk.title}\n`;
  report += `📅 ${talk.slides.length} slides | ${talk.totalRehearsals} rehearsals | ${totalWords} words\n\n`;
  report += `🎯 Mastery: ${mastered}/${talk.slides.length} slides well-learned\n\n`;

  report += `Slide Scores:\n`;
  talk.slides.forEach((slide, i) => {
    const score = slide.lastScore ?? 0;
    const emoji = score >= 80 ? "✅" : score >= 60 ? "🟡" : score > 0 ? "🔴" : "⚪";
    const scoreText = score > 0 ? `${Math.round(score)}%` : "—";
    report += `${emoji} ${i + 1}. ${slide.title}: ${scoreText}\n`;
  });

  report += `\n—\nShared from TalkTrack`;
  return report;
}

/**
 * Share report using native share API or clipboard fallback
 * Returns true if native share was used, false if clipboard
 */
export async function shareReport(report: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text: report });
      return true;
    } catch (err) {
      // User cancelled or share failed, fall back to clipboard
      if ((err as Error).name !== "AbortError") {
        console.warn("Share failed:", err);
      }
    }
  }

  // Clipboard fallback
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(report);
  }
  return false;
}
