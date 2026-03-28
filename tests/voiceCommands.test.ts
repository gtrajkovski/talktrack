import { describe, it, expect } from 'vitest';
import {
  matchCommand,
  parseGoToSlideNumber,
  getCommands,
  getRecognitionLocale,
  VOICE_COMMANDS,
} from '@/lib/i18n/voiceCommands';

describe('matchCommand', () => {
  const enCommands = VOICE_COMMANDS.en;

  describe('basic command matching', () => {
    it('matches exact command', () => {
      expect(matchCommand('next', enCommands, 'listen')).toBe('next');
      expect(matchCommand('back', enCommands, 'listen')).toBe('back');
      expect(matchCommand('repeat', enCommands, 'listen')).toBe('repeat');
    });

    it('matches phrase ending with command', () => {
      expect(matchCommand('okay go ahead and say next', enCommands, 'listen')).toBe('next');
      expect(matchCommand('I think we should go back', enCommands, 'listen')).toBe('back');
    });

    it('matches command variants', () => {
      expect(matchCommand('next slide', enCommands, 'listen')).toBe('next');
      expect(matchCommand('previous', enCommands, 'listen')).toBe('back');
      expect(matchCommand('say that again', enCommands, 'listen')).toBe('repeat');
    });

    it('returns null for no match', () => {
      expect(matchCommand('hello world', enCommands, 'listen')).toBeNull();
      expect(matchCommand('random text here', enCommands, 'listen')).toBeNull();
    });

    it('is case insensitive', () => {
      expect(matchCommand('NEXT', enCommands, 'listen')).toBe('next');
      expect(matchCommand('Next Slide', enCommands, 'listen')).toBe('next');
    });
  });

  describe('mode-specific command filtering', () => {
    it('listen mode includes navigation and playback commands', () => {
      expect(matchCommand('next', enCommands, 'listen')).toBe('next');
      expect(matchCommand('back', enCommands, 'listen')).toBe('back');
      expect(matchCommand('faster', enCommands, 'listen')).toBe('faster');
      expect(matchCommand('slower', enCommands, 'listen')).toBe('slower');
    });

    it('listen mode excludes reveal and help', () => {
      expect(matchCommand('reveal', enCommands, 'listen')).toBeNull();
      expect(matchCommand('help', enCommands, 'listen')).toBeNull();
    });

    it('prompt mode includes reveal', () => {
      expect(matchCommand('reveal', enCommands, 'prompt')).toBe('reveal');
      expect(matchCommand('show me', enCommands, 'prompt')).toBe('reveal');
    });

    it('prompt mode excludes help', () => {
      expect(matchCommand('help', enCommands, 'prompt')).toBeNull();
    });

    it('test mode includes help', () => {
      expect(matchCommand('help', enCommands, 'test')).toBe('help');
      expect(matchCommand('i need help', enCommands, 'test')).toBe('help');
    });

    it('test mode excludes reveal', () => {
      expect(matchCommand('reveal', enCommands, 'test')).toBeNull();
    });

    it('completion mode only has again and done', () => {
      expect(matchCommand('again', enCommands, 'completion')).toBe('again');
      expect(matchCommand('done', enCommands, 'completion')).toBe('done');
      expect(matchCommand('next', enCommands, 'completion')).toBeNull();
      expect(matchCommand('back', enCommands, 'completion')).toBeNull();
    });
  });

  describe('playback control commands', () => {
    it('matches speed commands', () => {
      expect(matchCommand('faster', enCommands, 'listen')).toBe('faster');
      expect(matchCommand('speed up', enCommands, 'listen')).toBe('faster');
      expect(matchCommand('slower', enCommands, 'listen')).toBe('slower');
      expect(matchCommand('normal speed', enCommands, 'listen')).toBe('normalSpeed');
    });

    it('matches navigation commands', () => {
      expect(matchCommand('first slide', enCommands, 'listen')).toBe('firstSlide');
      expect(matchCommand('last slide', enCommands, 'listen')).toBe('lastSlide');
    });

    it('matches info queries', () => {
      expect(matchCommand('where am i', enCommands, 'listen')).toBe('whereAmI');
      expect(matchCommand('how many left', enCommands, 'listen')).toBe('howManyLeft');
    });

    it('matches volume commands', () => {
      expect(matchCommand('louder', enCommands, 'prompt')).toBe('louder');
      expect(matchCommand('quieter', enCommands, 'prompt')).toBe('quieter');
      expect(matchCommand('mute', enCommands, 'prompt')).toBe('mute');
    });

    it('matches bookmark commands', () => {
      expect(matchCommand('bookmark', enCommands, 'test')).toBe('bookmark');
      expect(matchCommand('list bookmarks', enCommands, 'test')).toBe('listBookmarks');
    });

    it('matches granularity commands', () => {
      expect(matchCommand('sentence mode', enCommands, 'listen')).toBe('sentenceMode');
      expect(matchCommand('paragraph mode', enCommands, 'listen')).toBe('paragraphMode');
      expect(matchCommand('slide mode', enCommands, 'listen')).toBe('slideMode');
    });
  });

  describe('goToSlide special handling', () => {
    it('matches go to slide with number', () => {
      expect(matchCommand('go to slide 5', enCommands, 'listen')).toBe('goToSlide');
      expect(matchCommand('slide number 3', enCommands, 'listen')).toBe('goToSlide');
    });
  });
});

describe('parseGoToSlideNumber', () => {
  it('parses "go to slide N" format', () => {
    expect(parseGoToSlideNumber('go to slide 5')).toBe(5);
    expect(parseGoToSlideNumber('go to slide 12')).toBe(12);
  });

  it('parses "slide number N" format', () => {
    expect(parseGoToSlideNumber('slide number 3')).toBe(3);
  });

  it('parses "jump to slide N" format', () => {
    expect(parseGoToSlideNumber('jump to slide 7')).toBe(7);
  });

  it('parses "Nth slide" format', () => {
    expect(parseGoToSlideNumber('5th slide')).toBe(5);
    expect(parseGoToSlideNumber('1st slide')).toBe(1);
    expect(parseGoToSlideNumber('2nd slide')).toBe(2);
    expect(parseGoToSlideNumber('3rd slide')).toBe(3);
  });

  it('returns null for invalid input', () => {
    expect(parseGoToSlideNumber('hello world')).toBeNull();
    expect(parseGoToSlideNumber('go to the beginning')).toBeNull();
    expect(parseGoToSlideNumber('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseGoToSlideNumber('go to slide 0')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(parseGoToSlideNumber('GO TO SLIDE 5')).toBe(5);
    expect(parseGoToSlideNumber('Go To Slide 3')).toBe(3);
  });
});

describe('getCommands', () => {
  it('returns English commands', () => {
    const commands = getCommands('en');
    expect(commands.next).toContain('next');
    expect(commands.back).toContain('back');
  });

  it('returns Macedonian commands', () => {
    const commands = getCommands('mk');
    expect(commands.next).toContain('следно');
    expect(commands.back).toContain('назад');
  });

  it('returns Albanian commands', () => {
    const commands = getCommands('sq');
    expect(commands.next).toContain('tjetër');
    expect(commands.back).toContain('prapa');
  });

  it('returns Italian commands', () => {
    const commands = getCommands('it');
    expect(commands.next).toContain('avanti');
    expect(commands.back).toContain('indietro');
  });
});

describe('getRecognitionLocale', () => {
  it('returns correct BCP 47 tags', () => {
    expect(getRecognitionLocale('en')).toBe('en-US');
    expect(getRecognitionLocale('mk')).toBe('mk-MK');
    expect(getRecognitionLocale('sq')).toBe('sq-AL');
    expect(getRecognitionLocale('it')).toBe('it-IT');
  });
});

describe('multi-language command matching', () => {
  it('matches Macedonian commands', () => {
    const mkCommands = VOICE_COMMANDS.mk;
    expect(matchCommand('следно', mkCommands, 'listen')).toBe('next');
    expect(matchCommand('назад', mkCommands, 'listen')).toBe('back');
    expect(matchCommand('повтори', mkCommands, 'listen')).toBe('repeat');
  });

  it('matches Albanian commands', () => {
    const sqCommands = VOICE_COMMANDS.sq;
    expect(matchCommand('tjetër', sqCommands, 'listen')).toBe('next');
    expect(matchCommand('prapa', sqCommands, 'listen')).toBe('back');
    expect(matchCommand('përsërit', sqCommands, 'listen')).toBe('repeat');
  });

  it('matches Italian commands', () => {
    const itCommands = VOICE_COMMANDS.it;
    expect(matchCommand('avanti', itCommands, 'listen')).toBe('next');
    expect(matchCommand('indietro', itCommands, 'listen')).toBe('back');
    expect(matchCommand('ripeti', itCommands, 'listen')).toBe('repeat');
  });
});
