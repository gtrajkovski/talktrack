export type CommandLanguage = "en" | "mk" | "sq" | "it";

export interface VoiceCommandSet {
  next: string[];
  back: string[];
  repeat: string[];
  reveal: string[]; // Used in Prompt mode
  help: string[];   // Used in Test mode
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
    next: ["next", "next slide", "forward", "continue", "skip", "move on", "got it"],
    back: ["back", "previous", "go back", "last slide", "before"],
    repeat: ["repeat", "again", "say that again", "one more time", "replay"],
    reveal: ["reveal", "show me", "tell me", "what is it", "answer"],
    help: ["help", "hint", "i need help", "stuck", "i don't know"],
  },

  // Macedonian (Македонски)
  mk: {
    next: ["следно", "следен слајд", "напред", "продолжи", "прескокни"],
    back: ["назад", "претходно", "врати се", "претходен слајд"],
    repeat: ["повтори", "уште еднаш", "кажи пак", "реплеј"],
    reveal: ["покажи", "кажи ми", "открij", "одговор"],
    help: ["помош", "помогни", "не знам", "заглавив"],
  },

  // Albanian (Shqip) - Kosovo/Albania
  sq: {
    next: ["tjetër", "vazhdo", "para", "kalo", "në rregull"],
    back: ["prapa", "mbrapa", "kthehu", "e mëparshme"],
    repeat: ["përsërit", "prapë", "thuaje prapë", "edhe një herë"],
    reveal: ["trego", "më trego", "shfaq", "përgjigje"],
    help: ["ndihmë", "më ndihmo", "nuk e di", "jam ngecur"],
  },

  // Italian (Italiano)
  it: {
    next: ["avanti", "prossimo", "continua", "vai", "salta", "prosegui"],
    back: ["indietro", "precedente", "torna", "prima"],
    repeat: ["ripeti", "ancora", "di nuovo", "replay"],
    reveal: ["mostra", "dimmi", "rivela", "risposta"],
    help: ["aiuto", "aiutami", "non so", "sono bloccato"],
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
 */
export function matchCommand(
  phrase: string,
  commands: VoiceCommandSet,
  mode: "prompt" | "test"
): string | null {
  const normalizedPhrase = phrase.toLowerCase().trim();
  const words = normalizedPhrase.split(/\s+/).slice(-5);
  const lastWords = words.join(" ");

  // Commands available in both modes
  const availableCommands: (keyof VoiceCommandSet)[] = ["next", "back", "repeat"];

  // Mode-specific commands
  if (mode === "prompt") {
    availableCommands.push("reveal");
  } else {
    availableCommands.push("help");
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
