import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

interface SettingsState extends UserSettings {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetSettings: () => void;
  // Voice intelligence tracking
  incrementCommand: (command: string) => void;
  incrementSessionCount: () => void;
  getCommandUsageCount: (command: string) => number;
  hasLearnedCommand: (command: string, threshold?: number) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      updateSettings: (newSettings: Partial<UserSettings>) => {
        set((state) => ({ ...state, ...newSettings }));
      },

      resetSettings: () => {
        set(DEFAULT_SETTINGS);
      },

      incrementCommand: (command: string) => {
        set((state) => ({
          commandsLearned: {
            ...state.commandsLearned,
            [command]: (state.commandsLearned[command] || 0) + 1,
          },
        }));
      },

      incrementSessionCount: () => {
        set((state) => ({
          totalSessionsEver: state.totalSessionsEver + 1,
        }));
      },

      getCommandUsageCount: (command: string): number => {
        // Access state through the getter to avoid circular reference
        const state = useSettingsStore.getState();
        return state.commandsLearned[command] || 0;
      },

      hasLearnedCommand: (command: string, threshold = 3): boolean => {
        const state = useSettingsStore.getState();
        return (state.commandsLearned[command] || 0) >= threshold;
      },
    }),
    {
      name: "talktrack-settings",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
