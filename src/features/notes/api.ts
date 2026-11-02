import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firestore";
import { deleteDraft } from "@/lib/db";
import { toDate } from "@/lib/firestore-utils";
import { useSnapshotQuery } from "@/lib/use-snapshot-query";
import { useUid } from "@/features/auth/auth-context";
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
    title: data.title ?? "",
    content: data.content ?? EMPTY_DOC,
    plainText: data.plainText ?? "",
    tags: data.tags ?? [],
    isPinned: data.isPinned ?? false,
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

/** Live notes of one book, excluding Trash. */
export function useNotes(bookId: string | undefined) {
  return useNotesQuery(
    ["book", bookId],
    [where("bookId", "==", bookId ?? ""), where("deletedAt", "==", null)],
    Boolean(bookId),
  );
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
    paperStyle: "plain",
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  };
}

/** Creates the note locally right away and returns its id; the write syncs in the background. */
export function createNote(
  uid: string,
  bookId: string,
  fields?: Partial<NoteContentFields>,
) {
  const ref = doc(notesCol(uid));
  setDoc(ref, newNoteData(bookId, fields)).catch((error) =>
    console.error("Create note failed", error),
  );
  return ref.id;
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

export function saveNoteContent(
  uid: string,
  noteId: string,
  fields: NoteContentFields,
) {
  return updateDoc(doc(notesCol(uid), noteId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export function setNotePinned(uid: string, noteId: string, isPinned: boolean) {
  return updateDoc(doc(notesCol(uid), noteId), { isPinned });
}

export function setNoteTags(uid: string, noteId: string, tags: string[]) {
  return updateDoc(doc(notesCol(uid), noteId), {
    tags,
    updatedAt: serverTimestamp(),
  });
}

export function setNotePaperStyle(
  uid: string,
  noteId: string,
  paperStyle: PaperStyle,
) {
  return updateDoc(doc(notesCol(uid), noteId), { paperStyle });
}

export function moveNote(uid: string, noteId: string, bookId: string) {
  return updateDoc(doc(notesCol(uid), noteId), {
    bookId,
    updatedAt: serverTimestamp(),
  });
}

/** Swaps the custom order of two notes. */
export function swapNoteOrder(uid: string, a: Note, b: Note) {
  const batch = writeBatch(db);
  const bOrder = a.order === b.order ? b.order - 1 : b.order;
  batch.update(doc(notesCol(uid), a.id), { order: bOrder });
  batch.update(doc(notesCol(uid), b.id), { order: a.order });
  return batch.commit();
}

/** Moves the note to Trash. */
export function deleteNote(uid: string, noteId: string) {
  return updateDoc(doc(notesCol(uid), noteId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Brings a note back from Trash, optionally into another book. */
export function restoreNote(uid: string, noteId: string, bookId?: string) {
  return updateDoc(doc(notesCol(uid), noteId), {
    ...(bookId ? { bookId } : {}),
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNoteForever(uid: string, noteId: string) {
  await deleteDoc(doc(notesCol(uid), noteId));
  await deleteDraft(noteId);
}

export async function emptyTrash(uid: string, noteIds: string[]) {
  for (let i = 0; i < noteIds.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const id of noteIds.slice(i, i + BATCH_LIMIT)) {
      batch.delete(doc(notesCol(uid), id));
    }
    await batch.commit();
  }
  await Promise.all(noteIds.map((id) => deleteDraft(id)));
}
