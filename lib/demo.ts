import { nanoid } from "nanoid";
import type { Talk } from "@/types/talk";

const DEMO_ID = "demo-talk-001";

export function createDemoTalk(): Talk {
  return {
    id: DEMO_ID,
    title: "How to Give a Great Presentation",
    source: "demo",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalRehearsals: 0,
    slides: [
      {
        id: nanoid(),
        index: 0,
        title: "Start With a Hook",
        notes:
          "Open with a surprising fact, a bold question, or a short personal story. You have about 30 seconds to grab attention before people check their phones. Make those seconds count. The best hooks create a gap between what the audience expects and what you deliver.",
        wordCount: 44,
        estimatedSeconds: 26,
        timesRehearsed: 0,
      },
      {
        id: nanoid(),
        index: 1,
        title: "One Idea Per Slide",
        notes:
          "Each slide should communicate exactly one point. If you need a second sentence to explain the slide title, the slide is trying to do too much. Think of slides as signposts, not documents. Your audience should understand the point in three seconds or less.",
        wordCount: 46,
        estimatedSeconds: 28,
        timesRehearsed: 0,
      },
      {
        id: nanoid(),
        index: 2,
        title: "Tell Stories, Not Facts",
        notes:
          "People remember stories twenty-two times more than facts alone. Instead of saying revenue grew forty percent, tell the story of the customer whose problem you solved. Wrap your data in narrative. Every number should have a face behind it.",
        wordCount: 42,
        estimatedSeconds: 25,
        timesRehearsed: 0,
      },
      {
        id: nanoid(),
        index: 3,
        title: "End With a Clear Call to Action",
        notes:
          "Never end with 'any questions.' End with exactly what you want the audience to do next. Be specific: sign up, try the demo, schedule a meeting, change one habit this week. A presentation without a call to action is a conversation without a point.",
        wordCount: 45,
        estimatedSeconds: 27,
        timesRehearsed: 0,
      },
    ],
  };
}

export { DEMO_ID };
