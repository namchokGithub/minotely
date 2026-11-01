import type { Note, NoteSort } from "./types";

const compareBy: Record<NoteSort, (a: Note, b: Note) => number> = {
  updated: (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  created: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  title: (a, b) =>
    (a.title || "Untitled").localeCompare(b.title || "Untitled", undefined, {
      sensitivity: "base",
      numeric: true,
    }),
};

/** Pinned notes first, then by the chosen order. */
export function sortNotes(notes: Note[], sort: NoteSort): Note[] {
  return [...notes].sort(
    (a, b) => Number(b.isPinned) - Number(a.isPinned) || compareBy[sort](a, b),
  );
}
