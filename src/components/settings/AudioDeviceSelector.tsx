"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/stores/settingsStore";
import * as earcons from "@/lib/audio/earcons";

interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export function AudioDeviceSelector() {
  const { preferredMicLabel, preferredSpeakerLabel, updateSettings } = useSettingsStore();
  const [mics, setMics] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [supportsOutputSelection, setSupportsOutputSelection] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const micDevices = devices
        .filter(d => d.kind === "audioinput" && d.deviceId)
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`, groupId: d.groupId }));

      const speakerDevices = devices
        .filter(d => d.kind === "audiooutput" && d.deviceId)
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}`, groupId: d.groupId }));

      setMics(micDevices);
      setSpeakers(speakerDevices);
      setHasPermission(micDevices.some(d => d.label && !d.label.startsWith("Microphone")));
    } catch (e) {
      console.warn("Failed to enumerate devices:", e);
    }
  }, []);

  useEffect(() => {
    // Check if setSinkId is supported
    const audio = document.createElement("audio");
    setSupportsOutputSelection(typeof (audio as HTMLAudioElement & { setSinkId?: unknown }).setSinkId === "function");

    loadDevices();

    // Listen for device changes
    navigator.mediaDevices?.addEventListener("devicechange", loadDevices);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", loadDevices);
  }, [loadDevices]);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      await loadDevices();
    } catch (e) {
      console.warn("Mic permission denied:", e);
    }
  };

  const handleMicChange = (label: string) => {
    const device = mics.find(d => d.label === label);
    updateSettings({
      preferredMicLabel: label,
      preferredMicGroupId: device?.groupId || "",
    });
  };

  const handleSpeakerChange = (label: string) => {
    const device = speakers.find(d => d.label === label);
    updateSettings({
      preferredSpeakerLabel: label,
      preferredSpeakerGroupId: device?.groupId || "",
    });
  };

  const testSpeaker = () => {
    earcons.sessionStart();
  };

  if (typeof window === "undefined") return null;

  return (
    <div>
      <h3 className="font-bold mb-4">Audio Devices</h3>

      {!hasPermission && (
        <div className="mb-4">
          <p className="text-sm text-text-dim mb-2">
            Grant microphone access to see device names
          </p>
          <Button onClick={requestPermission} variant="secondary" className="text-sm">
            Allow Microphone
          </Button>
        </div>
      )}

      {/* Microphone */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Microphone</label>
        <select
          value={preferredMicLabel}
          onChange={(e) => handleMicChange(e.target.value)}
          className="w-full bg-surface-light rounded-[var(--radius-sm)] px-3 py-2 text-sm"
        >
          <option value="">System Default</option>
          {mics.map(d => (
            <option key={d.deviceId} value={d.label}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Speaker */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Speaker</label>
        {supportsOutputSelection ? (
          <div className="flex gap-2">
            <select
              value={preferredSpeakerLabel}
              onChange={(e) => handleSpeakerChange(e.target.value)}
              className="flex-1 bg-surface-light rounded-[var(--radius-sm)] px-3 py-2 text-sm"
            >
              <option value="">System Default</option>
              {speakers.map(d => (
                <option key={d.deviceId} value={d.label}>{d.label}</option>
              ))}
            </select>
            <Button onClick={testSpeaker} variant="secondary" className="text-sm px-3">
              Test
            </Button>
          </div>
        ) : (
          <p className="text-sm text-text-dim">
            Speaker selection not supported in this browser
          </p>
        )}
      </div>

      <p className="text-xs text-text-dim">
        Note: Browser TTS uses system default speaker. Selection applies to earcons and ElevenLabs only.
      </p>
    </div>
  );
}
