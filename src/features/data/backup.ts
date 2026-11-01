import {
  doc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { booksCol, toBook } from "@/features/books/api";
import { BATCH_LIMIT, EMPTY_DOC, notesCol, toNote } from "@/features/notes/api";

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
  content: string;
  plainText: string;
  tags: string[];
  isPinned: boolean;
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
      content: n.content,
      plainText: n.plainText,
      tags: n.tags,
      isPinned: n.isPinned,
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
        name: str(book.name, "Untitled"),
        color: str(book.color, "gray"),
        icon: str(book.icon, "book"),
        order: num(book.order, 0),
        createdAt: time(book.createdAt),
        updatedAt: time(book.updatedAt),
      }),
    );
  }

  let notes = 0;
  for (const note of backup.notes) {
    const bookId = bookIds.get(str(note.bookId));
    if (!bookId) continue;
    const ref = doc(notesCol(uid));
    const createdAt = time(note.createdAt);
    notes += 1;
    writes.push((batch) =>
      batch.set(ref, {
        bookId,
        title: str(note.title),
        content: str(note.content, EMPTY_DOC),
        plainText: str(note.plainText),
        tags: Array.isArray(note.tags)
          ? note.tags.filter((t) => typeof t === "string")
          : [],
        isPinned: note.isPinned === true,
        paperStyle: str(note.paperStyle, "plain"),
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
    await batch.commit();
  }

  return { books: bookIds.size, notes };
}
