import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toDate } from "@/lib/firestore-utils";
import { useSnapshotQuery } from "@/lib/use-snapshot-query";
import { useUid } from "@/features/auth/auth-context";
import type { Note, NoteContentFields } from "./types";

const notesCol = (uid: string) => collection(db, "users", uid, "notes");

export const EMPTY_DOC = JSON.stringify({ type: "doc", content: [] });

function toNote(snap: QueryDocumentSnapshot): Note {
  const data = snap.data({ serverTimestamps: "estimate" });
  return {
    id: snap.id,
    bookId: data.bookId,
    title: data.title ?? "",
    content: data.content ?? EMPTY_DOC,
    plainText: data.plainText ?? "",
    tags: data.tags ?? [],
    isPinned: data.isPinned ?? false,
    paperStyle: data.paperStyle ?? "plain",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    deletedAt: data.deletedAt ? toDate(data.deletedAt) : null,
  };
}

/** Live notes of one book, excluding Trash. */
export function useNotes(bookId: string | undefined) {
  const uid = useUid();
  return useSnapshotQuery<Note[]>(
    ["notes", uid, bookId],
    (onData, onError) =>
      onSnapshot(
        query(
          notesCol(uid),
          where("bookId", "==", bookId ?? ""),
          where("deletedAt", "==", null),
        ),
        (snap) => onData(snap.docs.map(toNote)),
        onError,
      ),
    Boolean(bookId),
  );
}

/** Creates the note locally right away and returns its id; the write syncs in the background. */
export function createNote(uid: string, bookId: string) {
  const ref = doc(notesCol(uid));
  setDoc(ref, {
    bookId,
    title: "",
    content: EMPTY_DOC,
    plainText: "",
    tags: [],
    isPinned: false,
    paperStyle: "plain",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  }).catch((error) => console.error("Create note failed", error));
  return ref.id;
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

export function moveNote(uid: string, noteId: string, bookId: string) {
  return updateDoc(doc(notesCol(uid), noteId), {
    bookId,
    updatedAt: serverTimestamp(),
  });
}

/** Moves the note to Trash. */
export function deleteNote(uid: string, noteId: string) {
  return updateDoc(doc(notesCol(uid), noteId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
