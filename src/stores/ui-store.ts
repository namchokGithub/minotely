import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NoteSort } from "@/features/notes/types";
import { clamp, LIBRARY_WIDTH, NOTES_WIDTH } from "@/app/panel-sizes";

export type ThemePreference = "system" | "light" | "dark";

type UiState = {
  theme: ThemePreference;
  booksSidebarOpen: boolean;
  noteSort: NoteSort;
  searchOpen: boolean;
  /** Saved column widths in px, per device (M5.4). */
  libraryWidth: number;
  notesWidth: number;
  setTheme: (theme: ThemePreference) => void;
  toggleBooksSidebar: () => void;
  setBooksSidebarOpen: (booksSidebarOpen: boolean) => void;
  setNoteSort: (noteSort: NoteSort) => void;
  setSearchOpen: (searchOpen: boolean) => void;
  setLibraryWidth: (width: number) => void;
  setNotesWidth: (width: number) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      booksSidebarOpen: true,
      noteSort: "updated",
      searchOpen: false,
      libraryWidth: LIBRARY_WIDTH.default,
      notesWidth: NOTES_WIDTH.default,
      setTheme: (theme) => set({ theme }),
      toggleBooksSidebar: () =>
        set((state) => ({ booksSidebarOpen: !state.booksSidebarOpen })),
      setNoteSort: (noteSort) => set({ noteSort }),
      setBooksSidebarOpen: (booksSidebarOpen) => set({ booksSidebarOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setLibraryWidth: (width) =>
        set({
          libraryWidth: clamp(width, LIBRARY_WIDTH.min, LIBRARY_WIDTH.max),
        }),
      setNotesWidth: (width) =>
        set({ notesWidth: clamp(width, NOTES_WIDTH.min, NOTES_WIDTH.max) }),
    }),
    {
      // Read by the inline script in index.html to avoid a theme flash.
      name: "minotely-ui",
      partialize: (state) => ({
        theme: state.theme,
        booksSidebarOpen: state.booksSidebarOpen,
        noteSort: state.noteSort,
        libraryWidth: state.libraryWidth,
        notesWidth: state.notesWidth,
      }),
    },
  ),
);
