"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { speak, stop } from "@/lib/speech/synthesis";
import { getAvailableVoices, type VoiceOption } from "@/lib/speech/voices";
import { useSettingsStore } from "@/stores/settingsStore";

interface VoicePickerModalProps {
  onClose: () => void;
}

export function VoicePickerModal({ onClose }: VoicePickerModalProps) {
  const { speechRate, updateSettings } = useSettingsStore();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  useEffect(() => {
    // Load voices asynchronously (handles Android delays)
    let cancelled = false;

    async function loadVoices() {
      const allVoices = await getAvailableVoices();
      if (cancelled) return;

      const topVoices = allVoices.slice(0, 5);
      setVoices(topVoices);

      // Auto-select the first (best) voice if available
      if (topVoices.length > 0) {
        setSelectedVoice(topVoices[0].name);
      }
    }

    loadVoices();

    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, []);

  const handlePreview = (voiceName: string) => {
    stop();
    setIsPlaying(true);
    setPlayingVoice(voiceName);

    speak("Hello! This is how I'll read your presentation notes.", {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        setIsPlaying(false);
        setPlayingVoice(null);
      },
    });
  };

  const handleSelect = (voiceName: string) => {
    setSelectedVoice(voiceName);
    handlePreview(voiceName);
  };

  const handleContinue = () => {
    stop();
    updateSettings({
      voiceName: selectedVoice,
      hasSelectedVoice: true,
    });
    onClose();
  };

  const handleUseDefault = () => {
    stop();
    updateSettings({
      voiceName: "",
      hasSelectedVoice: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-surface rounded-t-[24px] sm:rounded-[24px] w-full sm:max-w-md p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Choose Your Voice</h2>
          <p className="text-text-dim text-sm">
            Tap to preview, then select your favorite voice for narration.
          </p>
        </div>

        {/* Voice List */}
        <div className="space-y-2 mb-6">
          {voices.length === 0 ? (
            <div className="text-center py-8 text-text-dim">
              Loading voices...
            </div>
          ) : (
            voices.map((voice, index) => (
              <button
                key={voice.name}
                onClick={() => handleSelect(voice.name)}
                className={`
                  w-full p-4 rounded-[var(--radius-sm)] text-left transition-all
                  ${selectedVoice === voice.name
                    ? "bg-accent/20 border-2 border-accent"
                    : "bg-surface-light border-2 border-transparent"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Play indicator or number */}
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${playingVoice === voice.name
                          ? "bg-accent text-bg animate-pulse"
                          : selectedVoice === voice.name
                          ? "bg-accent text-bg"
                          : "bg-surface text-text-dim"
                        }
                      `}
                    >
                      {playingVoice === voice.name ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{voice.name}</div>
                      <div className="text-xs text-text-dim flex items-center gap-2">
                        <span>{voice.lang}</span>
                        {voice.quality === "premium" && (
                          <span className="bg-accent/20 text-accent px-1.5 py-0.5 rounded text-[10px]">
                            Best
                          </span>
                        )}
                        {voice.isLocal && (
                          <span className="text-text-dim">(offline)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedVoice === voice.name && (
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <svg className="w-4 h-4 text-bg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleContinue} disabled={!selectedVoice && voices.length > 0}>
            {isPlaying ? "Playing..." : "Continue with Selected"}
          </Button>

          <button
            onClick={handleUseDefault}
            className="w-full text-center text-sm text-text-dim py-2 hover:text-text transition-colors"
          >
            Use system default instead
          </button>
        </div>

        {/* Premium voices hint */}
        <div className="mt-6 p-3 bg-surface-light rounded-lg text-center">
          <p className="text-xs text-text-dim">
            Want even better voices?{" "}
            <span className="text-accent">Settings → Premium Voices</span>
            {" "}lets you use ElevenLabs AI voices.
          </p>
        </div>
      </div>
    </div>
  );
}
