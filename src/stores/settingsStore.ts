import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

interface SettingsState extends UserSettings {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetSettings: () => void;
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
    }),
    {
      name: "talktrack-settings",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
