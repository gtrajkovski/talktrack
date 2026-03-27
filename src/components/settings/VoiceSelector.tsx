"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { speak, stop } from "@/lib/speech/synthesis";
import {
  getAvailableVoices,
  type VoiceOption,
  type VoiceQuality,
} from "@/lib/speech/voices";
import {
  fetchVoices as fetchElevenLabsVoices,
  testApiKey,
  type ElevenLabsVoice,
} from "@/lib/speech/elevenlabs";
import { useSettingsStore } from "@/stores/settingsStore";

const QUALITY_LABELS: Record<VoiceQuality, string> = {
  premium: "Premium",
  good: "Good",
  acceptable: "OK",
  unknown: "",
};

const QUALITY_COLORS: Record<VoiceQuality, string> = {
  premium: "bg-accent text-bg",
  good: "bg-blue text-white",
  acceptable: "bg-surface-light text-text-dim",
  unknown: "bg-surface-light text-text-dim",
};

export function VoiceSelector() {
  const {
    voiceName,
    speechRate,
    useElevenLabs,
    elevenLabsApiKey,
    elevenLabsVoiceId,
    updateSettings,
  } = useSettingsStore();

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voiceName);
  const [showElevenLabs, setShowElevenLabs] = useState(!!elevenLabsApiKey);
  const [apiKeyInput, setApiKeyInput] = useState(elevenLabsApiKey);
  const [apiKeyStatus, setApiKeyStatus] = useState<"idle" | "testing" | "valid" | "invalid">(
    elevenLabsApiKey ? "valid" : "idle"
  );
  const [loadingVoices, setLoadingVoices] = useState(false);

  useEffect(() => {
    getAvailableVoices().then(setVoices);
  }, []);

  useEffect(() => {
    setSelectedVoice(voiceName);
  }, [voiceName]);

  // Load ElevenLabs voices when API key is valid
  useEffect(() => {
    if (elevenLabsApiKey && apiKeyStatus === "valid") {
      setLoadingVoices(true);
      fetchElevenLabsVoices(elevenLabsApiKey)
        .then(setElevenLabsVoices)
        .catch((e) => {
          console.warn("Failed to fetch ElevenLabs voices:", e);
          setElevenLabsVoices([]);
        })
        .finally(() => setLoadingVoices(false));
    }
  }, [elevenLabsApiKey, apiKeyStatus]);

  const testVoice = (voice: string, isElevenLabs = false) => {
    stop();
    setIsPlaying(true);

    const elevenLabsConfig =
      isElevenLabs && elevenLabsApiKey
        ? { apiKey: elevenLabsApiKey, voiceId: voice }
        : undefined;

    speak("Hello! This is how I will read your presentation notes.", {
      rate: speechRate,
      voiceName: isElevenLabs ? undefined : voice || undefined,
      elevenLabs: elevenLabsConfig,
      onEnd: () => setIsPlaying(false),
    });
  };

  const selectVoice = (voice: string, isElevenLabs = false) => {
    setSelectedVoice(voice);
    if (isElevenLabs) {
      updateSettings({
        elevenLabsVoiceId: voice,
        useElevenLabs: true,
        hasSelectedVoice: true,
      });
    } else {
      updateSettings({
        voiceName: voice,
        useElevenLabs: false,
        hasSelectedVoice: true,
      });
    }
    testVoice(voice, isElevenLabs);
  };

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyStatus("invalid");
      return;
    }

    setApiKeyStatus("testing");
    const isValid = await testApiKey(apiKeyInput.trim());

    if (isValid) {
      setApiKeyStatus("valid");
      updateSettings({ elevenLabsApiKey: apiKeyInput.trim() });
    } else {
      setApiKeyStatus("invalid");
    }
  };

  const handleRemoveApiKey = () => {
    setApiKeyInput("");
    setApiKeyStatus("idle");
    setElevenLabsVoices([]);
    updateSettings({
      elevenLabsApiKey: "",
      elevenLabsVoiceId: "",
      useElevenLabs: false,
    });
  };

  // Group system voices by quality
  const premiumVoices = voices.filter((v) => v.quality === "premium");
  const goodVoices = voices.filter((v) => v.quality === "good");
  const otherVoices = voices.filter(
    (v) => v.quality === "acceptable" || v.quality === "unknown"
  );

  const isOnline = typeof window !== "undefined" && navigator.onLine;

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

      {/* Online/Offline Status */}
      {!isOnline && (
        <div className="flex items-center gap-2 text-sm text-text-dim bg-surface-light rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-danger" />
          Offline — using local voices only
        </div>
      )}

      {/* System Default */}
      <button
        onClick={() => selectVoice("")}
        className={`
          w-full p-4 rounded-[var(--radius-sm)] text-left transition-colors
          ${!useElevenLabs && selectedVoice === "" ? "bg-accent/20 border-2 border-accent" : "bg-surface-light"}
        `}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">System Default</div>
            <div className="text-sm text-text-dim">Uses your device&apos;s preferred voice</div>
          </div>
          {!useElevenLabs && selectedVoice === "" && (
            <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
              <svg className="w-4 h-4 text-bg" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </button>

      {/* ElevenLabs Section */}
      <div className="border border-surface-light rounded-[var(--radius-sm)] overflow-hidden">
        <button
          onClick={() => setShowElevenLabs(!showElevenLabs)}
          className="w-full p-4 flex items-center justify-between bg-surface-light/50 hover:bg-surface-light transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">✨</span>
            <div className="text-left">
              <div className="font-semibold">Premium Voices</div>
              <div className="text-sm text-text-dim">ElevenLabs AI voices</div>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-text-dim transition-transform ${showElevenLabs ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showElevenLabs && (
          <div className="p-4 space-y-4 border-t border-surface-light">
            {/* API Key Input */}
            {apiKeyStatus !== "valid" && (
              <div className="space-y-3">
                <div className="text-sm text-text-dim">
                  Enter your ElevenLabs API key to unlock premium AI voices.
                  Get one free at{" "}
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline"
                  >
                    elevenlabs.io
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setApiKeyStatus("idle");
                    }}
                    placeholder="xi-xxxxxxxxxxxxxxxx"
                    className="flex-1 bg-surface-light rounded-lg px-4 py-3 text-text placeholder:text-text-dim"
                  />
                  <Button
                    variant="primary"
                    fullWidth={false}
                    onClick={handleTestApiKey}
                    disabled={apiKeyStatus === "testing" || !apiKeyInput.trim()}
                    className="px-4"
                  >
                    {apiKeyStatus === "testing" ? "..." : "Connect"}
                  </Button>
                </div>
                {apiKeyStatus === "invalid" && (
                  <div className="text-sm text-danger">
                    Invalid API key. Please check and try again.
                  </div>
                )}
              </div>
            )}

            {/* Connected State */}
            {apiKeyStatus === "valid" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-success/10 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-sm text-success">Connected to ElevenLabs</span>
                  </div>
                  <button
                    onClick={handleRemoveApiKey}
                    className="text-sm text-text-dim hover:text-danger transition-colors"
                  >
                    Disconnect
                  </button>
                </div>

                {/* ElevenLabs Voice List */}
                {loadingVoices ? (
                  <div className="text-center py-4 text-text-dim">Loading voices...</div>
                ) : elevenLabsVoices.length > 0 ? (
                  <div className="space-y-2">
                    {elevenLabsVoices.map((voice) => (
                      <button
                        key={voice.voice_id}
                        onClick={() => selectVoice(voice.voice_id, true)}
                        className={`
                          w-full p-3 rounded-[var(--radius-sm)] text-left transition-colors
                          ${useElevenLabs && elevenLabsVoiceId === voice.voice_id
                            ? "bg-accent/20 border-2 border-accent"
                            : "bg-surface-light"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{voice.name}</span>
                              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                                AI
                              </span>
                            </div>
                            <div className="text-xs text-text-dim capitalize">
                              {voice.category}
                              {voice.labels?.accent && ` • ${voice.labels.accent}`}
                            </div>
                          </div>
                          {useElevenLabs && elevenLabsVoiceId === voice.voice_id && (
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
                ) : (
                  <div className="text-center py-4 text-text-dim">
                    No voices found. Check your ElevenLabs subscription.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium System Voices */}
      {premiumVoices.length > 0 && (
        <div>
          <div className="text-sm text-text-dim mb-2 uppercase tracking-wide flex items-center gap-2">
            Premium System Voices
            <span className={`text-xs px-1.5 py-0.5 rounded ${QUALITY_COLORS.premium}`}>
              {QUALITY_LABELS.premium}
            </span>
          </div>
          <div className="space-y-2">
            {premiumVoices.map((voice) => (
              <VoiceButton
                key={voice.name}
                voice={voice}
                isSelected={!useElevenLabs && selectedVoice === voice.name}
                onSelect={() => selectVoice(voice.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Good System Voices */}
      {goodVoices.length > 0 && (
        <div>
          <div className="text-sm text-text-dim mb-2 uppercase tracking-wide flex items-center gap-2">
            Good System Voices
            <span className={`text-xs px-1.5 py-0.5 rounded ${QUALITY_COLORS.good}`}>
              {QUALITY_LABELS.good}
            </span>
          </div>
          <div className="space-y-2">
            {goodVoices.slice(0, 5).map((voice) => (
              <VoiceButton
                key={voice.name}
                voice={voice}
                isSelected={!useElevenLabs && selectedVoice === voice.name}
                onSelect={() => selectVoice(voice.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other System Voices (collapsed by default) */}
      {otherVoices.length > 0 && (
        <details className="group">
          <summary className="text-sm text-text-dim mb-2 uppercase tracking-wide cursor-pointer list-none flex items-center gap-2">
            <svg
              className="w-4 h-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Other Voices ({otherVoices.length})
          </summary>
          <div className="space-y-2 mt-2">
            {otherVoices.map((voice) => (
              <VoiceButton
                key={voice.name}
                voice={voice}
                isSelected={!useElevenLabs && selectedVoice === voice.name}
                onSelect={() => selectVoice(voice.name)}
                showQuality
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function VoiceButton({
  voice,
  isSelected,
  onSelect,
  showQuality = false,
}: {
  voice: VoiceOption;
  isSelected: boolean;
  onSelect: () => void;
  showQuality?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-3 rounded-[var(--radius-sm)] text-left transition-colors
        ${isSelected ? "bg-accent/20 border-2 border-accent" : "bg-surface-light"}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{voice.name}</span>
            {showQuality && voice.quality !== "unknown" && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${QUALITY_COLORS[voice.quality]}`}>
                {QUALITY_LABELS[voice.quality]}
              </span>
            )}
            {voice.isLocal && (
              <span className="text-xs text-text-dim">(offline)</span>
            )}
          </div>
          <div className="text-xs text-text-dim">{voice.lang}</div>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
            <svg className="w-3 h-3 text-bg" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
