"use client";

import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VoiceSelector } from "@/components/settings";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGE_LABELS, type CommandLanguage } from "@/lib/i18n/voiceCommands";

export default function SettingsPage() {
  const settings = useSettingsStore();

  return (
    <AppShell>
      <Header title="Settings" />

      <div className="px-4 py-4 space-y-4">
        {/* Voice Selection */}
        <Card>
          <VoiceSelector />
        </Card>

        {/* Speech Rate */}
        <Card>
          <h3 className="font-bold mb-4">Speech Rate</h3>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-dim">Speed</span>
              <span className="font-medium">{settings.speechRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={settings.speechRate}
              onChange={(e) => settings.updateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-full accent-accent h-2"
            />
            <div className="flex justify-between text-xs text-text-dim mt-1">
              <span>Slower</span>
              <span>Normal</span>
              <span>Faster</span>
            </div>
          </div>
        </Card>

        {/* Rehearsal Settings */}
        <Card>
          <h3 className="font-bold mb-4">Rehearsal</h3>

          <div className="space-y-4">
            {/* Voice Commands */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Voice Commands</div>
                <div className="text-sm text-text-dim">
                  Say &quot;next&quot;, &quot;reveal&quot;, &quot;help&quot;
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ enableVoiceCommands: !settings.enableVoiceCommands })}
                className={`
                  w-14 h-8 rounded-full transition-colors relative
                  ${settings.enableVoiceCommands ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all
                    ${settings.enableVoiceCommands ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {/* Command Language */}
            {settings.enableVoiceCommands && (
              <div className="pl-4 border-l-2 border-surface-light">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-dim">Command Language</span>
                  <select
                    value={settings.commandLanguage}
                    onChange={(e) => settings.updateSettings({ commandLanguage: e.target.value as CommandLanguage })}
                    className="bg-surface-light text-text rounded-lg px-3 py-2 text-sm min-w-[120px]"
                  >
                    {(Object.keys(LANGUAGE_LABELS) as CommandLanguage[]).map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_LABELS[lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
                  w-14 h-8 rounded-full transition-colors relative
                  ${settings.autoAdvance ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all
                    ${settings.autoAdvance ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {/* Auto Advance Delay */}
            {settings.autoAdvance && (
              <div className="pl-4 border-l-2 border-surface-light">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-dim">Delay</span>
                  <span className="font-medium">{settings.autoAdvanceDelay}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={settings.autoAdvanceDelay}
                  onChange={(e) => settings.updateSettings({ autoAdvanceDelay: parseFloat(e.target.value) })}
                  className="w-full accent-accent h-2"
                />
              </div>
            )}

            {/* Countdown Timer */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Countdown Timer</div>
                <div className="text-sm text-text-dim">
                  Show time pressure during practice
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ showTimer: !settings.showTimer })}
                className={`
                  w-14 h-8 rounded-full transition-colors relative
                  ${settings.showTimer ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all
                    ${settings.showTimer ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {/* Timer Warning Threshold */}
            {settings.showTimer && (
              <div className="pl-4 border-l-2 border-surface-light">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-dim">Warning at</span>
                  <span className="font-medium">{settings.timerWarningSeconds}s remaining</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={settings.timerWarningSeconds}
                  onChange={(e) => settings.updateSettings({ timerWarningSeconds: parseInt(e.target.value) })}
                  className="w-full accent-accent h-2"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Reading Pace */}
        <Card>
          <h3 className="font-bold mb-4">Time Estimates</h3>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-dim">Reading pace</span>
              <span className="font-medium">{settings.wordsPerMinute} words/min</span>
            </div>
            <input
              type="range"
              min="80"
              max="150"
              step="5"
              value={settings.wordsPerMinute}
              onChange={(e) => settings.updateSettings({ wordsPerMinute: parseInt(e.target.value) })}
              className="w-full accent-accent h-2"
            />
            <div className="flex justify-between text-xs text-text-dim mt-1">
              <span>Careful</span>
              <span>Natural</span>
              <span>Quick</span>
            </div>
          </div>
        </Card>

        {/* Reset */}
        <Button variant="danger" onClick={settings.resetSettings}>
          Reset to Defaults
        </Button>

        {/* App Info */}
        <Card padding="sm">
          <div className="text-center text-sm text-text-dim">
            <div className="font-bold text-text mb-1">TalkTrack</div>
            <div>Voice-first rehearsal coach</div>
            <div className="mt-2 text-xs">v1.0.0</div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
