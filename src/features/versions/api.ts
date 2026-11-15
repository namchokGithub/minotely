import { addVersion, listVersions, type VersionKind } from "@/lib/db";
import type { NoteContentFields } from "@/features/notes/types";

export type VersionContent = Pick<NoteContentFields, "title" | "content">;

/** At most one Auto version per note in this window (D42). */
export const AUTO_VERSION_GAP_MS = 10 * 60_000;

export type SaveVersionResult = "created" | "unchanged" | "too-soon" | "empty";

const isEmpty = ({ title, content }: VersionContent) =>
  !title.trim() && !content.includes('"text":');

/**
 * Keeps a copy of a note in this browser (D42). Nothing is stored when the note
 * is empty or the newest version already holds the same title and content.
 * `minGapMs` also skips an Auto version made too soon after the last Auto one.
 */
export async function saveVersion(
  uid: string,
  noteId: string,
  fields: VersionContent,
  kind: VersionKind,
  minGapMs = 0,
): Promise<SaveVersionResult> {
  if (isEmpty(fields)) return "empty";
  const versions = await listVersions(uid, noteId);
  const newest = versions[0];
  const same =
    newest?.title === fields.title && newest.content === fields.content;
  // A Manual version of content that only an Auto version holds is still worth keeping.
  if (same && (kind === "auto" || newest.kind === "manual")) return "unchanged";
  if (minGapMs > 0) {
    const lastOfKind = versions.find((version) => version.kind === kind);
    if (lastOfKind && Date.now() - lastOfKind.createdAt < minGapMs) {
      return "too-soon";
    }
  }
  await addVersion({
    noteId,
    uid,
    title: fields.title,
    content: fields.content,
    kind,
  });
  return "created";
}
