"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { parseText } from "@/lib/parsers/text";
import { useTalksStore } from "@/stores/talksStore";
import type { Talk } from "@/types/talk";

export default function ImportPage() {
  const router = useRouter();
  const addTalk = useTalksStore((s) => s.addTalk);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const [slides, setSlides] = useState<ReturnType<typeof parseText>>([]);

  const handleParse = () => {
    if (!text.trim()) return;
    const parsed = parseText(text);
    setSlides(parsed);
    setStep("preview");
  };

  const handleSave = async () => {
    const talk: Talk = {
      id: nanoid(),
      title: title.trim() || slides[0]?.title || "Untitled Talk",
      slides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalRehearsals: 0,
      source: "paste",
    };
    await addTalk(talk);
    router.push(`/talk/${talk.id}`);
  };

  if (step === "preview") {
    return (
      <div className="flex flex-col flex-1 px-4 pt-6 pb-24">
        <header className="mb-4">
          <button
            onClick={() => setStep("paste")}
            className="text-accent text-sm font-semibold mb-3"
          >
            &larr; Back to edit
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Preview Slides
          </h1>
          <p className="text-text-dim text-sm mt-1">
            {slides.length} slide{slides.length !== 1 && "s"} parsed
          </p>
        </header>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Talk title (optional)"
          className="bg-surface rounded-xl px-4 py-3 text-text placeholder:text-text-dim mb-4 outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="flex flex-col gap-3 mb-6">
          {slides.map((slide, i) => (
            <div key={slide.id} className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-accent font-bold text-sm">
                  {i + 1}
                </span>
                <h3 className="font-bold truncate">{slide.title}</h3>
              </div>
              <p className="text-text-dim text-sm line-clamp-3">
                {slide.notes}
              </p>
              <p className="text-text-dim text-xs mt-2">
                {slide.wordCount} words &middot; ~
                {slide.estimatedSeconds}s
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="bg-accent text-bg font-bold text-lg py-4 rounded-2xl active:scale-[0.97] transition-transform"
        >
          Save Talk
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24">
      <header className="mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-accent text-sm font-semibold mb-3"
        >
          &larr; Home
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Import a Talk
        </h1>
        <p className="text-text-dim text-sm mt-1">
          Paste your speaker notes below. Separate slides with a blank line.
          First line of each section becomes the slide title.
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Start With a Hook\nOpen with a surprising fact or a bold question. You have 30 seconds to grab attention.\n\nOne Idea Per Slide\nEach slide should communicate exactly one point. Think of slides as signposts, not documents.`}
        className="bg-surface rounded-xl p-4 text-text placeholder:text-text-dim/50 flex-1 min-h-[300px] resize-none outline-none focus:ring-2 focus:ring-accent"
        autoFocus
      />

      <button
        onClick={handleParse}
        disabled={!text.trim()}
        className="mt-4 bg-accent text-bg font-bold text-lg py-4 rounded-2xl active:scale-[0.97] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Parse Slides
      </button>
    </div>
  );
}
