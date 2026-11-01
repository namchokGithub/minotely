import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toDate } from "@/lib/firestore-utils";
import { useSnapshotQuery } from "@/lib/use-snapshot-query";
import { useUid } from "@/features/auth/auth-context";
import type { Book, BookInput } from "./types";

const booksCol = (uid: string) => collection(db, "users", uid, "books");

function toBook(snap: QueryDocumentSnapshot): Book {
  const data = snap.data({ serverTimestamps: "estimate" });
  return {
    id: snap.id,
    name: data.name ?? "",
    color: data.color ?? "gray",
    icon: data.icon ?? "book",
    order: data.order ?? 0,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function useBooks() {
  const uid = useUid();
  return useSnapshotQuery<Book[]>(["books", uid], (onData, onError) =>
    onSnapshot(
      booksCol(uid),
      (snap) => onData(snap.docs.map(toBook).sort((a, b) => a.order - b.order)),
      onError,
    ),
  );
}

/** Creates the book locally right away and returns its id; the write syncs in the background. */
export function createBook(uid: string, input: BookInput, order: number) {
  const ref = doc(booksCol(uid));
  setDoc(ref, {
    ...input,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch((error) => console.error("Create book failed", error));
  return ref.id;
}

export function updateBook(uid: string, bookId: string, input: BookInput) {
  return updateDoc(doc(booksCol(uid), bookId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes the book and moves its notes to Trash (soft delete), in one batch. */
export async function deleteBook(uid: string, bookId: string) {
  const notes = await getDocs(
    query(
      collection(db, "users", uid, "notes"),
      where("bookId", "==", bookId),
      where("deletedAt", "==", null),
    ),
  );
  const batch = writeBatch(db);
  for (const note of notes.docs) {
    batch.update(note.ref, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  batch.delete(doc(booksCol(uid), bookId));
  await batch.commit();
}
