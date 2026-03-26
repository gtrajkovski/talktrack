"use client";

import { useEffect, useState } from "react";
import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/stores/settingsStore";
import { getAvailableVoices, type VoiceOption } from "@/lib/speech/voices";

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    getAvailableVoices().then(setVoices);
  }, []);

  return (
    <AppShell>
      <Header title="Settings" />

      <div className="px-4 py-4 space-y-4">
        {/* Voice Settings */}
        <Card>
          <h2 className="font-bold mb-4">Voice</h2>

          <div className="space-y-4">
            {/* Voice Selection */}
            <div>
              <label className="block text-sm text-text-dim mb-2">
                Voice
              </label>
              <select
                value={settings.voiceName}
                onChange={(e) => settings.updateSettings({ voiceName: e.target.value })}
                className="w-full bg-surface-light text-text rounded-[var(--radius-sm)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">System Default</option>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} {voice.isLocal ? "(Local)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Speech Rate */}
            <div>
              <label className="block text-sm text-text-dim mb-2">
                Speech Rate: {settings.speechRate.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={settings.speechRate}
                onChange={(e) => settings.updateSettings({ speechRate: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-text-dim mt-1">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Rehearsal Settings */}
        <Card>
          <h2 className="font-bold mb-4">Rehearsal</h2>

          <div className="space-y-4">
            {/* Voice Commands */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Voice Commands</div>
                <div className="text-sm text-text-dim">
                  Say &quot;next&quot;, &quot;reveal&quot;, etc.
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ enableVoiceCommands: !settings.enableVoiceCommands })}
                className={`
                  w-14 h-8 rounded-full transition-colors
                  ${settings.enableVoiceCommands ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    w-6 h-6 rounded-full bg-white shadow transition-transform
                    ${settings.enableVoiceCommands ? "translate-x-7" : "translate-x-1"}
                  `}
                />
              </button>
            </div>

            {/* Auto Advance */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto Advance</div>
                <div className="text-sm text-text-dim">
                  Move to next slide automatically
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ autoAdvance: !settings.autoAdvance })}
                className={`
                  w-14 h-8 rounded-full transition-colors
                  ${settings.autoAdvance ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    w-6 h-6 rounded-full bg-white shadow transition-transform
                    ${settings.autoAdvance ? "translate-x-7" : "translate-x-1"}
                  `}
                />
              </button>
            </div>

            {/* Auto Advance Delay */}
            {settings.autoAdvance && (
              <div>
                <label className="block text-sm text-text-dim mb-2">
                  Delay before advancing: {settings.autoAdvanceDelay}s
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={settings.autoAdvanceDelay}
                  onChange={(e) => settings.updateSettings({ autoAdvanceDelay: parseFloat(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
            )}

            {/* Words Per Minute */}
            <div>
              <label className="block text-sm text-text-dim mb-2">
                Reading pace: {settings.wordsPerMinute} words/min
              </label>
              <input
                type="range"
                min="80"
                max="150"
                step="5"
                value={settings.wordsPerMinute}
                onChange={(e) => settings.updateSettings({ wordsPerMinute: parseInt(e.target.value) })}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-text-dim mt-1">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Reset */}
        <Button variant="danger" onClick={settings.resetSettings}>
          Reset to Defaults
        </Button>
      </div>
    </AppShell>
  );
}
