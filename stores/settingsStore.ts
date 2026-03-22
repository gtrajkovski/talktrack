import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserSettings } from "@/types/settings";
import { defaultSettings } from "@/types/settings";

interface SettingsState extends UserSettings {
  updateSettings: (partial: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateSettings: (partial) => set(partial),
    }),
    {
      name: "talktrack-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
