import { nanoid } from "nanoid";
import type { Talk, Slide } from "@/types/talk";
import { countWords } from "@/lib/utils/wordCount";

const DEMO_SLIDES_DATA = [
  {
    title: "Welcome to TalkTrack",
    notes:
      "TalkTrack helps you rehearse presentations, speeches, and pitches completely hands-free. Perfect for practicing while driving, walking, or doing chores. You'll use only your voice and ears - no need to look at the screen.",
  },
  {
    title: "Three Ways to Practice",
    notes:
      "There are three rehearsal modes. Listen mode reads your slides aloud so you can absorb the content. Prompt mode reads just the title, then you recite from memory. Test mode is the ultimate challenge - only the slide number is announced, and you recall everything yourself.",
  },
  {
    title: "Voice Commands",
    notes:
      "Control everything with your voice. Say 'next' to advance, 'back' to go back, 'repeat' to hear again. In Prompt mode, say 'reveal' if you're stuck. In Test mode, say 'help' to hear the notes. You can also tap the buttons as a fallback.",
  },
  {
    title: "Import Your Content",
    notes:
      "You can paste text directly, upload PowerPoint files to extract speaker notes, or upload Word documents. The app splits your content into slides automatically. Each slide has a title and notes that you'll practice reciting.",
  },
  {
    title: "Track Your Progress",
    notes:
      "TalkTrack tracks how many times you've rehearsed each slide. Over time, you'll see which parts you've mastered and which need more work. The goal is confident delivery without notes - speaking naturally from memory.",
  },
];

/**
 * Creates a demo talk for first-time users.
 * The demo explains how to use TalkTrack.
 */
export function createDemoTalk(wordsPerMinute = 100): Talk {
  const slides: Slide[] = DEMO_SLIDES_DATA.map((data, index) => {
    const wordCount = countWords(data.notes);
    return {
      id: nanoid(),
      index,
      title: data.title,
      notes: data.notes,
      wordCount,
      estimatedSeconds: Math.round((wordCount / wordsPerMinute) * 60),
      timesRehearsed: 0,
    };
  });

  return {
    id: nanoid(),
    title: "Getting Started with TalkTrack",
    slides,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalRehearsals: 0,
    source: "demo",
  };
}
