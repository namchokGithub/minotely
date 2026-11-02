export type PaperStyle = "plain" | "lined" | "grid" | "dotted";

export type Note = {
  id: string;
  bookId: string;
  title: string;
  /** Tiptap JSON, serialized as a string (D10). */
  content: string;
  /** Derived from content on save; used for search and list snippets. */
  plainText: string;
  tags: string[];
  isPinned: boolean;
  /** Read-only in the editor until unlocked (M5.6). */
  isLocked: boolean;
  paperStyle: PaperStyle;
  /** Custom sort position, ascending. Falls back to createdAt (ms) for older notes. */
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type NoteContentFields = Pick<Note, "title" | "content" | "plainText">;

export type NoteSort = "updated" | "created" | "title" | "custom";
