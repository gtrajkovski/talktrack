export type CommandLanguage = "en" | "mk" | "sq" | "it";

export interface VoiceCommandSet {
  next: string[];
  back: string[];
  repeat: string[];
  reveal: string[]; // Used in Prompt mode
  help: string[];   // Used in Test mode
  stop: string[];   // Pause recognition/playback
  resume: string[]; // Resume after pause
  again: string[];  // Restart session (completion screen)
  done: string[];   // Exit session (completion screen)
  // Playback control commands (Prompt 04)
  faster: string[];
  slower: string[];
  normalSpeed: string[];
  firstSlide: string[];
  lastSlide: string[];
  goToSlide: string[];  // Patterns like "go to slide", "slide number"
  whereAmI: string[];
  howManyLeft: string[];
  timeRemaining: string[];
}

export const LANGUAGE_LABELS: Record<CommandLanguage, string> = {
  en: "English",
  mk: "Македонски",
  sq: "Shqip",
  it: "Italiano",
};

// BCP 47 language tags for speech recognition
export const RECOGNITION_LOCALES: Record<CommandLanguage, string> = {
  en: "en-US",
  mk: "mk-MK",
  sq: "sq-AL", // Albanian (works for Kosovo dialect too)
  it: "it-IT",
};

export const VOICE_COMMANDS: Record<CommandLanguage, VoiceCommandSet> = {
  // English
  en: {
    next: ["next", "next slide", "forward", "skip", "move on", "got it"],
    back: ["back", "previous", "go back", "before"],
    repeat: ["repeat", "say that again", "one more time", "replay"],
    reveal: ["reveal", "show me", "tell me", "what is it", "answer"],
    help: ["help", "hint", "i need help", "stuck", "i don't know"],
    stop: ["stop", "pause", "hold on", "wait"],
    resume: ["resume", "keep going", "unpause"],
    again: ["again", "one more time", "start over", "redo", "practice again"],
    done: ["done", "finish", "exit", "i'm done", "that's it", "all done"],
    // Playback control commands
    faster: ["faster", "speed up", "quicker"],
    slower: ["slower", "slow down", "slow it down"],
    normalSpeed: ["normal speed", "normal", "reset speed", "regular speed"],
    firstSlide: ["first slide", "go to start", "beginning"],
    lastSlide: ["last slide", "go to end", "final slide"],
    goToSlide: ["go to slide", "slide number", "jump to slide"],
    whereAmI: ["where am i", "what slide", "current slide"],
    howManyLeft: ["how many left", "how many more", "slides remaining"],
    timeRemaining: ["time remaining", "how long left", "how much time"],
  },

  // Macedonian (Македонски)
  mk: {
    next: ["следно", "следен слајд", "напред", "прескокни"],
    back: ["назад", "претходно", "врати се", "претходен слајд"],
    repeat: ["повтори", "кажи пак", "реплеј"],
    reveal: ["покажи", "кажи ми", "открij", "одговор"],
    help: ["помош", "помогни", "не знам", "заглавив"],
    stop: ["стоп", "пауза", "застани", "чекај"],
    resume: ["продолжи", "настави"],
    again: ["уште еднаш", "одново", "повторно"],
    done: ["готово", "крај", "завршив", "излез"],
    // Playback control commands
    faster: ["побрзо", "забрзај"],
    slower: ["побавно", "забави"],
    normalSpeed: ["нормална брзина", "нормално"],
    firstSlide: ["прв слајд", "на почеток"],
    lastSlide: ["последен слајд", "на крај"],
    goToSlide: ["оди на слајд", "слајд број"],
    whereAmI: ["каде сум", "кој слајд"],
    howManyLeft: ["колку остануваат", "колку уште"],
    timeRemaining: ["колку време", "преостанато време"],
  },

  // Albanian (Shqip) - Kosovo/Albania
  sq: {
    next: ["tjetër", "para", "kalo", "në rregull"],
    back: ["prapa", "mbrapa", "kthehu", "e mëparshme"],
    repeat: ["përsërit", "thuaje prapë"],
    reveal: ["trego", "më trego", "shfaq", "përgjigje"],
    help: ["ndihmë", "më ndihmo", "nuk e di", "jam ngecur"],
    stop: ["ndalo", "prit", "stop"],
    resume: ["vazhdo", "fillo"],
    again: ["prapë", "edhe një herë", "përsërit"],
    done: ["gati", "mbarova", "dil", "fund"],
    // Playback control commands
    faster: ["më shpejt", "shpejto"],
    slower: ["më ngadalë", "ngadalëso"],
    normalSpeed: ["shpejtësi normale", "normale"],
    firstSlide: ["slajdi i parë", "në fillim"],
    lastSlide: ["slajdi i fundit", "në fund"],
    goToSlide: ["shko te slajdi", "numri i slajdit"],
    whereAmI: ["ku jam", "cili slajd"],
    howManyLeft: ["sa kanë mbetur", "sa më"],
    timeRemaining: ["sa kohë ka mbetur", "koha e mbetur"],
  },

  // Italian (Italiano)
  it: {
    next: ["avanti", "prossimo", "vai", "salta", "prosegui"],
    back: ["indietro", "precedente", "torna", "prima"],
    repeat: ["ripeti", "replay"],
    reveal: ["mostra", "dimmi", "rivela", "risposta"],
    help: ["aiuto", "aiutami", "non so", "sono bloccato"],
    stop: ["stop", "pausa", "ferma", "aspetta"],
    resume: ["continua", "riprendi", "vai"],
    again: ["ancora", "di nuovo", "ricomincia"],
    done: ["fatto", "finito", "esci", "basta"],
    // Playback control commands
    faster: ["più veloce", "accelera"],
    slower: ["più lento", "rallenta"],
    normalSpeed: ["velocità normale", "normale"],
    firstSlide: ["prima slide", "inizio"],
    lastSlide: ["ultima slide", "fine"],
    goToSlide: ["vai alla slide", "slide numero"],
    whereAmI: ["dove sono", "quale slide"],
    howManyLeft: ["quante ne mancano", "quanto manca"],
    timeRemaining: ["tempo rimanente", "quanto tempo"],
  },
};

/**
 * Get voice commands for a specific language
 */
export function getCommands(language: CommandLanguage): VoiceCommandSet {
  return VOICE_COMMANDS[language];
}

/**
 * Get the speech recognition locale for a language
 */
export function getRecognitionLocale(language: CommandLanguage): string {
  return RECOGNITION_LOCALES[language];
}

// Playback control commands available in all rehearsal modes
const PLAYBACK_COMMANDS: (keyof VoiceCommandSet)[] = [
  "faster", "slower", "normalSpeed",
  "firstSlide", "lastSlide", "goToSlide",
  "whereAmI", "howManyLeft", "timeRemaining"
];

/**
 * Check if a phrase matches any command in the given set
 * Returns the command name or null
 *
 * Note: We match against last 3 words only (not 5) to reduce false positives.
 * For example, "the next thing I want to cover" shouldn't trigger "next".
 */
export function matchCommand(
  phrase: string,
  commands: VoiceCommandSet,
  mode: "prompt" | "test" | "listen" | "completion"
): string | null {
  const normalizedPhrase = phrase.toLowerCase().trim();
  const words = normalizedPhrase.split(/\s+/).slice(-5); // Expanded to 5 for "go to slide X"
  const lastWords = words.join(" ");

  // Determine which commands are available based on mode
  let availableCommands: (keyof VoiceCommandSet)[];

  switch (mode) {
    case "listen":
      // Listen mode: navigation + pause/resume + playback controls (no reveal/help)
      availableCommands = ["next", "back", "repeat", "stop", "resume", ...PLAYBACK_COMMANDS];
      break;
    case "prompt":
      // Prompt mode: navigation + reveal + pause/resume + playback controls
      availableCommands = ["next", "back", "repeat", "reveal", "stop", "resume", ...PLAYBACK_COMMANDS];
      break;
    case "test":
      // Test mode: navigation + help + pause/resume + playback controls
      availableCommands = ["next", "back", "repeat", "help", "stop", "resume", ...PLAYBACK_COMMANDS];
      break;
    case "completion":
      // Completion screen: only again/done
      availableCommands = ["again", "done"];
      break;
    default:
      availableCommands = ["next", "back", "repeat"];
  }

  for (const commandName of availableCommands) {
    const phrases = commands[commandName];
    for (const p of phrases) {
      const normalizedCommand = p.toLowerCase();
      if (lastWords === normalizedCommand || lastWords.endsWith(" " + normalizedCommand)) {
        return commandName;
      }
      // For goToSlide, match prefix (e.g., "go to slide 5" matches "go to slide")
      if (commandName === "goToSlide" && lastWords.includes(normalizedCommand)) {
        return commandName;
      }
    }
  }

  return null;
}

/**
 * Parse slide number from "go to slide N" command
 * Returns slide number (1-indexed) or null if not found
 */
export function parseGoToSlideNumber(phrase: string): number | null {
  const normalizedPhrase = phrase.toLowerCase().trim();

  // Match patterns like "go to slide 5", "slide number 3", "jump to slide 10"
  const patterns = [
    /(?:go to|jump to|slide number|slide)\s*(\d+)/i,
    /(\d+)(?:st|nd|rd|th)?\s*slide/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedPhrase.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return null;
}
