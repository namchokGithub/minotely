import Dexie, { type EntityTable } from "dexie";

/** Unsaved note edits kept in the browser until Firestore confirms the write. */
export type NoteDraft = {
  noteId: string;
  uid: string;
  title: string;
  content: string;
  plainText: string;
  updatedAt: number;
  /** Title and content last confirmed in Firestore when this draft was written (D32). Missing in older drafts. */
  baseTitle?: string;
  baseContent?: string;
};

const localDb = new Dexie("minotely") as Dexie & {
  drafts: EntityTable<NoteDraft, "noteId">;
};

localDb.version(1).stores({ drafts: "noteId, uid" });

export function getDraft(noteId: string) {
  return localDb.drafts.get(noteId);
}

export function putDraft(draft: NoteDraft) {
  return localDb.drafts.put(draft);
}

export function deleteDraft(noteId: string) {
  return localDb.drafts.delete(noteId);
}
