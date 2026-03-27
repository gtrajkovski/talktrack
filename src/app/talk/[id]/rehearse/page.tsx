"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import type { Slide } from "@/types/talk";
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

  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  // Load talks on mount
  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  // Derive talk, mode, and filtered slides from URL params
  const talk = useMemo(() => talks.find((t) => t.id === params.id) ?? null, [talks, params.id]);
  const mode = useMemo(() => {
    const modeParam = searchParams.get("mode") as RehearsalMode;
    return ["listen", "prompt", "test"].includes(modeParam) ? modeParam : "listen";
  }, [searchParams]);
  const filteredSlides = useMemo(() => {
    if (!talk) return [];
    const sectionParam = searchParams.get("section");
    return filterSlidesBySection(talk.slides, sectionParam);
  }, [talk, searchParams]);

  // Initialize session once when talk is loaded
  useEffect(() => {
    if (talk && !initializedRef.current) {
      initializedRef.current = true;
      const sessionTalk = { ...talk, slides: filteredSlides };
      startSession(sessionTalk, mode).then(() => {
        sessionStart();
        setIsLoading(false);
      });
    }
  }, [talk, filteredSlides, mode, startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    endSession();
  }, [endSession]);

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
        mode={mode}
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
