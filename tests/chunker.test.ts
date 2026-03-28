import { describe, it, expect } from 'vitest';
import {
  splitIntoSentences,
  splitIntoParagraphs,
  mergeShortSentences,
  generateCue,
  chunkSlide,
  chunkTalk,
  findChunkBySlide,
  formatPositionLabel,
  type Chunk,
} from '@/lib/utils/chunker';
import type { Slide } from '@/types/talk';

describe('splitIntoSentences', () => {
  it('splits simple sentences', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual([
      'First sentence.',
      'Second sentence.',
      'Third sentence.',
    ]);
  });

  it('handles question and exclamation marks', () => {
    const text = 'Is this working? Yes it is! Great.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual(['Is this working?', 'Yes it is!', 'Great.']);
  });

  it('handles abbreviations correctly', () => {
    const text = 'Dr. Smith went to the store. He bought Mr. Johnson a gift.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual([
      'Dr. Smith went to the store.',
      'He bought Mr. Johnson a gift.',
    ]);
  });

  it('handles decimal numbers', () => {
    const text = 'The price is 3.14 dollars. That is cheap.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual([
      'The price is 3.14 dollars.',
      'That is cheap.',
    ]);
  });

  it('handles ellipsis', () => {
    const text = 'Wait for it... Here it comes! Amazing.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toContain('Wait for it');
  });

  it('handles initials', () => {
    const text = 'J. K. Rowling wrote Harry Potter. It was great.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual([
      'J. K. Rowling wrote Harry Potter.',
      'It was great.',
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(splitIntoSentences('')).toEqual([]);
    expect(splitIntoSentences('   ')).toEqual([]);
  });

  it('handles text without ending punctuation', () => {
    const text = 'This has no period';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual(['This has no period']);
  });
});

describe('splitIntoParagraphs', () => {
  it('splits on double newlines', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const paragraphs = splitIntoParagraphs(text);
    expect(paragraphs).toEqual([
      'First paragraph.',
      'Second paragraph.',
      'Third paragraph.',
    ]);
  });

  it('handles Windows line endings', () => {
    const text = 'First paragraph.\r\n\r\nSecond paragraph.';
    const paragraphs = splitIntoParagraphs(text);
    expect(paragraphs).toEqual(['First paragraph.', 'Second paragraph.']);
  });

  it('returns empty array for empty input', () => {
    expect(splitIntoParagraphs('')).toEqual([]);
    expect(splitIntoParagraphs('   ')).toEqual([]);
  });

  it('returns single paragraph if no breaks', () => {
    const text = 'Just one paragraph with some text.';
    const paragraphs = splitIntoParagraphs(text);
    expect(paragraphs).toEqual(['Just one paragraph with some text.']);
  });
});

describe('mergeShortSentences', () => {
  it('merges sentences shorter than minWords', () => {
    const sentences = ['Hello.', 'This is a longer sentence with many words.'];
    const merged = mergeShortSentences(sentences, 5);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toContain('Hello.');
    expect(merged[0]).toContain('This is a longer sentence');
  });

  it('leaves long sentences alone', () => {
    const sentences = [
      'This is a long enough sentence.',
      'And this is another long enough one.',
    ];
    const merged = mergeShortSentences(sentences, 5);
    expect(merged).toHaveLength(2);
  });

  it('handles single sentence', () => {
    const sentences = ['Short.'];
    const merged = mergeShortSentences(sentences);
    expect(merged).toEqual(['Short.']);
  });

  it('handles empty array', () => {
    expect(mergeShortSentences([])).toEqual([]);
  });

  it('chains multiple short sentences together', () => {
    const sentences = ['Hi.', 'Yes.', 'No.', 'This is finally long enough here.'];
    const merged = mergeShortSentences(sentences, 5);
    // Short ones should merge with the long one
    expect(merged.length).toBeLessThan(4);
  });
});

describe('generateCue', () => {
  it('returns first 3 words with ellipsis', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const cue = generateCue(text, 3);
    expect(cue).toBe('The quick brown...');
  });

  it('returns full text if less than wordCount', () => {
    const text = 'Short text';
    const cue = generateCue(text, 3);
    expect(cue).toBe('Short text');
  });

  it('uses custom word count', () => {
    const text = 'One two three four five six';
    const cue = generateCue(text, 5);
    expect(cue).toBe('One two three four five...');
  });
});

describe('chunkSlide', () => {
  const createSlide = (notes: string, index = 0): Slide => ({
    id: `slide-${index}`,
    index,
    title: `Slide ${index + 1}`,
    notes,
    wordCount: notes.split(/\s+/).length,
    estimatedSeconds: 30,
    timesRehearsed: 0,
  });

  it('returns single chunk for slide granularity', () => {
    const slide = createSlide('Some notes here. More notes.');
    const chunks = chunkSlide(slide, 'slide');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('slide');
    expect(chunks[0].text).toBe('Some notes here. More notes.');
  });

  it('splits into sentences for sentence granularity', () => {
    const slide = createSlide('First sentence here. Second sentence here. Third one.');
    const chunks = chunkSlide(slide, 'sentence');
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].type).toBe('sentence');
    chunks.forEach((chunk) => {
      expect(chunk.cueText).toBeDefined();
    });
  });

  it('splits into paragraphs for paragraph granularity', () => {
    const slide = createSlide('First paragraph with some text.\n\nSecond paragraph here.');
    const chunks = chunkSlide(slide, 'paragraph');
    expect(chunks).toHaveLength(2);
    expect(chunks[0].type).toBe('paragraph');
    expect(chunks[0].label).toBe('Paragraph 1');
    expect(chunks[1].label).toBe('Paragraph 2');
  });

  it('falls back to slide for empty notes and title', () => {
    const slide: Slide = {
      id: 'empty-slide',
      index: 0,
      title: '',
      notes: '',
      wordCount: 0,
      estimatedSeconds: 0,
      timesRehearsed: 0,
    };
    const chunks = chunkSlide(slide, 'sentence');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('slide');
  });

  it('uses title as fallback when notes is empty', () => {
    const slide = createSlide('');
    // createSlide sets title to "Slide 1", so it will chunk the title
    const chunks = chunkSlide(slide, 'sentence');
    expect(chunks).toHaveLength(1);
    // Title "Slide 1" becomes a single sentence chunk
    expect(chunks[0].text).toBe('Slide 1');
  });

  it('sets correct slideIndex and slideId', () => {
    const slide = createSlide('Some text.', 5);
    const chunks = chunkSlide(slide, 'slide');
    expect(chunks[0].slideIndex).toBe(5);
    expect(chunks[0].slideId).toBe('slide-5');
  });

  it('sets globalIndex starting from provided value', () => {
    const slide = createSlide('First. Second.');
    const chunks = chunkSlide(slide, 'sentence', 10);
    expect(chunks[0].globalIndex).toBe(10);
    if (chunks.length > 1) {
      expect(chunks[1].globalIndex).toBe(11);
    }
  });
});

describe('chunkTalk', () => {
  const createSlides = (): Slide[] => [
    {
      id: 'slide-0',
      index: 0,
      title: 'Intro',
      notes: 'Welcome everyone. This is the intro.',
      wordCount: 6,
      estimatedSeconds: 10,
      timesRehearsed: 0,
    },
    {
      id: 'slide-1',
      index: 1,
      title: 'Main',
      notes: 'Main content here. Very important stuff.',
      wordCount: 6,
      estimatedSeconds: 10,
      timesRehearsed: 0,
    },
  ];

  it('chunks all slides', () => {
    const slides = createSlides();
    const chunks = chunkTalk(slides, 'slide');
    expect(chunks).toHaveLength(2);
    expect(chunks[0].slideIndex).toBe(0);
    expect(chunks[1].slideIndex).toBe(1);
  });

  it('assigns sequential globalIndex across slides', () => {
    const slides = createSlides();
    const chunks = chunkTalk(slides, 'sentence');
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].globalIndex).toBe(i);
    }
  });

  it('handles empty slides array', () => {
    const chunks = chunkTalk([], 'slide');
    expect(chunks).toEqual([]);
  });
});

describe('findChunkBySlide', () => {
  const createChunks = (): Chunk[] => [
    { id: 'c0', slideIndex: 0, slideId: 's0', chunkIndex: 0, globalIndex: 0, type: 'sentence', text: 'a', wordCount: 1, estimatedSeconds: 1 },
    { id: 'c1', slideIndex: 0, slideId: 's0', chunkIndex: 1, globalIndex: 1, type: 'sentence', text: 'b', wordCount: 1, estimatedSeconds: 1 },
    { id: 'c2', slideIndex: 1, slideId: 's1', chunkIndex: 0, globalIndex: 2, type: 'sentence', text: 'c', wordCount: 1, estimatedSeconds: 1 },
    { id: 'c3', slideIndex: 2, slideId: 's2', chunkIndex: 0, globalIndex: 3, type: 'sentence', text: 'd', wordCount: 1, estimatedSeconds: 1 },
  ];

  it('finds first chunk of a slide', () => {
    const chunks = createChunks();
    expect(findChunkBySlide(chunks, 0)).toBe(0);
    expect(findChunkBySlide(chunks, 1)).toBe(2);
    expect(findChunkBySlide(chunks, 2)).toBe(3);
  });

  it('returns 0 for non-existent slide', () => {
    const chunks = createChunks();
    expect(findChunkBySlide(chunks, 99)).toBe(0);
  });

  it('returns 0 for empty chunks', () => {
    expect(findChunkBySlide([], 0)).toBe(0);
  });
});

describe('formatPositionLabel', () => {
  const createChunks = (type: 'slide' | 'sentence' | 'paragraph'): Chunk[] => [
    { id: 'c0', slideIndex: 0, slideId: 's0', chunkIndex: 0, globalIndex: 0, type, text: 'a', wordCount: 1, estimatedSeconds: 1 },
    { id: 'c1', slideIndex: 0, slideId: 's0', chunkIndex: 1, globalIndex: 1, type, text: 'b', wordCount: 1, estimatedSeconds: 1 },
    { id: 'c2', slideIndex: 1, slideId: 's1', chunkIndex: 0, globalIndex: 2, type, text: 'c', wordCount: 1, estimatedSeconds: 1 },
  ];

  it('formats slide position simply', () => {
    const chunks = createChunks('slide');
    const label = formatPositionLabel(chunks, 0, 3);
    expect(label).toBe('1/3');
  });

  it('formats sentence position with chunk info', () => {
    const chunks = createChunks('sentence');
    const label = formatPositionLabel(chunks, 1, 2);
    expect(label).toBe('1/2 • S 2/3');
  });

  it('formats paragraph position with chunk info', () => {
    const chunks = createChunks('paragraph');
    const label = formatPositionLabel(chunks, 2, 2);
    expect(label).toBe('2/2 • P 3/3');
  });

  it('returns empty string for empty chunks', () => {
    expect(formatPositionLabel([], 0, 0)).toBe('');
  });

  it('returns empty string for invalid index', () => {
    const chunks = createChunks('slide');
    expect(formatPositionLabel(chunks, 99, 3)).toBe('');
  });
});
