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
  // Volume commands (Prompt 05)
  louder: string[];
  quieter: string[];
  maxVolume: string[];
  mute: string[];
  unmute: string[];
  // Bookmark commands (Prompt 05)
  bookmark: string[];
  listBookmarks: string[];
  practiceBookmarks: string[];
  clearBookmarks: string[];
  // Score queries (Prompt 05)
  howDidIDo: string[];
  myAverage: string[];
  worstSlides: string[];
  // Repeat variations (Prompt 05)
  repeatSlowly: string[];
  repeatTitle: string[];
  // Practice modes (Prompt 05)
  hardOnly: string[];
  allSlides: string[];
  // Granularity modes (Prompt 06)
  sentenceMode: string[];
  paragraphMode: string[];
  slideMode: string[];
  whatMode: string[];  // "What mode am I in?"
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
    // Volume commands
    louder: ["louder", "volume up", "turn it up"],
    quieter: ["quieter", "softer", "volume down", "turn it down"],
    maxVolume: ["max volume", "full volume", "maximum"],
    mute: ["mute", "silence", "quiet"],
    unmute: ["unmute", "sound on"],
    // Bookmark commands
    bookmark: ["bookmark", "mark this", "save this slide", "flag this"],
    listBookmarks: ["list bookmarks", "show bookmarks", "my bookmarks"],
    practiceBookmarks: ["practice bookmarks", "bookmarked slides", "hard slides"],
    clearBookmarks: ["clear bookmarks", "remove bookmarks"],
    // Score queries
    howDidIDo: ["how did i do", "my score", "score"],
    myAverage: ["my average", "average score", "overall score"],
    worstSlides: ["worst slides", "hardest slides", "need practice"],
    // Repeat variations
    repeatSlowly: ["repeat slowly", "say it slower", "slow repeat"],
    repeatTitle: ["repeat title", "title again", "slide title"],
    // Practice modes
    hardOnly: ["hard only", "hard slides only", "difficult only"],
    allSlides: ["all slides", "practice all", "full practice"],
    // Granularity modes
    sentenceMode: ["sentence mode", "by sentence", "sentence by sentence"],
    paragraphMode: ["paragraph mode", "by paragraph", "paragraph by paragraph"],
    slideMode: ["slide mode", "by slide", "full slides"],
    whatMode: ["what mode", "current mode", "which mode"],
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
    // Volume commands
    louder: ["погласно", "засили"],
    quieter: ["потивко", "намали"],
    maxVolume: ["максимум", "полна јачина"],
    mute: ["исклучи звук", "тишина"],
    unmute: ["вклучи звук"],
    // Bookmark commands
    bookmark: ["обележи", "маркирај", "зачувај"],
    listBookmarks: ["покажи обележани", "обележени"],
    practiceBookmarks: ["вежбај обележани", "тешки слајдови"],
    clearBookmarks: ["избриши обележани"],
    // Score queries
    howDidIDo: ["како ми одеше", "резултат"],
    myAverage: ["мој просек", "просечен резултат"],
    worstSlides: ["најтешки слајдови", "треба вежба"],
    // Repeat variations
    repeatSlowly: ["повтори бавно", "кажи побавно"],
    repeatTitle: ["повтори наслов", "наслов"],
    // Practice modes
    hardOnly: ["само тешки", "тешки слајдови"],
    allSlides: ["сите слајдови", "вежбај се"],
    // Granularity modes
    sentenceMode: ["по реченици", "реченица по реченица"],
    paragraphMode: ["по параграфи", "параграф по параграф"],
    slideMode: ["по слајдови", "цели слајдови"],
    whatMode: ["кој режим", "кој мод"],
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
    // Volume commands
    louder: ["më fort", "rrit volumin"],
    quieter: ["më lehtë", "ul volumin"],
    maxVolume: ["volum maksimal", "maksimum"],
    mute: ["hesht", "pa zë"],
    unmute: ["hiq heshtjen", "me zë"],
    // Bookmark commands
    bookmark: ["shëno", "ruaje", "markoje"],
    listBookmarks: ["trego të shënuarat", "shënime"],
    practiceBookmarks: ["praktiko të shënuarat", "slajdet e vështira"],
    clearBookmarks: ["fshi shënimet"],
    // Score queries
    howDidIDo: ["si shkova", "rezultati"],
    myAverage: ["mesatarja ime", "rezultati mesatar"],
    worstSlides: ["slajdet më të vështira", "duhet praktikë"],
    // Repeat variations
    repeatSlowly: ["përsërit ngadalë", "thuaje më ngadalë"],
    repeatTitle: ["përsërit titullin", "titulli"],
    // Practice modes
    hardOnly: ["vetëm të vështirat", "slajdet e vështira"],
    allSlides: ["të gjitha slajdet", "praktiko të gjitha"],
    // Granularity modes
    sentenceMode: ["mënyra fjali", "fjali për fjali"],
    paragraphMode: ["mënyra paragraf", "paragraf për paragraf"],
    slideMode: ["mënyra slajd", "slajde të plota"],
    whatMode: ["cila mënyrë", "cili mod"],
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
    // Volume commands
    louder: ["più forte", "alza il volume"],
    quieter: ["più piano", "abbassa il volume"],
    maxVolume: ["volume massimo", "massimo"],
    mute: ["muto", "silenzio"],
    unmute: ["riattiva audio", "audio attivo"],
    // Bookmark commands
    bookmark: ["segna", "segnalibro", "salva"],
    listBookmarks: ["mostra segnati", "segnalibri"],
    practiceBookmarks: ["pratica segnati", "slide difficili"],
    clearBookmarks: ["cancella segnalibri"],
    // Score queries
    howDidIDo: ["come sono andato", "punteggio"],
    myAverage: ["media mia", "punteggio medio"],
    worstSlides: ["slide peggiori", "da ripassare"],
    // Repeat variations
    repeatSlowly: ["ripeti lentamente", "dillo più lento"],
    repeatTitle: ["ripeti titolo", "titolo"],
    // Practice modes
    hardOnly: ["solo difficili", "slide difficili"],
    allSlides: ["tutte le slide", "pratica tutto"],
    // Granularity modes
    sentenceMode: ["modalità frase", "frase per frase"],
    paragraphMode: ["modalità paragrafo", "paragrafo per paragrafo"],
    slideMode: ["modalità slide", "slide intere"],
    whatMode: ["quale modalità", "che modalità"],
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
  // Speed controls
  "faster", "slower", "normalSpeed",
  // Navigation
  "firstSlide", "lastSlide", "goToSlide",
  // Info queries
  "whereAmI", "howManyLeft", "timeRemaining",
  // Volume controls
  "louder", "quieter", "maxVolume", "mute", "unmute",
  // Bookmarks
  "bookmark", "listBookmarks", "practiceBookmarks", "clearBookmarks",
  // Score queries
  "howDidIDo", "myAverage", "worstSlides",
  // Repeat variations
  "repeatSlowly", "repeatTitle",
  // Practice modes
  "hardOnly", "allSlides",
  // Granularity modes
  "sentenceMode", "paragraphMode", "slideMode", "whatMode",
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
