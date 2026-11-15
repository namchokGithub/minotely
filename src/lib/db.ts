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

export type VersionKind = "auto" | "manual";

/** A past copy of a note, kept in this browser only (D42). */
export type NoteVersion = {
  id: number;
  noteId: string;
  uid: string;
  title: string;
  /** Tiptap JSON, serialized as a string (D10). */
  content: string;
  kind: VersionKind;
  createdAt: number;
};

/** Versions kept per note and kind; the oldest is dropped first (D42). */
export const MAX_VERSIONS_PER_KIND = 10;

const localDb = new Dexie("minotely") as Dexie & {
  drafts: EntityTable<NoteDraft, "noteId">;
  versions: EntityTable<NoteVersion, "id">;
};

localDb.version(1).stores({ drafts: "noteId, uid" });
localDb.version(2).stores({
  drafts: "noteId, uid",
  versions: "++id, noteId, uid",
});

export function getDraft(noteId: string) {
  return localDb.drafts.get(noteId);
}

export function putDraft(draft: NoteDraft) {
  return localDb.drafts.put(draft);
}

export function deleteDraft(noteId: string) {
  return localDb.drafts.delete(noteId);
}

/** This user's versions of one note, newest first. */
export async function listVersions(uid: string, noteId: string) {
  const versions = await localDb.versions
    .where("noteId")
    .equals(noteId)
    .filter((version) => version.uid === uid)
    .toArray();
  return versions.sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
}

/** Adds a version, then drops the oldest ones of the same kind beyond the limit. */
export function addVersion(version: Omit<NoteVersion, "id" | "createdAt">) {
  return localDb.transaction("rw", localDb.versions, async () => {
    await localDb.versions.add({ ...version, createdAt: Date.now() });
    const sameKind = (await listVersions(version.uid, version.noteId)).filter(
      (other) => other.kind === version.kind,
    );
    await localDb.versions.bulkDelete(
      sameKind.slice(MAX_VERSIONS_PER_KIND).map((old) => old.id),
    );
  });
}

export function deleteVersions(noteId: string) {
  return localDb.versions.where("noteId").equals(noteId).delete();
}

/** Drops this user's versions of notes that no longer exist (deleted forever on another device). */
export function deleteVersionsExcept(uid: string, noteIds: Set<string>) {
  return localDb.versions
    .where("uid")
    .equals(uid)
    .filter((version) => !noteIds.has(version.noteId))
    .delete();
}
