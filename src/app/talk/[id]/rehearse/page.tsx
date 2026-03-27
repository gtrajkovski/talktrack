"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import {
  ListenMode,
  PromptMode,
  TestMode,
  CompletionScreen,
} from "@/components/rehearsal";
import { useTalksStore } from "@/stores/talksStore";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import { sessionStart } from "@/lib/audio/chime";
import { filterSlidesBySection } from "@/lib/utils/sections";
import type { Talk, Slide } from "@/types/talk";
import type { RehearsalMode } from "@/types/session";

export default function RehearsalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { talks, loadTalks } = useTalksStore();
  const {
    session,
    startSession,
    endSession,
    currentSlideIndex,
    nextSlide,
    prevSlide,
    markUsedHelp,
  } = useRehearsalStore();

  const [talk, setTalk] = useState<Talk | null>(null);
  const [filteredSlides, setFilteredSlides] = useState<Slide[]>([]);
  const [mode, setMode] = useState<RehearsalMode>("listen");
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);

  // Load talk and initialize session
  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  useEffect(() => {
    const found = talks.find((t) => t.id === params.id);
    if (found) {
      setTalk(found);
      const modeParam = searchParams.get("mode") as RehearsalMode;
      const sectionParam = searchParams.get("section");
      const validMode = ["listen", "prompt", "test"].includes(modeParam) ? modeParam : "listen";
      setMode(validMode);

      // Filter slides by section if specified
      const slides = filterSlidesBySection(found.slides, sectionParam);
      setFilteredSlides(slides);

      // Create a modified talk with filtered slides for the session
      const sessionTalk = { ...found, slides };

      // Start session
      startSession(sessionTalk, validMode).then(() => {
        sessionStart();
        setIsLoading(false);
      });
    }
  }, [talks, params.id, searchParams, startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  const handleComplete = useCallback(() => {
    // Capture sessionId before endSession clears it
    if (session) {
      setCompletedSessionId(session.id);
    }
    setIsComplete(true);
    endSession();
  }, [endSession, session]);

  const handleExit = () => {
    endSession();
    router.push(`/talk/${params.id}`);
  };

  if (isLoading || !talk) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <div className="text-text-dim">Loading rehearsal...</div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <CompletionScreen
        talkId={talk.id}
        talkTitle={talk.title}
        slidesCompleted={talk.slides.length}
        totalSlides={talk.slides.length}
        mode={mode}
        sessionId={completedSessionId}
      />
    );
  }

  const modeLabels: Record<RehearsalMode, string> = {
    listen: "Listen Mode",
    prompt: "Prompt Mode",
    test: "Test Mode",
  };

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      {/* Header with exit */}
      <Header
        title={modeLabels[mode]}
        rightAction={
          <button
            onClick={handleExit}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-text-dim hover:text-text"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        }
      />

      {/* Rehearsal Content */}
      <div className="flex-1 flex flex-col p-4">
        {mode === "listen" && (
          <ListenMode
            slides={filteredSlides}
            currentIndex={currentSlideIndex}
            onNext={nextSlide}
            onPrev={prevSlide}
            onComplete={handleComplete}
          />
        )}

        {mode === "prompt" && session && (
          <PromptMode
            slides={filteredSlides}
            currentIndex={currentSlideIndex}
            sessionId={session.id}
            talkId={talk.id}
            onNext={nextSlide}
            onPrev={prevSlide}
            onComplete={handleComplete}
            onUsedHelp={markUsedHelp}
          />
        )}

        {mode === "test" && session && (
          <TestMode
            slides={filteredSlides}
            currentIndex={currentSlideIndex}
            sessionId={session.id}
            talkId={talk.id}
            onNext={nextSlide}
            onPrev={prevSlide}
            onComplete={handleComplete}
            onUsedHelp={markUsedHelp}
          />
        )}
      </div>
    </div>
  );
}
