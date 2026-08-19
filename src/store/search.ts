import { create } from "zustand";

interface SearchStore {
  query: string;
  recentSearches: string[];
  popularSearches: string[];
  setQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  getRecentSearches: (limit?: number) => string[];
}

export const useSearchStore = create<SearchStore>()((set, get) => ({
  query: "",
  recentSearches: [],
  popularSearches: ["wall decor", "lamps", "comforters", "carpets", "flower pots", "vases"],

  setQuery: (query) => set({ query }),

  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const { recentSearches } = get();
    const filtered = recentSearches.filter((s) => s !== trimmed);
    set({ recentSearches: [trimmed, ...filtered].slice(0, 10) });
  },

  clearRecentSearches: () => set({ recentSearches: [] }),

  getRecentSearches: (limit = 5) => get().recentSearches.slice(0, limit),
}));
