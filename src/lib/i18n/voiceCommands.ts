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
    back: ["back", "previous", "go back", "last slide", "before"],
    repeat: ["repeat", "say that again", "one more time", "replay"],
    reveal: ["reveal", "show me", "tell me", "what is it", "answer"],
    help: ["help", "hint", "i need help", "stuck", "i don't know"],
    stop: ["stop", "pause", "hold on", "wait"],
    resume: ["resume", "keep going", "unpause"],
    again: ["again", "one more time", "start over", "redo", "practice again"],
    done: ["done", "finish", "exit", "i'm done", "that's it", "all done"],
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
  const words = normalizedPhrase.split(/\s+/).slice(-3); // Changed from -5 to -3 for tighter matching
  const lastWords = words.join(" ");

  // Determine which commands are available based on mode
  let availableCommands: (keyof VoiceCommandSet)[];

  switch (mode) {
    case "listen":
      // Listen mode: navigation + pause/resume (no reveal/help)
      availableCommands = ["next", "back", "repeat", "stop", "resume"];
      break;
    case "prompt":
      // Prompt mode: navigation + reveal + pause/resume
      availableCommands = ["next", "back", "repeat", "reveal", "stop", "resume"];
      break;
    case "test":
      // Test mode: navigation + help + pause/resume
      availableCommands = ["next", "back", "repeat", "help", "stop", "resume"];
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
    }
  }

  return null;
}
