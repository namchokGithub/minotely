import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";

type UiState = {
  theme: ThemePreference;
  booksSidebarOpen: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleBooksSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      booksSidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      toggleBooksSidebar: () =>
        set((state) => ({ booksSidebarOpen: !state.booksSidebarOpen })),
    }),
    {
      // Read by the inline script in index.html to avoid a theme flash.
      name: "minotely-ui",
      partialize: (state) => ({
        theme: state.theme,
        booksSidebarOpen: state.booksSidebarOpen,
      }),
    },
  ),
);
