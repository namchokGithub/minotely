import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NoteSort } from "@/features/notes/types";
import { clamp, LIBRARY_WIDTH, NOTES_WIDTH } from "@/app/panel-sizes";
import { isPageWidth, type PageWidth } from "@/features/editor/page-width";
import { isCodeTheme, type CodeTheme } from "@/features/editor/code-theme";

export type ThemePreference = "system" | "light" | "dark";

type UiState = {
  theme: ThemePreference;
  /** Library column expanded; collapsed it is a narrow rail (768px and up, D44). */
  booksSidebarOpen: boolean;
  /** Notes column expanded; collapsed it is a narrow rail (768px and up, D44). */
  notesPanelOpen: boolean;
  noteSort: NoteSort;
  /** Page column width preset for all notes, this device only (D45). */
  pageWidth: PageWidth;
  /** Code block colors for all notes, this device only (D48). */
  codeTheme: CodeTheme;
  /** Notes whose sub-pages are hidden in the Notes column, this device (D49). */
  collapsedNotes: string[];
  searchOpen: boolean;
  /** Saved column widths in px, per device (M5.4). */
  libraryWidth: number;
  notesWidth: number;
  /** Book opened last; the mobile Notes tab returns to it (D30). */
  lastBookId: string | null;
  setTheme: (theme: ThemePreference) => void;
  toggleBooksSidebar: () => void;
  setBooksSidebarOpen: (booksSidebarOpen: boolean) => void;
  toggleNotesPanel: () => void;
  setNoteSort: (noteSort: NoteSort) => void;
  setPageWidth: (pageWidth: PageWidth) => void;
  setCodeTheme: (codeTheme: CodeTheme) => void;
  toggleNoteCollapsed: (noteId: string) => void;
  setSearchOpen: (searchOpen: boolean) => void;
  setLibraryWidth: (width: number) => void;
  setNotesWidth: (width: number) => void;
  setLastBookId: (bookId: string | null) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      booksSidebarOpen: true,
      notesPanelOpen: true,
      noteSort: "updated",
      pageWidth: "default",
      codeTheme: "default",
      collapsedNotes: [],
      searchOpen: false,
      libraryWidth: LIBRARY_WIDTH.default,
      notesWidth: NOTES_WIDTH.default,
      lastBookId: null,
      setTheme: (theme) => set({ theme }),
      toggleBooksSidebar: () =>
        set((state) => ({ booksSidebarOpen: !state.booksSidebarOpen })),
      toggleNotesPanel: () =>
        set((state) => ({ notesPanelOpen: !state.notesPanelOpen })),
      setNoteSort: (noteSort) => set({ noteSort }),
      setPageWidth: (pageWidth) =>
        set({ pageWidth: isPageWidth(pageWidth) ? pageWidth : "default" }),
      toggleNoteCollapsed: (noteId) =>
        set((state) => ({
          collapsedNotes: state.collapsedNotes.includes(noteId)
            ? state.collapsedNotes.filter((id) => id !== noteId)
            : [...state.collapsedNotes, noteId],
        })),
      setCodeTheme: (codeTheme) =>
        set({ codeTheme: isCodeTheme(codeTheme) ? codeTheme : "default" }),
      setBooksSidebarOpen: (booksSidebarOpen) => set({ booksSidebarOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setLastBookId: (lastBookId) => set({ lastBookId }),
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
        notesPanelOpen: state.notesPanelOpen,
        noteSort: state.noteSort,
        pageWidth: state.pageWidth,
        codeTheme: state.codeTheme,
        collapsedNotes: state.collapsedNotes,
        libraryWidth: state.libraryWidth,
        notesWidth: state.notesWidth,
        lastBookId: state.lastBookId,
      }),
    },
  ),
);
