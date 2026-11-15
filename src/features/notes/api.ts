import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type UpdateData,
} from "firebase/firestore";
import { useMemo } from "react";
import { db } from "@/lib/firestore";
import { deleteDraft, deleteVersions } from "@/lib/db";
import { toDate } from "@/lib/firestore-utils";
import { useSnapshotQuery } from "@/lib/use-snapshot-query";
import { useUid } from "@/features/auth/auth-context";
import { toNoteIcon } from "./note-icon";
import { descendantsOf } from "./tree";
import type { Note, NoteContentFields, PaperStyle } from "./types";

export const notesCol = (uid: string) => collection(db, "users", uid, "notes");

export const EMPTY_DOC = JSON.stringify({ type: "doc", content: [] });

/** Firestore allows 500 writes per batch. */
export const BATCH_LIMIT = 400;

export function toNote(snap: QueryDocumentSnapshot): Note {
  const data = snap.data({ serverTimestamps: "estimate" });
  const createdAt = toDate(data.createdAt);
  return {
    id: snap.id,
    bookId: data.bookId,
    // Notes created before D49, and top-level notes, have no `parentId`.
    parentId:
      typeof data.parentId === "string" && data.parentId ? data.parentId : null,
    title: data.title ?? "",
    // Notes created before D46 have no `icon`.
    icon: typeof data.icon === "string" ? data.icon : "",
    content: data.content ?? EMPTY_DOC,
    plainText: data.plainText ?? "",
    tags: data.tags ?? [],
    isPinned: data.isPinned ?? false,
    isLocked: data.isLocked ?? false,
    paperStyle: data.paperStyle ?? "plain",
    order: data.order ?? createdAt.getTime(),
    createdAt,
    updatedAt: toDate(data.updatedAt),
    deletedAt: data.deletedAt ? toDate(data.deletedAt) : null,
  };
}

function useNotesQuery(
  key: unknown[],
  constraints: QueryConstraint[],
  enabled = true,
) {
  const uid = useUid();
  return useSnapshotQuery<Note[]>(
    ["notes", uid, ...key],
    (onData, onError) =>
      onSnapshot(
        query(notesCol(uid), ...constraints),
        (snap) => onData(snap.docs.map(toNote)),
        onError,
      ),
    enabled,
  );
}

/**
 * Live notes of one book, excluding Trash. Filtered from the all-notes listener
 * so opening a book or syncing a note is not read twice (D33).
 */
export function useNotes(bookId: string | undefined) {
  const all = useAllNotes(Boolean(bookId));
  const data = useMemo(
    () =>
      bookId ? all.data?.filter((note) => note.bookId === bookId) : undefined,
    [all.data, bookId],
  );
  return { data, isPending: all.isPending, isError: all.isError };
}

/** Live notes of every book, excluding Trash (search). */
export function useAllNotes(enabled = true) {
  return useNotesQuery(["all"], [where("deletedAt", "==", null)], enabled);
}

/** Live notes in Trash. */
export function useTrashNotes() {
  return useNotesQuery(["trash"], [where("deletedAt", "!=", null)]);
}

function newNoteData(
  bookId: string,
  fields?: Partial<NoteContentFields>,
  order = Date.now(),
) {
  return {
    bookId,
    title: "",
    content: EMPTY_DOC,
    plainText: "",
    ...fields,
    tags: [],
    isPinned: false,
    isLocked: false,
    paperStyle: "plain",
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  };
}

/**
 * Creates the note locally right away and returns its id; the write syncs in the background.
 * With `parentId` it is a sub-page (D49); top-level notes have no `parentId` key.
 */
export function createNote(
  uid: string,
  bookId: string,
  fields?: Partial<NoteContentFields>,
  parentId?: string,
) {
  const ref = doc(notesCol(uid));
  setDoc(ref, {
    ...newNoteData(bookId, fields),
    ...(parentId ? { parentId } : {}),
  }).catch((error) => console.error("Create note failed", error));
  return ref.id;
}

/**
 * Creates an empty sub-page of `parent` (D49). Returns the new id at once and
 * the write, so the caller can report a refusal (Security Rules not published yet).
 */
export function createSubPage(uid: string, parent: Note) {
  const ref = doc(notesCol(uid));
  const written = setDoc(ref, {
    ...newNoteData(parent.bookId),
    parentId: parent.id,
  });
  return { id: ref.id, written };
}

/** Creates several notes and waits for Firestore, so failures reach the caller. */
export async function importNotes(
  uid: string,
  bookId: string,
  notes: NoteContentFields[],
) {
  const start = Date.now();
  for (let i = 0; i < notes.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    notes.slice(i, i + BATCH_LIMIT).forEach((fields, j) => {
      batch.set(doc(notesCol(uid)), newNoteData(bookId, fields, start + i + j));
    });
    await batch.commit();
  }
}

/** The note's title and content in Firestore differ from both the edit's base and the edit itself (D32). */
export class NoteConflictError extends Error {
  readonly remote: NoteContentFields;

  constructor(remote: NoteContentFields) {
    super("Note changed elsewhere");
    this.remote = remote;
  }
}

type ContentBase = Pick<NoteContentFields, "title" | "content">;

const sameContent = (a: ContentBase, b: ContentBase) =>
  a.title === b.title && a.content === b.content;

/**
 * Saves title and content in a transaction. With a `base`, the write is refused
 * (NoteConflictError) when Firestore holds a version that is neither the base nor
 * this edit. `base: null` overwrites. Needs the server: fails while offline.
 */
export function saveNoteContent(
  uid: string,
  noteId: string,
  fields: NoteContentFields,
  base: ContentBase | null,
) {
  const ref = doc(notesCol(uid), noteId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Note not found");
    const data = snap.data();
    const remote: NoteContentFields = {
      title: data.title ?? "",
      content: data.content ?? EMPTY_DOC,
      plainText: data.plainText ?? "",
    };
    if (base && !sameContent(remote, base) && !sameContent(remote, fields)) {
      throw new NoteConflictError(remote);
    }
    tx.update(ref, { ...fields, updatedAt: serverTimestamp() });
  });
}

export function setNotePinned(uid: string, noteId: string, isPinned: boolean) {
  return updateDoc(doc(notesCol(uid), noteId), { isPinned });
}

export function setNoteLocked(uid: string, noteId: string, isLocked: boolean) {
  return updateDoc(doc(notesCol(uid), noteId), { isLocked });
}

export function setNoteTags(uid: string, noteId: string, tags: string[]) {
  return updateDoc(doc(notesCol(uid), noteId), {
    tags,
    updatedAt: serverTimestamp(),
  });
}

/** Sets or clears ("") the note's icon (D46). Like paper style, it does not bump `updatedAt`. */
export function setNoteIcon(uid: string, noteId: string, icon: string) {
  return updateDoc(doc(notesCol(uid), noteId), { icon: toNoteIcon(icon) });
}

export function setNotePaperStyle(
  uid: string,
  noteId: string,
  paperStyle: PaperStyle,
) {
  return updateDoc(doc(notesCol(uid), noteId), { paperStyle });
}

type NoteUpdate = { ref: DocumentReference; data: UpdateData<DocumentData> };

async function commitInBatches(updates: NoteUpdate[]) {
  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const { ref, data } of updates.slice(i, i + BATCH_LIMIT)) {
      batch.update(ref, data);
    }
    await batch.commit();
  }
}

/** Makes the note a sub-page of `parentId`, or a top-level note with null (D49). */
export function setNoteParent(
  uid: string,
  noteId: string,
  parentId: string | null,
) {
  return updateDoc(doc(notesCol(uid), noteId), {
    parentId: parentId ?? deleteField(),
  });
}

/**
 * Moves the note and its sub-pages to another book (D49). The note becomes a
 * top-level note there; its sub-pages keep their parents.
 */
export function moveBranch(
  uid: string,
  note: Note,
  bookId: string,
  allNotes: Note[],
) {
  const branch = [note, ...descendantsOf(note.id, allNotes)];
  return commitInBatches(
    branch.map((n) => ({
      ref: doc(notesCol(uid), n.id),
      data: {
        bookId,
        updatedAt: serverTimestamp(),
        ...(n.id === note.id ? { parentId: deleteField() } : {}),
      },
    })),
  );
}

/** Undo of `moveBranch`: the same notes go back to their book; the note gets its old parent back. */
export function undoMoveBranch(
  uid: string,
  note: Note,
  allNotesBefore: Note[],
) {
  const branch = [note, ...descendantsOf(note.id, allNotesBefore)];
  return commitInBatches(
    branch.map((n) => ({
      ref: doc(notesCol(uid), n.id),
      data: {
        bookId: n.bookId,
        updatedAt: serverTimestamp(),
        ...(n.id === note.id
          ? { parentId: note.parentId ?? deleteField() }
          : {}),
      },
    })),
  );
}

/**
 * Moves the note and its sub-pages to Trash with one shared `deletedAt`, so a
 * restore can bring the branch back together (D49).
 */
export function deleteBranch(uid: string, note: Note, allNotes: Note[]) {
  const branch = [note, ...descendantsOf(note.id, allNotes)];
  // One batch gives every note the same server time; several batches would not.
  const deletedAt =
    branch.length <= BATCH_LIMIT ? serverTimestamp() : Timestamp.now();
  return commitInBatches(
    branch.map((n) => ({
      ref: doc(notesCol(uid), n.id),
      data: { deletedAt, updatedAt: serverTimestamp() },
    })),
  );
}

/**
 * Brings a note back from Trash with the sub-pages deleted in the same action
 * (same `deletedAt`). With `bookId` they all move to that book and the note
 * becomes top level there (D49).
 */
export function restoreBranch(
  uid: string,
  note: Note,
  trashNotes: Note[],
  bookId?: string,
) {
  const deletedAt = note.deletedAt?.getTime();
  const sameDelete = trashNotes.filter(
    (n) => n.deletedAt?.getTime() === deletedAt,
  );
  const branch = [note, ...descendantsOf(note.id, sameDelete)];
  return commitInBatches(
    branch.map((n) => ({
      ref: doc(notesCol(uid), n.id),
      data: {
        deletedAt: null,
        updatedAt: serverTimestamp(),
        ...(bookId ? { bookId } : {}),
        ...(bookId && n.id === note.id ? { parentId: deleteField() } : {}),
      },
    })),
  );
}

/** Swaps the custom order of two notes. */
export function swapNoteOrder(uid: string, a: Note, b: Note) {
  const batch = writeBatch(db);
  const bOrder = a.order === b.order ? b.order - 1 : b.order;
  batch.update(doc(notesCol(uid), a.id), { order: bOrder });
  batch.update(doc(notesCol(uid), b.id), { order: a.order });
  return batch.commit();
}

export async function deleteNoteForever(uid: string, noteId: string) {
  await deleteDoc(doc(notesCol(uid), noteId));
  await Promise.all([deleteDraft(noteId), deleteVersions(noteId)]);
}

export async function emptyTrash(uid: string, noteIds: string[]) {
  for (let i = 0; i < noteIds.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const id of noteIds.slice(i, i + BATCH_LIMIT)) {
      batch.delete(doc(notesCol(uid), id));
    }
    await batch.commit();
  }
  await Promise.all(
    noteIds.flatMap((id) => [deleteDraft(id), deleteVersions(id)]),
  );
}

/**
 * Adds a Page line for `child` at the end of `parent`'s content (D50), when the
 * parent is not open in an editor (see `requestPageLink`). Uses the checked
 * transaction of D32; a refusal leaves the sub-page in the tree without a line.
 */
export async function appendPageLink(
  uid: string,
  parent: Note,
  child: Pick<Note, "id" | "bookId" | "title">,
) {
  // Loaded on demand: the Tiptap schema and Markdown live with the editor.
  const [{ plainTextOf }, { parseContent }] = await Promise.all([
    import("@/features/data/markdown"),
    import("@/features/editor/extensions"),
  ]);
  const content = parseContent(parent.content);
  content.content = [
    ...(content.content ?? []),
    {
      type: "pageLink",
      attrs: { pageId: child.id, bookId: child.bookId, title: child.title },
    },
  ];
  await saveNoteContent(
    uid,
    parent.id,
    {
      title: parent.title,
      content: JSON.stringify(content),
      plainText: plainTextOf(content),
    },
    { title: parent.title, content: parent.content },
  );
}

/** Renames a note from a Page line (D50), with the conflict check of D32. */
export function renameNote(uid: string, note: Note, title: string) {
  return saveNoteContent(
    uid,
    note.id,
    {
      title: title.slice(0, 200),
      content: note.content,
      plainText: note.plainText,
    },
    { title: note.title, content: note.content },
  );
}
