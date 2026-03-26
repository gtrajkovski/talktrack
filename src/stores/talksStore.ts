import { create } from "zustand";
import type { Talk } from "@/types/talk";
import * as talksDB from "@/lib/db/talks";

interface TalksState {
  talks: Talk[];
  isLoading: boolean;
  error: string | null;

  loadTalks: () => Promise<void>;
  addTalk: (talk: Talk) => Promise<void>;
  updateTalk: (talk: Talk) => Promise<void>;
  deleteTalk: (id: string) => Promise<void>;
  getTalk: (id: string) => Talk | undefined;
}

export const useTalksStore = create<TalksState>((set, get) => ({
  talks: [],
  isLoading: false,
  error: null,

  loadTalks: async () => {
    set({ isLoading: true, error: null });
    try {
      const talks = await talksDB.getAllTalks();
      set({ talks, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  addTalk: async (talk: Talk) => {
    try {
      await talksDB.createTalk(talk);
      set((state) => ({ talks: [talk, ...state.talks] }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  updateTalk: async (talk: Talk) => {
    try {
      await talksDB.updateTalk(talk);
      set((state) => ({
        talks: state.talks.map((t) => (t.id === talk.id ? talk : t)),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  deleteTalk: async (id: string) => {
    try {
      await talksDB.deleteTalk(id);
      set((state) => ({
        talks: state.talks.filter((t) => t.id !== id),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  getTalk: (id: string) => {
    return get().talks.find((t) => t.id === id);
  },
}));
