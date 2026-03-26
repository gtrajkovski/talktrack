import type { Talk } from "@/types/talk";
import type { RehearsalSession } from "@/types/session";

/**
 * Generate CSV content for slide stats
 */
export function generateSlidesCsv(talk: Talk): string {
  const headers = ["Slide", "Title", "Word Count", "Est. Duration (s)", "Times Rehearsed", "Last Score"];
  const rows = talk.slides.map((slide, index) => [
    index + 1,
    escapeCell(slide.title),
    slide.wordCount,
    slide.estimatedSeconds,
    slide.timesRehearsed,
    slide.lastScore ?? "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate CSV content for session history
 */
export function generateSessionsCsv(sessions: RehearsalSession[]): string {
  const headers = ["Date", "Mode", "Slides Completed", "Total Slides", "Duration (min)"];
  const rows = sessions.map((session) => {
    const date = new Date(session.startedAt).toISOString().split("T")[0];
    const duration = session.completedAt
      ? Math.round((session.completedAt - session.startedAt) / 60000)
      : "incomplete";
    return [
      date,
      session.mode,
      session.slidesCompleted,
      session.totalSlides,
      duration,
    ];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate combined CSV with slides and sessions
 */
export function generateFullCsv(talk: Talk, sessions: RehearsalSession[]): string {
  const slidesCsv = generateSlidesCsv(talk);
  const sessionsCsv = generateSessionsCsv(sessions);

  return `TALK: ${escapeCell(talk.title)}
Total Rehearsals: ${talk.totalRehearsals}
Exported: ${new Date().toISOString()}

--- SLIDES ---
${slidesCsv}

--- SESSION HISTORY ---
${sessionsCsv}
`;
}

/**
 * Trigger a CSV file download in the browser
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Escape a cell value for CSV (handle commas, quotes, newlines)
 */
function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
