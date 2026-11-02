import { useEffect, useMemo, useState } from "react";
import { deleteDraft, putDraft } from "@/lib/db";
import { saveNoteContent } from "@/features/notes/api";
import type { NoteContentFields } from "@/features/notes/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 5000;

/**
 * Debounced Firestore save for one note. Every change is first written to a
 * local Dexie draft; the draft is deleted only after Firestore confirms a
 * write that includes the latest change. Failed writes retry and keep the draft.
 */
export function useAutoSave(uid: string, noteId: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const saver = useMemo(() => {
    let pending: NoteContentFields | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saving = false;
    let revision = 0;

    const schedule = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), delay);
    };

    async function flush() {
      clearTimeout(timer);
      if (!pending || saving) return;
      const fields = pending;
      const savedRevision = revision;
      pending = null;
      saving = true;
      setStatus("saving");
      try {
        await saveNoteContent(uid, noteId, fields);
        saving = false;
        if (savedRevision === revision) {
          await deleteDraft(noteId);
          setStatus("saved");
        } else if (pending) {
          schedule(SAVE_DELAY_MS);
        }
      } catch (error) {
        console.error("Auto save failed", error);
        saving = false;
        pending ??= fields;
        setStatus("error");
        schedule(RETRY_DELAY_MS);
      }
    }

    function change(fields: NoteContentFields) {
      revision += 1;
      pending = fields;
      setStatus("saving");
      putDraft({ noteId, uid, ...fields, updatedAt: Date.now() }).catch(
        (error) => console.error("Saving local draft failed", error),
      );
      schedule(SAVE_DELAY_MS);
    }

    /** Ctrl/⌘+S: write now; with nothing pending, confirm "Saved". */
    function saveNow() {
      if (!pending && !saving) setStatus((s) => (s === "idle" ? "saved" : s));
      void flush();
    }

    return { change, flush, saveNow };
  }, [uid, noteId]);

  useEffect(() => {
    const flushNow = () => void saver.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("online", flushNow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", flushNow);
      document.removeEventListener("visibilitychange", onVisibility);
      flushNow();
    };
  }, [saver]);

  return { status, change: saver.change, saveNow: saver.saveNow };
}
