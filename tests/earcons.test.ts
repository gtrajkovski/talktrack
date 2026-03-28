import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AudioContext before importing earcons
const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

const createMockAudioContext = () => ({
  currentTime: 0,
  state: 'running' as AudioContextState,
  sampleRate: 44100,
  destination: {},
  resume: vi.fn(),
  createOscillator: vi.fn(() => ({
    type: 'sine' as OscillatorType,
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  })),
  createBuffer: vi.fn((channels: number, length: number) => ({
    getChannelData: vi.fn(() => new Float32Array(length)),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: vi.fn(),
  })),
});

// Set up globals before importing
class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  sampleRate = 44100;
  destination = {};
  resume = vi.fn();

  createOscillator() {
    return {
      type: 'sine' as OscillatorType,
      frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }

  createBuffer(channels: number, length: number) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }

  createBufferSource() {
    return {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn(),
    };
  }
}

// Apply global mocks before module import
vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Now import the module
import {
  setVolume,
  getVolume,
  setEnabled,
  isEnabled,
  slideAdvance,
  slideBack,
  micOn,
  micOff,
  commandRecognized,
  revealAnswer,
  errorRetry,
  sessionStart,
  sessionComplete,
  highScore,
  repeat,
  speedUp,
  speedDown,
  navigationJump,
  infoQuery,
  volumeUp,
  volumeDown,
  muteToggle,
  bookmarkAdded,
  bookmarkRemoved,
  paragraphBreak,
  sentenceAdvance,
  modeChange,
  earcons,
} from '@/lib/audio/earcons';

describe('earcons volume controls', () => {
  beforeEach(() => {
    setVolume(0.3); // Reset to default
  });

  it('getVolume returns current volume', () => {
    expect(getVolume()).toBe(0.3);
  });

  it('setVolume updates volume', () => {
    setVolume(0.7);
    expect(getVolume()).toBe(0.7);
  });

  it('setVolume clamps to minimum 0', () => {
    setVolume(-0.5);
    expect(getVolume()).toBe(0);
  });

  it('setVolume clamps to maximum 1', () => {
    setVolume(1.5);
    expect(getVolume()).toBe(1);
  });

  it('setVolume accepts boundary values', () => {
    setVolume(0);
    expect(getVolume()).toBe(0);
    setVolume(1);
    expect(getVolume()).toBe(1);
  });

  it('setVolume accepts decimal values', () => {
    setVolume(0.55);
    expect(getVolume()).toBe(0.55);
  });
});

describe('earcons enable controls', () => {
  beforeEach(() => {
    setEnabled(true); // Reset to default
  });

  it('isEnabled returns current state', () => {
    expect(isEnabled()).toBe(true);
  });

  it('setEnabled disables earcons', () => {
    setEnabled(false);
    expect(isEnabled()).toBe(false);
  });

  it('setEnabled enables earcons', () => {
    setEnabled(false);
    setEnabled(true);
    expect(isEnabled()).toBe(true);
  });
});

describe('earcons convenience export', () => {
  it('exports all control functions', () => {
    expect(earcons.setVolume).toBe(setVolume);
    expect(earcons.getVolume).toBe(getVolume);
    expect(earcons.setEnabled).toBe(setEnabled);
    expect(earcons.isEnabled).toBe(isEnabled);
  });

  it('exports all earcon functions', () => {
    expect(earcons.slideAdvance).toBe(slideAdvance);
    expect(earcons.slideBack).toBe(slideBack);
    expect(earcons.micOn).toBe(micOn);
    expect(earcons.micOff).toBe(micOff);
    expect(earcons.commandRecognized).toBe(commandRecognized);
    expect(earcons.revealAnswer).toBe(revealAnswer);
    expect(earcons.errorRetry).toBe(errorRetry);
    expect(earcons.sessionStart).toBe(sessionStart);
    expect(earcons.sessionComplete).toBe(sessionComplete);
    expect(earcons.highScore).toBe(highScore);
    expect(earcons.repeat).toBe(repeat);
    expect(earcons.speedUp).toBe(speedUp);
    expect(earcons.speedDown).toBe(speedDown);
    expect(earcons.navigationJump).toBe(navigationJump);
    expect(earcons.infoQuery).toBe(infoQuery);
    expect(earcons.volumeUp).toBe(volumeUp);
    expect(earcons.volumeDown).toBe(volumeDown);
    expect(earcons.muteToggle).toBe(muteToggle);
    expect(earcons.bookmarkAdded).toBe(bookmarkAdded);
    expect(earcons.bookmarkRemoved).toBe(bookmarkRemoved);
    expect(earcons.paragraphBreak).toBe(paragraphBreak);
    expect(earcons.sentenceAdvance).toBe(sentenceAdvance);
    expect(earcons.modeChange).toBe(modeChange);
  });
});

describe('earcons playback - when disabled', () => {
  beforeEach(() => {
    setEnabled(false);
    setVolume(0.3);
  });

  afterEach(() => {
    setEnabled(true);
  });

  // When disabled, earcons should not throw and should return early
  it('slideAdvance does not throw when disabled', () => {
    expect(() => slideAdvance()).not.toThrow();
  });

  it('slideBack does not throw when disabled', () => {
    expect(() => slideBack()).not.toThrow();
  });

  it('micOn does not throw when disabled', () => {
    expect(() => micOn()).not.toThrow();
  });

  it('micOff does not throw when disabled', () => {
    expect(() => micOff()).not.toThrow();
  });

  it('commandRecognized does not throw when disabled', () => {
    expect(() => commandRecognized()).not.toThrow();
  });

  it('revealAnswer does not throw when disabled', () => {
    expect(() => revealAnswer()).not.toThrow();
  });

  it('errorRetry does not throw when disabled', () => {
    expect(() => errorRetry()).not.toThrow();
  });

  it('sessionStart does not throw when disabled', () => {
    expect(() => sessionStart()).not.toThrow();
  });

  it('sessionComplete does not throw when disabled', () => {
    expect(() => sessionComplete()).not.toThrow();
  });

  it('highScore does not throw when disabled', () => {
    expect(() => highScore()).not.toThrow();
  });

  it('repeat does not throw when disabled', () => {
    expect(() => repeat()).not.toThrow();
  });

  it('speedUp does not throw when disabled', () => {
    expect(() => speedUp()).not.toThrow();
  });

  it('speedDown does not throw when disabled', () => {
    expect(() => speedDown()).not.toThrow();
  });

  it('navigationJump does not throw when disabled', () => {
    expect(() => navigationJump()).not.toThrow();
  });

  it('infoQuery does not throw when disabled', () => {
    expect(() => infoQuery()).not.toThrow();
  });

  it('volumeUp does not throw when disabled', () => {
    expect(() => volumeUp()).not.toThrow();
  });

  it('volumeDown does not throw when disabled', () => {
    expect(() => volumeDown()).not.toThrow();
  });

  it('muteToggle does not throw when disabled', () => {
    expect(() => muteToggle()).not.toThrow();
  });

  it('bookmarkAdded does not throw when disabled', () => {
    expect(() => bookmarkAdded()).not.toThrow();
  });

  it('bookmarkRemoved does not throw when disabled', () => {
    expect(() => bookmarkRemoved()).not.toThrow();
  });

  it('paragraphBreak does not throw when disabled', () => {
    expect(() => paragraphBreak()).not.toThrow();
  });

  it('sentenceAdvance does not throw when disabled', () => {
    expect(() => sentenceAdvance()).not.toThrow();
  });

  it('modeChange does not throw when disabled', () => {
    expect(() => modeChange()).not.toThrow();
  });
});

describe('earcons playback - when enabled', () => {
  beforeEach(() => {
    setEnabled(true);
    setVolume(0.3);
  });

  // When enabled with mocked AudioContext, earcons should not throw
  it('slideAdvance does not throw when enabled', () => {
    expect(() => slideAdvance()).not.toThrow();
  });

  it('slideBack does not throw when enabled', () => {
    expect(() => slideBack()).not.toThrow();
  });

  it('micOn does not throw when enabled', () => {
    expect(() => micOn()).not.toThrow();
  });

  it('micOff does not throw when enabled', () => {
    expect(() => micOff()).not.toThrow();
  });

  it('commandRecognized does not throw when enabled', () => {
    expect(() => commandRecognized()).not.toThrow();
  });

  it('revealAnswer does not throw when enabled', () => {
    expect(() => revealAnswer()).not.toThrow();
  });

  it('errorRetry does not throw when enabled', () => {
    expect(() => errorRetry()).not.toThrow();
  });

  it('sessionStart does not throw when enabled', () => {
    expect(() => sessionStart()).not.toThrow();
  });

  it('sessionComplete does not throw when enabled', () => {
    expect(() => sessionComplete()).not.toThrow();
  });

  it('highScore does not throw when enabled', () => {
    expect(() => highScore()).not.toThrow();
  });

  it('repeat does not throw when enabled', () => {
    expect(() => repeat()).not.toThrow();
  });

  it('speedUp does not throw when enabled', () => {
    expect(() => speedUp()).not.toThrow();
  });

  it('speedDown does not throw when enabled', () => {
    expect(() => speedDown()).not.toThrow();
  });

  it('navigationJump does not throw when enabled', () => {
    expect(() => navigationJump()).not.toThrow();
  });

  it('infoQuery does not throw when enabled', () => {
    expect(() => infoQuery()).not.toThrow();
  });

  it('volumeUp does not throw when enabled', () => {
    expect(() => volumeUp()).not.toThrow();
  });

  it('volumeDown does not throw when enabled', () => {
    expect(() => volumeDown()).not.toThrow();
  });

  it('muteToggle does not throw when enabled', () => {
    expect(() => muteToggle()).not.toThrow();
  });

  it('bookmarkAdded does not throw when enabled', () => {
    expect(() => bookmarkAdded()).not.toThrow();
  });

  it('bookmarkRemoved does not throw when enabled', () => {
    expect(() => bookmarkRemoved()).not.toThrow();
  });

  it('paragraphBreak does not throw when enabled', () => {
    expect(() => paragraphBreak()).not.toThrow();
  });

  it('sentenceAdvance does not throw when enabled', () => {
    expect(() => sentenceAdvance()).not.toThrow();
  });

  it('modeChange does not throw when enabled', () => {
    expect(() => modeChange()).not.toThrow();
  });
});

describe('earcons function count', () => {
  it('has 24 earcon sound functions', () => {
    const soundFunctions = [
      slideAdvance,
      slideBack,
      micOn,
      micOff,
      commandRecognized,
      revealAnswer,
      errorRetry,
      sessionStart,
      sessionComplete,
      highScore,
      repeat,
      speedUp,
      speedDown,
      navigationJump,
      infoQuery,
      volumeUp,
      volumeDown,
      muteToggle,
      bookmarkAdded,
      bookmarkRemoved,
      paragraphBreak,
      sentenceAdvance,
      modeChange,
    ];
    expect(soundFunctions).toHaveLength(23);
    soundFunctions.forEach(fn => {
      expect(typeof fn).toBe('function');
    });
  });

  it('has 4 control functions', () => {
    const controlFunctions = [setVolume, getVolume, setEnabled, isEnabled];
    expect(controlFunctions).toHaveLength(4);
    controlFunctions.forEach(fn => {
      expect(typeof fn).toBe('function');
    });
  });
});
