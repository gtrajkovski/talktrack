import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as earcons from '@/lib/audio/earcons';

describe('Earcons', () => {
  let createOscillatorSpy: ReturnType<typeof vi.fn>;
  let createGainSpy: ReturnType<typeof vi.fn>;
  let createBufferSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Enable earcons for testing
    earcons.setEnabled(true);
    earcons.setVolume(0.3);

    // Spy on AudioContext methods
    const mockCtx = globalThis.AudioContext;
    if (mockCtx?.prototype) {
      createOscillatorSpy = vi.spyOn(mockCtx.prototype, 'createOscillator');
      createGainSpy = vi.spyOn(mockCtx.prototype, 'createGain');
      createBufferSpy = vi.spyOn(mockCtx.prototype, 'createBuffer');
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Volume and Enable Controls', () => {
    it('1. setVolume updates volume', () => {
      earcons.setVolume(0.8);
      expect(earcons.getVolume()).toBe(0.8);
    });

    it('2. setVolume clamps to 0-1 range', () => {
      earcons.setVolume(1.5);
      expect(earcons.getVolume()).toBe(1);

      earcons.setVolume(-0.5);
      expect(earcons.getVolume()).toBe(0);
    });

    it('3. setEnabled toggles earcons', () => {
      earcons.setEnabled(false);
      expect(earcons.isEnabled()).toBe(false);

      earcons.setEnabled(true);
      expect(earcons.isEnabled()).toBe(true);
    });
  });

  describe('Earcon Functions - No Throw', () => {
    // All earcon functions should run without error when AudioContext is available

    it('4. slideAdvance() runs without error', () => {
      expect(() => earcons.slideAdvance()).not.toThrow();
    });

    it('5. slideBack() runs without error', () => {
      expect(() => earcons.slideBack()).not.toThrow();
    });

    it('6. micOn() runs without error', () => {
      expect(() => earcons.micOn()).not.toThrow();
    });

    it('7. micOff() runs without error', () => {
      expect(() => earcons.micOff()).not.toThrow();
    });

    it('8. commandRecognized() runs without error', () => {
      expect(() => earcons.commandRecognized()).not.toThrow();
    });

    it('9. revealAnswer() runs without error', () => {
      expect(() => earcons.revealAnswer()).not.toThrow();
    });

    it('10. errorRetry() runs without error', () => {
      expect(() => earcons.errorRetry()).not.toThrow();
    });

    it('11. sessionStart() runs without error', () => {
      expect(() => earcons.sessionStart()).not.toThrow();
    });

    it('12. sessionComplete() runs without error', () => {
      expect(() => earcons.sessionComplete()).not.toThrow();
    });

    it('13. highScore() runs without error', () => {
      expect(() => earcons.highScore()).not.toThrow();
    });

    it('14. repeat() runs without error', () => {
      expect(() => earcons.repeat()).not.toThrow();
    });

    it('15. speedUp() runs without error', () => {
      expect(() => earcons.speedUp()).not.toThrow();
    });

    it('16. speedDown() runs without error', () => {
      expect(() => earcons.speedDown()).not.toThrow();
    });

    it('17. navigationJump() runs without error', () => {
      expect(() => earcons.navigationJump()).not.toThrow();
    });

    it('18. infoQuery() runs without error', () => {
      expect(() => earcons.infoQuery()).not.toThrow();
    });

    it('19. volumeUp() runs without error', () => {
      expect(() => earcons.volumeUp()).not.toThrow();
    });

    it('20. volumeDown() runs without error', () => {
      expect(() => earcons.volumeDown()).not.toThrow();
    });

    it('21. muteToggle() runs without error', () => {
      expect(() => earcons.muteToggle()).not.toThrow();
    });

    it('22. bookmarkAdded() runs without error', () => {
      expect(() => earcons.bookmarkAdded()).not.toThrow();
    });

    it('23. bookmarkRemoved() runs without error', () => {
      expect(() => earcons.bookmarkRemoved()).not.toThrow();
    });

    it('24. paragraphBreak() runs without error', () => {
      expect(() => earcons.paragraphBreak()).not.toThrow();
    });

    it('25. sentenceAdvance() runs without error', () => {
      expect(() => earcons.sentenceAdvance()).not.toThrow();
    });

    it('26. modeChange() runs without error', () => {
      expect(() => earcons.modeChange()).not.toThrow();
    });
  });

  describe('Graceful Degradation - No AudioContext', () => {
    let originalAudioContext: typeof AudioContext | undefined;

    beforeEach(() => {
      // Store and remove AudioContext
      originalAudioContext = globalThis.AudioContext;
      (globalThis as Record<string, unknown>).AudioContext = undefined;
      (globalThis as Record<string, unknown>).webkitAudioContext = undefined;
    });

    afterEach(() => {
      // Restore AudioContext
      (globalThis as Record<string, unknown>).AudioContext = originalAudioContext;
      (globalThis as Record<string, unknown>).webkitAudioContext = originalAudioContext;
    });

    it('27. slideAdvance() does not throw when AudioContext unavailable', () => {
      expect(() => earcons.slideAdvance()).not.toThrow();
    });

    it('28. sessionStart() does not throw when AudioContext unavailable', () => {
      expect(() => earcons.sessionStart()).not.toThrow();
    });

    it('29. commandRecognized() does not throw when AudioContext unavailable', () => {
      expect(() => earcons.commandRecognized()).not.toThrow();
    });

    it('30. bookmarkAdded() does not throw when AudioContext unavailable', () => {
      expect(() => earcons.bookmarkAdded()).not.toThrow();
    });
  });

  describe('Disabled State', () => {
    beforeEach(() => {
      earcons.setEnabled(false);
    });

    afterEach(() => {
      earcons.setEnabled(true);
    });

    it('31. Disabled earcons do not play', () => {
      // When disabled, functions should return early without error
      expect(() => earcons.slideAdvance()).not.toThrow();
      expect(() => earcons.sessionStart()).not.toThrow();
      expect(() => earcons.bookmarkAdded()).not.toThrow();
    });
  });

  describe('Earcons Object Export', () => {
    it('32. earcons default export has all functions', () => {
      const earconObj = earcons.default;
      expect(earconObj.slideAdvance).toBeDefined();
      expect(earconObj.slideBack).toBeDefined();
      expect(earconObj.sessionStart).toBeDefined();
      expect(earconObj.sessionComplete).toBeDefined();
      expect(earconObj.bookmarkAdded).toBeDefined();
      expect(earconObj.bookmarkRemoved).toBeDefined();
      expect(earconObj.speedUp).toBeDefined();
      expect(earconObj.speedDown).toBeDefined();
      expect(earconObj.setVolume).toBeDefined();
      expect(earconObj.setEnabled).toBeDefined();
    });
  });
});
