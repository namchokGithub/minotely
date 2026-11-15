export type PaperStyle = "plain" | "margin" | "lined" | "grid" | "dotted";

export type Note = {
  id: string;
  bookId: string;
  /** Parent note in the same book; null at the top level (D49). Only an effective parent counts, see tree.ts. */
  parentId: string | null;
  title: string;
  /** One emoji shown before the title; "" for none (D46). */
  icon: string;
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
