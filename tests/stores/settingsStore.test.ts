import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { DEFAULT_SETTINGS } from '@/types/settings';

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to default state between tests
    useSettingsStore.getState().resetSettings();
  });

  describe('Default Values', () => {
    it('1. Default speechRate is 0.95', () => {
      expect(useSettingsStore.getState().speechRate).toBe(0.95);
    });

    it('2. Default theme is "dark"', () => {
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('3. Default enableVoiceCommands is true', () => {
      expect(useSettingsStore.getState().enableVoiceCommands).toBe(true);
    });

    it('4. Default wordsPerMinute is 100', () => {
      expect(useSettingsStore.getState().wordsPerMinute).toBe(100);
    });

    it('5. Default autoAdvance is true', () => {
      expect(useSettingsStore.getState().autoAdvance).toBe(true);
    });

    it('6. Default autoAdvanceDelay is 1', () => {
      expect(useSettingsStore.getState().autoAdvanceDelay).toBe(1);
    });

    it('7. Default enableEarcons is true', () => {
      expect(useSettingsStore.getState().enableEarcons).toBe(true);
    });

    it('8. Default earconVolume is 0.3', () => {
      expect(useSettingsStore.getState().earconVolume).toBe(0.3);
    });

    it('9. Default enableHints is true', () => {
      expect(useSettingsStore.getState().enableHints).toBe(true);
    });

    it('10. Default commandLanguage is "en"', () => {
      expect(useSettingsStore.getState().commandLanguage).toBe('en');
    });
  });

  describe('Update Methods', () => {
    it('11. setSpeechRate(1.1) updates speechRate', () => {
      useSettingsStore.getState().updateSettings({ speechRate: 1.1 });
      expect(useSettingsStore.getState().speechRate).toBe(1.1);
    });

    it('12. setVoiceName updates voiceName', () => {
      useSettingsStore.getState().updateSettings({ voiceName: 'Google UK English Male' });
      expect(useSettingsStore.getState().voiceName).toBe('Google UK English Male');
    });

    it('13. setTheme(light) updates theme', () => {
      useSettingsStore.getState().updateSettings({ theme: 'light' });
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('14. setWordsPerMinute(130) updates wordsPerMinute', () => {
      useSettingsStore.getState().updateSettings({ wordsPerMinute: 130 });
      expect(useSettingsStore.getState().wordsPerMinute).toBe(130);
    });

    it('15. setEnableVoiceCommands(false) updates enableVoiceCommands', () => {
      useSettingsStore.getState().updateSettings({ enableVoiceCommands: false });
      expect(useSettingsStore.getState().enableVoiceCommands).toBe(false);
    });

    it('16. updateSettings can update multiple fields at once', () => {
      useSettingsStore.getState().updateSettings({
        speechRate: 0.8,
        theme: 'light',
        wordsPerMinute: 120,
      });
      const state = useSettingsStore.getState();
      expect(state.speechRate).toBe(0.8);
      expect(state.theme).toBe('light');
      expect(state.wordsPerMinute).toBe(120);
    });
  });

  describe('ElevenLabs Settings', () => {
    it('17. ElevenLabs apiKey defaults to empty string', () => {
      expect(useSettingsStore.getState().elevenLabsApiKey).toBe('');
    });

    it('18. ElevenLabs voiceId defaults to empty string', () => {
      expect(useSettingsStore.getState().elevenLabsVoiceId).toBe('');
    });

    it('19. useElevenLabs defaults to false', () => {
      expect(useSettingsStore.getState().useElevenLabs).toBe(false);
    });

    it('20. ElevenLabs settings can be updated', () => {
      useSettingsStore.getState().updateSettings({
        elevenLabsApiKey: 'test-api-key',
        elevenLabsVoiceId: 'test-voice-id',
        useElevenLabs: true,
      });
      const state = useSettingsStore.getState();
      expect(state.elevenLabsApiKey).toBe('test-api-key');
      expect(state.elevenLabsVoiceId).toBe('test-voice-id');
      expect(state.useElevenLabs).toBe(true);
    });
  });

  describe('Granularity Settings', () => {
    it('21. defaultGranularity defaults to "slide"', () => {
      expect(useSettingsStore.getState().defaultGranularity).toBe('slide');
    });

    it('22. setDefaultGranularity(sentence) updates correctly', () => {
      useSettingsStore.getState().updateSettings({ defaultGranularity: 'sentence' });
      expect(useSettingsStore.getState().defaultGranularity).toBe('sentence');
    });

    it('23. setDefaultGranularity(paragraph) updates correctly', () => {
      useSettingsStore.getState().updateSettings({ defaultGranularity: 'paragraph' });
      expect(useSettingsStore.getState().defaultGranularity).toBe('paragraph');
    });
  });

  describe('VoiceBox Clone Settings', () => {
    it('24. useVoiceBoxClone defaults to false', () => {
      expect(useSettingsStore.getState().useVoiceBoxClone).toBe(false);
    });

    it('25. voiceBoxCloneUrl defaults to localhost:5000', () => {
      expect(useSettingsStore.getState().voiceBoxCloneUrl).toBe('http://localhost:5000');
    });

    it('26. voiceBoxCloneVoiceId defaults to empty string', () => {
      expect(useSettingsStore.getState().voiceBoxCloneVoiceId).toBe('');
    });
  });

  describe('Reset Settings', () => {
    it('27. resetSettings restores all defaults', () => {
      // Change several settings
      useSettingsStore.getState().updateSettings({
        speechRate: 1.5,
        theme: 'light',
        enableVoiceCommands: false,
        wordsPerMinute: 200,
        defaultGranularity: 'sentence',
      });

      // Reset
      useSettingsStore.getState().resetSettings();

      // Verify defaults
      const state = useSettingsStore.getState();
      expect(state.speechRate).toBe(DEFAULT_SETTINGS.speechRate);
      expect(state.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(state.enableVoiceCommands).toBe(DEFAULT_SETTINGS.enableVoiceCommands);
      expect(state.wordsPerMinute).toBe(DEFAULT_SETTINGS.wordsPerMinute);
      expect(state.defaultGranularity).toBe(DEFAULT_SETTINGS.defaultGranularity);
    });
  });

  describe('Timer Settings', () => {
    it('28. showTimer defaults to false', () => {
      expect(useSettingsStore.getState().showTimer).toBe(false);
    });

    it('29. timerWarningSeconds defaults to 10', () => {
      expect(useSettingsStore.getState().timerWarningSeconds).toBe(10);
    });
  });

  describe('Onboarding Settings', () => {
    it('30. hasSeenOnboarding defaults to false', () => {
      expect(useSettingsStore.getState().hasSeenOnboarding).toBe(false);
    });

    it('31. hasSelectedVoice defaults to false', () => {
      expect(useSettingsStore.getState().hasSelectedVoice).toBe(false);
    });
  });
});
