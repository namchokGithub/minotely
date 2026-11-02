import type { Book } from "@/features/books/types";
import type { Note } from "@/features/notes/types";

/** Data attached to every draggable / droppable item (D24). */
export type DragData =
  { type: "book"; book: Book } | { type: "note"; note: Note };

export const bookDragId = (id: string) => `book:${id}`;
export const noteDragId = (id: string) => `note:${id}`;
