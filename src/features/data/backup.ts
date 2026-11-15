import {
  doc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firestore";
import { booksCol, toBook } from "@/features/books/api";
import { isValidBookColor } from "@/features/books/appearance";
import { BATCH_LIMIT, EMPTY_DOC, notesCol, toNote } from "@/features/notes/api";
import { normalizeTag } from "@/features/notes/tags";
import { toNoteIcon } from "@/features/notes/note-icon";
import { effectiveParentId, type TreeLink } from "@/features/notes/tree";

// Limits match firestore.rules (D17).
const MAX_BOOK_NAME = 80;
const MAX_TITLE = 200;
const MAX_TAGS = 20;
const PAPER_STYLES = ["plain", "margin", "lined", "grid", "dotted"];

const BACKUP_APP = "minotely";
const BACKUP_VERSION = 1;

type BackupBook = {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type BackupNote = {
  id: string;
  bookId: string;
  title: string;
  /** Missing in backups made before D46. */
  icon?: string;
  /** Parent note id within the backup (D49); missing for top-level notes and older backups. */
  parentId?: string;
  content: string;
  plainText: string;
  tags: string[];
  isPinned: boolean;
  isLocked?: boolean;
  paperStyle: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Backup = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  books: BackupBook[];
  notes: BackupNote[];
};

/** All books and all notes not in Trash. */
export async function exportBackup(uid: string): Promise<Backup> {
  const [bookSnap, noteSnap] = await Promise.all([
    getDocs(booksCol(uid)),
    getDocs(query(notesCol(uid), where("deletedAt", "==", null))),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    books: bookSnap.docs.map(toBook).map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    notes: noteSnap.docs.map(toNote).map((n) => ({
      id: n.id,
      bookId: n.bookId,
      title: n.title,
      icon: n.icon,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      content: n.content,
      plainText: n.plainText,
      tags: n.tags,
      isPinned: n.isPinned,
      isLocked: n.isLocked,
      paperStyle: n.paperStyle,
      order: n.order,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
  };
}

/** Parses and checks a backup file. Throws a readable message when it is not one. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  const backup = data as Partial<Backup>;
  if (
    backup?.app !== BACKUP_APP ||
    !Array.isArray(backup.books) ||
    !Array.isArray(backup.notes)
  ) {
    throw new Error("The file is not a Minotely backup.");
  }
  if ((backup.version ?? 0) > BACKUP_VERSION) {
    throw new Error("The backup was made by a newer version of Minotely.");
  }
  return backup as Backup;
}

const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const time = (v: unknown) => {
  const date = new Date(str(v));
  return Timestamp.fromDate(Number.isNaN(date.getTime()) ? new Date() : date);
};

/**
 * Adds the backup's books and notes as new documents (new ids), so importing
 * never overwrites existing data. Notes whose book is missing from the backup
 * are skipped. Returns the counts written.
 */
export async function importBackup(uid: string, backup: Backup) {
  const bookIds = new Map<string, string>();
  const writes: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];

  for (const book of backup.books) {
    const ref = doc(booksCol(uid));
    bookIds.set(str(book.id), ref.id);
    writes.push((batch) =>
      batch.set(ref, {
        name: str(book.name).trim().slice(0, MAX_BOOK_NAME) || "Untitled",
        color: isValidBookColor(str(book.color)) ? str(book.color) : "gray",
        icon: str(book.icon, "book"),
        order: num(book.order, 0),
        createdAt: time(book.createdAt),
        updatedAt: time(book.updatedAt),
      }),
    );
  }

  // Pass 1 (D49): a new id for every imported note, so sub-pages can point at
  // their parent's new id. A parent that is not imported, in another book, in a
  // cycle or too deep is dropped by the same rule the app uses to show the tree.
  const imported = backup.notes.filter((note) => bookIds.has(str(note.bookId)));
  // Each imported note gets its own new document, even with a missing or
  // repeated id in the file; only unique ids can be parents.
  const keys = imported.map((note, index) => {
    const id = str(note.id);
    const first = imported.findIndex((other) => str(other.id) === id);
    return id && first === index ? id : `#${index}`;
  });
  const noteIds = new Map(keys.map((key) => [key, doc(notesCol(uid)).id]));
  const links: TreeLink[] = imported.map((note, index) => ({
    id: keys[index],
    bookId: str(note.bookId),
    parentId: str(note.parentId) || null,
  }));

  let notes = 0;
  for (const [index, note] of imported.entries()) {
    const bookId = bookIds.get(str(note.bookId))!;
    const ref = doc(notesCol(uid), noteIds.get(keys[index]));
    const oldParent = effectiveParentId(keys[index], links);
    const parentId = oldParent ? noteIds.get(oldParent) : undefined;
    const createdAt = time(note.createdAt);
    notes += 1;
    writes.push((batch) =>
      batch.set(ref, {
        bookId,
        ...(parentId ? { parentId } : {}),
        title: str(note.title).slice(0, MAX_TITLE),
        icon: toNoteIcon(str(note.icon)),
        content: str(note.content, EMPTY_DOC),
        plainText: str(note.plainText),
        tags: Array.isArray(note.tags)
          ? [
              ...new Set(
                note.tags
                  .filter((t) => typeof t === "string")
                  .map(normalizeTag)
                  .filter(Boolean),
              ),
            ].slice(0, MAX_TAGS)
          : [],
        isPinned: note.isPinned === true,
        isLocked: note.isLocked === true,
        paperStyle: PAPER_STYLES.includes(str(note.paperStyle))
          ? note.paperStyle
          : "plain",
        order: num(note.order, createdAt.toMillis()),
        createdAt,
        updatedAt: time(note.updatedAt),
        deletedAt: null,
      }),
    );
  }

  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    writes.slice(i, i + BATCH_LIMIT).forEach((write) => write(batch));
    try {
      await batch.commit();
    } catch (error) {
      // Sub-pages need the Security Rules from D49; earlier batches stay imported.
      if ((error as { code?: string }).code === "permission-denied") {
        throw new Error(
          "Firestore refused part of the import. If this backup has sub-pages, publish the latest Security Rules, then import again (notes already added stay).",
          { cause: error },
        );
      }
      throw error;
    }
  }

  return { books: bookIds.size, notes };
}
