"use client";

import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VoiceSelector, VoiceBoxCloneSettings, AudioDeviceSelector } from "@/components/settings";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGE_LABELS, type CommandLanguage } from "@/lib/i18n/voiceCommands";
import { resetHints } from "@/lib/commandHints";
import { locales, localeNames, type Locale } from "@/i18n/config";

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

        {/* Local TTS Server */}
        <Card>
          <VoiceBoxCloneSettings />
        </Card>

        {/* Audio Devices */}
        <Card>
          <AudioDeviceSelector />
        </Card>

        {/* UI Language */}
        <Card>
          <h3 className="font-bold mb-4">Language</h3>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-dim">App Language</span>
            <select
              value={settings.uiLanguage}
              onChange={(e) => settings.updateSettings({ uiLanguage: e.target.value as Locale })}
              className="bg-surface-light text-text rounded-lg px-3 py-2 text-sm min-w-[120px]"
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-text-dim mt-2">
            Changes the app interface language. Voice command language is separate.
          </p>
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

            {/* Sound Effects (Earcons) */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Sound Effects</div>
                <div className="text-sm text-text-dim">
                  Audio cues for state changes
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ enableEarcons: !settings.enableEarcons })}
                className={`
                  w-14 h-8 rounded-full transition-colors relative
                  ${settings.enableEarcons ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all
                    ${settings.enableEarcons ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {/* Earcon Volume */}
            {settings.enableEarcons && (
              <div className="pl-4 border-l-2 border-surface-light">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-dim">Volume</span>
                  <span className="font-medium">{Math.round(settings.earconVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.earconVolume}
                  onChange={(e) => settings.updateSettings({ earconVolume: parseFloat(e.target.value) })}
                  className="w-full accent-accent h-2"
                />
              </div>
            )}

            {/* Command Hints */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Command Hints</div>
                <div className="text-sm text-text-dim">
                  Teach voice commands during rehearsal
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ enableHints: !settings.enableHints })}
                className={`
                  w-14 h-8 rounded-full transition-colors relative
                  ${settings.enableHints ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all
                    ${settings.enableHints ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {/* Reset Hints */}
            {settings.enableHints && (
              <div className="pl-4 border-l-2 border-surface-light">
                <button
                  onClick={() => {
                    resetHints();
                    alert("Command hints have been reset. You'll see hints again during your next rehearsal.");
                  }}
                  className="text-sm text-accent hover:underline"
                >
                  Reset Command Hints
                </button>
                <p className="text-xs text-text-dim mt-1">
                  Re-learn all voice commands from scratch
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Warm-Up Settings */}
        <Card>
          <h3 className="font-bold mb-4">Warm-Up Exercises</h3>
          <p className="text-sm text-text-dim mb-4">
            Voice warm-ups before rehearsal help you sound clear and confident.
          </p>

          <div className="space-y-4">
            {/* Enable Warm-Ups */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Warm-Ups</div>
                <div className="text-sm text-text-dim">
                  Show warm-up option on talk page
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ enableWarmups: !settings.enableWarmups })}
                className={`
                  w-14 h-8 rounded-full transition-colors relative
                  ${settings.enableWarmups ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all
                    ${settings.enableWarmups ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {settings.enableWarmups && (
              <>
                {/* Duration */}
                <div className="pl-4 border-l-2 border-surface-light">
                  <label className="block text-sm text-text-dim mb-2">Duration</label>
                  <div className="flex gap-2">
                    {(["short", "medium", "long"] as const).map((dur) => (
                      <button
                        key={dur}
                        onClick={() => settings.updateSettings({ warmupDuration: dur })}
                        className={`
                          flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                          ${settings.warmupDuration === dur
                            ? "bg-accent text-bg"
                            : "bg-surface-light text-text"
                          }
                        `}
                      >
                        {dur === "short" ? "1 min" : dur === "medium" ? "2 min" : "3 min"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-Prompt */}
                <div className="flex items-center justify-between pl-4 border-l-2 border-surface-light">
                  <div>
                    <div className="font-medium text-sm">Auto-Prompt</div>
                    <div className="text-xs text-text-dim">
                      Suggest warm-up before each rehearsal
                    </div>
                  </div>
                  <button
                    onClick={() => settings.updateSettings({ warmupAutoPrompt: !settings.warmupAutoPrompt })}
                    className={`
                      w-12 h-6 rounded-full transition-colors relative
                      ${settings.warmupAutoPrompt ? "bg-accent" : "bg-surface-light"}
                    `}
                  >
                    <div
                      className={`
                        absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all
                        ${settings.warmupAutoPrompt ? "left-6" : "left-0.5"}
                      `}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Practice Granularity */}
        <Card>
          <h3 className="font-bold mb-4">Practice Granularity</h3>
          <p className="text-sm text-text-dim mb-4">
            How to break down content during rehearsal
          </p>
          <div className="space-y-3">
            {(["slide", "paragraph", "sentence"] as const).map((level) => (
              <label key={level} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="granularity"
                  value={level}
                  checked={settings.defaultGranularity === level}
                  onChange={() => settings.updateSettings({ defaultGranularity: level })}
                  className="w-5 h-5 accent-accent"
                />
                <div>
                  <div className="font-medium capitalize">{level}</div>
                  <div className="text-sm text-text-dim">
                    {level === "slide" && "Practice entire slides at once"}
                    {level === "paragraph" && "Break slides into paragraphs"}
                    {level === "sentence" && "Fine-grained sentence practice"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* AI Coach */}
        <Card>
          <h3 className="font-bold mb-4">AI Coach</h3>
          <p className="text-sm text-text-dim mb-4">
            Get spoken coaching feedback after each session. Free by default — or bring your own API key for premium models.
          </p>

          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable AI Coaching</div>
                <div className="text-sm text-text-dim">
                  Feedback after Prompt/Test sessions
                </div>
              </div>
              <button
                onClick={() => settings.updateSettings({ enableAiCoach: !settings.enableAiCoach })}
                className={`
                  w-14 h-8 rounded-full transition-colors relative
                  ${settings.enableAiCoach ? "bg-accent" : "bg-surface-light"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all
                    ${settings.enableAiCoach ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {settings.enableAiCoach && (
              <>
                {/* Provider selector */}
                <div>
                  <label className="block text-sm text-text-dim mb-1">AI Provider</label>
                  <select
                    value={settings.aiProvider}
                    onChange={(e) => settings.updateSettings({ aiProvider: e.target.value as 'free' | 'anthropic' | 'openai' | 'google' })}
                    className="w-full bg-surface-light text-text border border-surface-light rounded-xl px-4 py-3"
                  >
                    <option value="free">Free (Gemini Flash — no key needed)</option>
                    <option value="google">Google Gemini (your own key)</option>
                    <option value="anthropic">Anthropic Claude (your own key)</option>
                    <option value="openai">OpenAI GPT (your own key)</option>
                  </select>
                </div>

                {/* API key input — only show for BYOK providers */}
                {settings.aiProvider !== 'free' && (
                  <div>
                    <label className="block text-sm text-text-dim mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={settings.aiApiKey ?? ''}
                      onChange={(e) => settings.updateSettings({ aiApiKey: e.target.value || null })}
                      placeholder={
                        settings.aiProvider === 'anthropic' ? 'sk-ant-...' :
                        settings.aiProvider === 'openai' ? 'sk-...' :
                        'AIza...'
                      }
                      className="w-full bg-surface-light text-text border border-surface-light rounded-xl px-4 py-3 font-mono text-sm"
                    />
                    <p className="text-xs text-text-dim mt-1">
                      Your key is stored only on this device.
                    </p>
                  </div>
                )}

                {/* Model override — advanced, collapsed by default */}
                {settings.aiProvider !== 'free' && (
                  <details className="text-sm">
                    <summary className="text-text-dim cursor-pointer">Advanced: Custom model</summary>
                    <input
                      type="text"
                      value={settings.aiModel ?? ''}
                      onChange={(e) => settings.updateSettings({ aiModel: e.target.value || null })}
                      placeholder={
                        settings.aiProvider === 'anthropic' ? 'claude-sonnet-4-20250514' :
                        settings.aiProvider === 'openai' ? 'gpt-4o-mini' :
                        'gemini-2.0-flash'
                      }
                      className="w-full mt-2 bg-surface-light text-text border border-surface-light rounded-xl px-4 py-3 font-mono text-sm"
                    />
                  </details>
                )}

                {settings.aiProvider === 'free' && (
                  <p className="text-xs text-text-dim bg-surface-light p-3 rounded-xl">
                    Free coaching uses Google Gemini Flash. Limited to ~20 sessions per hour. For unlimited coaching, add your own API key above.
                  </p>
                )}
              </>
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
