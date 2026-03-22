import { create } from "zustand";
import type { Talk } from "@/types/talk";
import { getAllTalks, saveTalk, deleteTalk, getTalk } from "@/lib/db/talks";

interface TalksState {
  talks: Talk[];
  loading: boolean;
  loadTalks: () => Promise<void>;
  addTalk: (talk: Talk) => Promise<void>;
  removeTalk: (id: string) => Promise<void>;
  getTalk: (id: string) => Promise<Talk | undefined>;
  updateTalk: (talk: Talk) => Promise<void>;
}

export const useTalksStore = create<TalksState>((set, get) => ({
  talks: [],
  loading: true,

  loadTalks: async () => {
    set({ loading: true });
    const talks = await getAllTalks();
    set({ talks, loading: false });
  },

  addTalk: async (talk: Talk) => {
    await saveTalk(talk);
    set({ talks: [talk, ...get().talks] });
  },

  removeTalk: async (id: string) => {
    await deleteTalk(id);
    set({ talks: get().talks.filter((t) => t.id !== id) });
  },

  getTalk: async (id: string) => {
    const cached = get().talks.find((t) => t.id === id);
    if (cached) return cached;
    return getTalk(id);
  },

  updateTalk: async (talk: Talk) => {
    await saveTalk(talk);
    set({ talks: get().talks.map((t) => (t.id === talk.id ? talk : t)) });
  },
}));
