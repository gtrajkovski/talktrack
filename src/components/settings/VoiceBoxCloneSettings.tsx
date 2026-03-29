"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { speak, stop } from "@/lib/speech/synthesis";
import {
  checkHealth,
  fetchVoices,
  type VoiceBoxCloneVoice,
} from "@/lib/speech/voiceboxClone";
import { useSettingsStore } from "@/stores/settingsStore";

export function VoiceBoxCloneSettings() {
  const {
    speechRate,
    useVoiceBoxClone,
    voiceBoxCloneUrl,
    voiceBoxCloneVoiceId,
    updateSettings,
  } = useSettingsStore();

  const [isExpanded, setIsExpanded] = useState(!!voiceBoxCloneUrl && voiceBoxCloneUrl !== "http://localhost:5000");
  const [urlInput, setUrlInput] = useState(voiceBoxCloneUrl);
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "healthy" | "unhealthy">("idle");
  const [voices, setVoices] = useState<VoiceBoxCloneVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Check health when URL changes or on mount
  const checkServerHealth = useCallback(async () => {
    if (!urlInput.trim()) {
      setHealthStatus("idle");
      return;
    }

    setHealthStatus("checking");
    const isHealthy = await checkHealth(urlInput.trim());
    setHealthStatus(isHealthy ? "healthy" : "unhealthy");

    if (isHealthy) {
      // Save the URL and load voices
      updateSettings({ voiceBoxCloneUrl: urlInput.trim() });
      loadVoices(urlInput.trim());
    }
  }, [urlInput, updateSettings]);

  // Load voices from server
  const loadVoices = async (serverUrl: string) => {
    setLoadingVoices(true);
    try {
      const voiceList = await fetchVoices(serverUrl);
      setVoices(voiceList);
    } catch (e) {
      console.warn("Failed to fetch VoiceBox Clone voices:", e);
      setVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Check health on mount if URL is set
  useEffect(() => {
    if (voiceBoxCloneUrl && voiceBoxCloneUrl !== "http://localhost:5000") {
      setUrlInput(voiceBoxCloneUrl);
      checkServerHealth();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    checkServerHealth();
  };

  const handleDisconnect = () => {
    setUrlInput("http://localhost:5000");
    setHealthStatus("idle");
    setVoices([]);
    updateSettings({
      voiceBoxCloneUrl: "http://localhost:5000",
      voiceBoxCloneVoiceId: "",
      useVoiceBoxClone: false,
    });
  };

  const testVoice = (voiceId: string) => {
    stop();
    setIsPlaying(true);

    speak("Hello! This is how I will read your presentation notes.", {
      rate: speechRate,
      voiceBoxClone: {
        serverUrl: voiceBoxCloneUrl,
        voiceId,
      },
      onEnd: () => setIsPlaying(false),
    });
  };

  const selectVoice = (voiceId: string) => {
    updateSettings({
      voiceBoxCloneVoiceId: voiceId,
      useVoiceBoxClone: true,
      useElevenLabs: false, // Disable ElevenLabs when using VoiceBox Clone
      hasSelectedVoice: true,
    });
    testVoice(voiceId);
  };

  return (
    <div className="border border-surface-light rounded-[var(--radius-sm)] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-surface-light/50 hover:bg-surface-light transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🖥️</span>
          <div className="text-left">
            <div className="font-semibold">Local TTS Server</div>
            <div className="text-sm text-text-dim">VoiceBox Clone / Coqui / XTTS</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {healthStatus === "healthy" && (
            <span className="w-2 h-2 rounded-full bg-success" />
          )}
          <svg
            className={`w-5 h-5 text-text-dim transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-surface-light">
          {/* Server URL Input */}
          {healthStatus !== "healthy" && (
            <div className="space-y-3">
              <div className="text-sm text-text-dim">
                Connect to a local TTS server running on your machine.
                Supports VoiceBox Clone, Coqui TTS, and other REST-based TTS servers.
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setHealthStatus("idle");
                  }}
                  placeholder="http://localhost:5000"
                  className="flex-1 bg-surface-light rounded-lg px-4 py-3 text-text placeholder:text-text-dim"
                />
                <Button
                  variant="primary"
                  fullWidth={false}
                  onClick={handleConnect}
                  disabled={healthStatus === "checking" || !urlInput.trim()}
                  className="px-4"
                >
                  {healthStatus === "checking" ? "..." : "Connect"}
                </Button>
              </div>
              {healthStatus === "unhealthy" && (
                <div className="text-sm text-danger">
                  Cannot connect to server. Make sure the TTS server is running.
                </div>
              )}
              <div className="text-xs text-text-dim">
                Expected API: POST /api/synthesize, GET /api/voices, GET /api/health
              </div>
            </div>
          )}

          {/* Connected State */}
          {healthStatus === "healthy" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-success/10 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-success">Connected to {urlInput}</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-text-dim hover:text-danger transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Stop Button */}
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
                  Stop Preview
                </Button>
              )}

              {/* Voice List */}
              {loadingVoices ? (
                <div className="text-center py-4 text-text-dim">Loading voices...</div>
              ) : voices.length > 0 ? (
                <div className="space-y-2">
                  {voices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => selectVoice(voice.id)}
                      className={`
                        w-full p-3 rounded-[var(--radius-sm)] text-left transition-colors
                        ${useVoiceBoxClone && voiceBoxCloneVoiceId === voice.id
                          ? "bg-accent/20 border-2 border-accent"
                          : "bg-surface-light"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{voice.name}</span>
                            <span className="text-xs bg-blue/20 text-blue px-2 py-0.5 rounded">
                              Local
                            </span>
                          </div>
                          {(voice.language || voice.description) && (
                            <div className="text-xs text-text-dim">
                              {voice.language}
                              {voice.language && voice.description && " • "}
                              {voice.description}
                            </div>
                          )}
                        </div>
                        {useVoiceBoxClone && voiceBoxCloneVoiceId === voice.id && (
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
                  No voices found. Check your TTS server configuration.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
