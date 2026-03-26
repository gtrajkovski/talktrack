"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { speak, stop } from "@/lib/speech/synthesis";
import { getAvailableVoices, type VoiceOption } from "@/lib/speech/voices";
import { useSettingsStore } from "@/stores/settingsStore";

export function VoiceSelector() {
  const { voiceName, speechRate, updateSettings } = useSettingsStore();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voiceName);

  useEffect(() => {
    getAvailableVoices().then(setVoices);
  }, []);

  useEffect(() => {
    setSelectedVoice(voiceName);
  }, [voiceName]);

  const testVoice = (voice: string) => {
    stop();
    setIsPlaying(true);
    speak("Hello! This is how I will read your presentation notes.", {
      rate: speechRate,
      voiceName: voice || undefined,
      onEnd: () => setIsPlaying(false),
    });
  };

  const selectVoice = (voice: string) => {
    setSelectedVoice(voice);
    updateSettings({ voiceName: voice });
    testVoice(voice);
  };

  // Group voices by quality
  const localVoices = voices.filter((v) => v.isLocal);
  const cloudVoices = voices.filter((v) => !v.isLocal);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Voice Selection</h3>
        {isPlaying && (
          <Button
            variant="ghost"
            fullWidth={false}
            onClick={() => {
              stop();
              setIsPlaying(false);
            }}
            className="text-sm px-3 py-2 min-h-0"
          >
            Stop
          </Button>
        )}
      </div>

      {/* System Default */}
      <button
        onClick={() => selectVoice("")}
        className={`
          w-full p-4 rounded-[var(--radius-sm)] text-left transition-colors
          ${selectedVoice === "" ? "bg-accent/20 border-2 border-accent" : "bg-surface-light"}
        `}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">System Default</div>
            <div className="text-sm text-text-dim">Uses your device&apos;s preferred voice</div>
          </div>
          {selectedVoice === "" && (
            <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
              <svg className="w-4 h-4 text-bg" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </button>

      {/* Local Voices (faster, work offline) */}
      {localVoices.length > 0 && (
        <div>
          <div className="text-sm text-text-dim mb-2 uppercase tracking-wide">
            Local Voices (faster, work offline)
          </div>
          <div className="space-y-2">
            {localVoices.map((voice) => (
              <button
                key={voice.name}
                onClick={() => selectVoice(voice.name)}
                className={`
                  w-full p-3 rounded-[var(--radius-sm)] text-left transition-colors
                  ${selectedVoice === voice.name ? "bg-accent/20 border-2 border-accent" : "bg-surface-light"}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs text-text-dim">{voice.lang}</div>
                  </div>
                  {selectedVoice === voice.name && (
                    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <svg className="w-3 h-3 text-bg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Voices */}
      {cloudVoices.length > 0 && (
        <div>
          <div className="text-sm text-text-dim mb-2 uppercase tracking-wide">
            Cloud Voices (higher quality, require internet)
          </div>
          <div className="space-y-2">
            {cloudVoices.slice(0, 5).map((voice) => (
              <button
                key={voice.name}
                onClick={() => selectVoice(voice.name)}
                className={`
                  w-full p-3 rounded-[var(--radius-sm)] text-left transition-colors
                  ${selectedVoice === voice.name ? "bg-accent/20 border-2 border-accent" : "bg-surface-light"}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs text-text-dim">{voice.lang}</div>
                  </div>
                  {selectedVoice === voice.name && (
                    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <svg className="w-3 h-3 text-bg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
