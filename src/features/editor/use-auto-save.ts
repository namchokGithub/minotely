import { useEffect, useMemo, useState } from "react";
import { deleteDraft, putDraft } from "@/lib/db";
import { NoteConflictError, saveNoteContent } from "@/features/notes/api";
import type { NoteContentFields } from "@/features/notes/types";

export type SaveStatus =
  "idle" | "local" | "syncing" | "synced" | "offline" | "error" | "conflict";

export type ContentBase = Pick<NoteContentFields, "title" | "content">;

/** Sync after this long without typing (D32). */
const IDLE_DELAY_MS = 30_000;
/** While typing keeps going, sync at least this often (D32). */
const MAX_WAIT_MS = 5 * 60_000;
const RETRY_DELAY_MS = 30_000;

/**
 * Auto Save for one note (D12, D32). Every change is written to a local Dexie
 * draft at once; Firestore is updated after 30 s without typing, at most 5 min
 * after the first unsynced change, or right away on Ctrl/⌘+S, tab hide, note
 * close and reconnect. Nothing is sent while offline. Each sync checks that the
 * note in Firestore is still the version this edit started from; if another
 * device changed it, syncing stops until the user chooses a version.
 * The draft is deleted only after Firestore confirms the latest change.
 */
export function useAutoSave(
  uid: string,
  noteId: string,
  initialBase: ContentBase,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState<NoteContentFields | null>(null);
  const [startBase] = useState(initialBase);

  const saver = useMemo(() => {
    let pending: NoteContentFields | null = null;
    /** Last title/content known to be in Firestore. */
    let base: ContentBase = startBase;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saving = false;
    let blocked = false;
    let revision = 0;
    let firstPendingAt: number | null = null;

    const schedule = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), delay);
    };

    function scheduleSync() {
      if (!pending || blocked) return;
      const now = Date.now();
      firstPendingAt ??= now;
      const untilMax = firstPendingAt + MAX_WAIT_MS - now;
      schedule(Math.max(0, Math.min(IDLE_DELAY_MS, untilMax)));
    }

    function writeDraft(fields: NoteContentFields) {
      putDraft({
        noteId,
        uid,
        ...fields,
        baseTitle: base.title,
        baseContent: base.content,
        updatedAt: Date.now(),
      }).catch((error) => console.error("Saving local draft failed", error));
    }

    async function flush(overwrite = false) {
      clearTimeout(timer);
      if (!pending || saving || (blocked && !overwrite)) return;
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }
      const fields = pending;
      const savedRevision = revision;
      pending = null;
      firstPendingAt = null;
      saving = true;
      setStatus("syncing");
      try {
        await saveNoteContent(uid, noteId, fields, overwrite ? null : base);
        base = fields;
        saving = false;
        if (savedRevision === revision) {
          await deleteDraft(noteId);
          setStatus("synced");
        } else if (pending) {
          writeDraft(pending);
          setStatus("local");
          scheduleSync();
        }
      } catch (error) {
        saving = false;
        pending ??= fields;
        if (error instanceof NoteConflictError) {
          blocked = true;
          setConflict(error.remote);
          setStatus("conflict");
          return;
        }
        console.error("Auto save failed", error);
        if (!navigator.onLine) {
          setStatus("offline");
          return;
        }
        setStatus("error");
        schedule(RETRY_DELAY_MS);
      }
    }

    function change(fields: NoteContentFields) {
      revision += 1;
      pending = fields;
      writeDraft(fields);
      if (blocked) return;
      setStatus(navigator.onLine ? "local" : "offline");
      scheduleSync();
    }

    /** Ctrl/⌘+S: sync now; with nothing pending, confirm "Synced". */
    function saveNow() {
      if (blocked) return;
      if (!pending && !saving) setStatus((s) => (s === "idle" ? "synced" : s));
      void flush();
    }

    /** Conflict: overwrite the other version with this one. */
    function keepMine() {
      blocked = false;
      setConflict(null);
      void flush(true);
    }

    /** Conflict: take the other version and drop the unsynced edits here. */
    function takeTheirs(remote: NoteContentFields) {
      blocked = false;
      pending = null;
      firstPendingAt = null;
      base = remote;
      revision += 1;
      clearTimeout(timer);
      setConflict(null);
      setStatus("synced");
      deleteDraft(noteId).catch((error) =>
        console.error("Deleting local draft failed", error),
      );
    }

    function wentOffline() {
      if (pending && !blocked) setStatus("offline");
    }

    return { change, flush, saveNow, keepMine, takeTheirs, wentOffline };
  }, [uid, noteId, startBase]);

  useEffect(() => {
    const flushNow = () => void saver.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("online", flushNow);
    window.addEventListener("offline", saver.wentOffline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", flushNow);
      window.removeEventListener("offline", saver.wentOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      flushNow();
    };
  }, [saver]);

  return {
    status,
    conflict,
    change: saver.change,
    saveNow: saver.saveNow,
    keepMine: saver.keepMine,
    takeTheirs: saver.takeTheirs,
  };
}
