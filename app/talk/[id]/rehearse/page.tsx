"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTalksStore } from "@/stores/talksStore";
import {
  useRehearsalStore,
  type RehearsalMode,
} from "@/stores/rehearsalStore";
import { speak, stop } from "@/lib/speech/synthesis";
import {
  playSlideChime,
  playStartChime,
  playCompleteChime,
} from "@/lib/audio/chime";
import { saveSession } from "@/lib/db/sessions";
import { nanoid } from "nanoid";
import type { Talk } from "@/types/talk";
import type { RehearsalSession } from "@/types/session";

export default function RehearsalPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get("mode") ?? "listen") as RehearsalMode;

  const getTalk = useTalksStore((s) => s.getTalk);
  const updateTalk = useTalksStore((s) => s.updateTalk);

  const {
    talk,
    currentSlideIndex,
    status,
    startedAt,
    attempts,
    startRehearsal,
    setStatus,
    nextSlide,
    prevSlide,
    reset,
  } = useRehearsalStore();

  const [loading, setLoading] = useState(true);
  const hasStarted = useRef(false);

  // Load talk and start rehearsal
  useEffect(() => {
    getTalk(id).then((t) => {
      if (t) {
        startRehearsal(t, mode);
      }
      setLoading(false);
    });
    return () => {
      stop();
      reset();
    };
  }, [id, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play on slide change (Listen mode) or read title (Prompt/Test)
  useEffect(() => {
    if (!talk || loading) return;

    const slide = talk.slides[currentSlideIndex];
    if (!slide) return;

    if (status === "idle") {
      if (!hasStarted.current) {
        hasStarted.current = true;
        playStartChime();
        setTimeout(() => playSlideContent(), 400);
      } else {
        playSlideContent();
      }
    }
  }, [currentSlideIndex, talk, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const playSlideContent = useCallback(() => {
    if (!talk) return;
    const slide = talk.slides[currentSlideIndex];
    if (!slide) return;

    if (mode === "listen") {
      setStatus("playing");
      speak(slide.notes, {
        onEnd: () => {
          setStatus("idle");
          // Auto-advance after a brief pause
          setTimeout(() => {
            const advanced = nextSlide();
            if (advanced) {
              playSlideChime();
            }
          }, 800);
        },
      });
    } else if (mode === "prompt") {
      setStatus("playing");
      speak(`Slide ${currentSlideIndex + 1}: ${slide.title}`, {
        onEnd: () => setStatus("waiting"),
      });
    } else if (mode === "test") {
      setStatus("playing");
      speak(`Slide ${currentSlideIndex + 1}: ${slide.title}`, {
        onEnd: () => setStatus("waiting"),
      });
    }
  }, [talk, currentSlideIndex, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReveal = useCallback(() => {
    if (!talk) return;
    const slide = talk.slides[currentSlideIndex];
    if (!slide) return;

    setStatus("revealed");
    speak(slide.notes, {
      onEnd: () => setStatus("revealed"),
    });
  }, [talk, currentSlideIndex, setStatus]);

  const handleNext = useCallback(() => {
    stop();
    const advanced = nextSlide();
    if (advanced) {
      playSlideChime();
    }
  }, [nextSlide]);

  const handlePrev = useCallback(() => {
    stop();
    prevSlide();
  }, [prevSlide]);

  const handleRepeat = useCallback(() => {
    stop();
    setStatus("idle");
    playSlideContent();
  }, [playSlideContent, setStatus]);

  const handleComplete = useCallback(async () => {
    playCompleteChime();

    if (talk) {
      // Save session
      const session: RehearsalSession = {
        id: nanoid(),
        talkId: talk.id,
        mode,
        startedAt,
        completedAt: Date.now(),
        slidesCompleted: talk.slides.length,
        totalSlides: talk.slides.length,
        attempts,
      };
      await saveSession(session);

      // Update talk rehearsal count
      await updateTalk({
        ...talk,
        totalRehearsals: talk.totalRehearsals + 1,
        updatedAt: Date.now(),
      });
    }
  }, [talk, mode, startedAt, attempts, updateTalk]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-text-dim text-lg">Loading...</div>
      </div>
    );
  }

  if (!talk) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <p className="text-text-dim text-lg">Talk not found</p>
        <button
          onClick={() => router.push("/")}
          className="text-accent font-semibold"
        >
          Go home
        </button>
      </div>
    );
  }

  const slide = talk.slides[currentSlideIndex];
  const progress = ((currentSlideIndex + 1) / talk.slides.length) * 100;

  // Completion screen
  if (status === "complete") {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    return (
      <div className="flex flex-col flex-1 px-4 pt-10 pb-6 items-center justify-center text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Rehearsal Complete!
        </h1>
        <p className="text-text-dim text-lg mb-8">
          {talk.slides.length} slides in {mins}:{secs.toString().padStart(2, "0")}
        </p>

        <div className="bg-surface rounded-2xl p-5 w-full mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-dim">Mode</span>
            <span className="font-semibold capitalize">{mode}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-dim">Slides</span>
            <span className="font-semibold">{talk.slides.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-dim">Duration</span>
            <span className="font-semibold">
              {mins}:{secs.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              handleComplete();
              router.push(`/talk/${id}`);
            }}
            className="bg-accent text-bg font-bold text-lg py-4 rounded-2xl active:scale-[0.97] transition-transform"
          >
            Done
          </button>
          <button
            onClick={() => {
              handleComplete();
              startRehearsal(talk, mode);
              hasStarted.current = false;
            }}
            className="bg-surface text-text font-semibold text-lg py-4 rounded-2xl active:scale-[0.97] transition-transform"
          >
            Rehearse Again
          </button>
        </div>
      </div>
    );
  }

  // Main rehearsal UI
  return (
    <div className="flex flex-col flex-1">
      {/* Progress bar */}
      <div className="h-1.5 bg-surface-light">
        <div
          className="h-full bg-accent transition-all duration-400 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => {
              stop();
              reset();
              router.push(`/talk/${id}`);
            }}
            className="text-text-dim text-sm font-semibold"
          >
            Exit
          </button>
          <span className="text-text-dim text-sm">
            {currentSlideIndex + 1} / {talk.slides.length}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            {mode}
          </span>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-accent font-bold text-sm uppercase tracking-widest mb-2">
          Slide {currentSlideIndex + 1}
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight mb-4">
          {slide?.title}
        </h2>

        {/* Status badge */}
        <div className="mb-6">
          {status === "playing" && (
            <span className="inline-flex items-center gap-2 bg-blue/10 text-blue px-4 py-2 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-blue rounded-full animate-pulse" />
              {mode === "listen" ? "Playing..." : "Reading title..."}
            </span>
          )}
          {status === "waiting" && (
            <span className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-semibold">
              Your turn
            </span>
          )}
          {status === "revealed" && (
            <span className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-semibold">
              Answer revealed
            </span>
          )}
        </div>

        {/* Notes (visible in Listen mode and when revealed) */}
        {(mode === "listen" || status === "revealed") && slide && (
          <p className="text-text-dim text-base leading-relaxed max-w-md">
            {slide.notes}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-6 pt-2">
        {mode === "listen" && (
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform disabled:opacity-30"
            >
              Back
            </button>
            <button
              onClick={handleRepeat}
              className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Repeat
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-accent text-bg font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {mode === "prompt" && status === "waiting" && (
          <button
            onClick={handleReveal}
            className="w-full bg-accent text-bg font-bold text-lg py-4 rounded-2xl active:scale-[0.97] transition-transform mb-3"
          >
            Reveal Answer
          </button>
        )}

        {mode === "prompt" && status === "revealed" && (
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform disabled:opacity-30"
            >
              Back
            </button>
            <button
              onClick={handleRepeat}
              className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Repeat
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-accent text-bg font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {mode === "test" && status === "waiting" && (
          <div className="flex gap-3">
            <button
              onClick={handleReveal}
              className="flex-1 bg-surface text-accent font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Need Help
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-accent text-bg font-bold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Got It
            </button>
          </div>
        )}

        {mode === "test" && status === "revealed" && (
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform disabled:opacity-30"
            >
              Back
            </button>
            <button
              onClick={handleRepeat}
              className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Repeat
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-accent text-bg font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {(status === "playing" || status === "idle") &&
          mode !== "listen" && (
            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                disabled={currentSlideIndex === 0}
                className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform disabled:opacity-30"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-surface text-text font-semibold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
              >
                Skip
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
