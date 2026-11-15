import { useCallback, useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/spinner";
import { listVersions, type NoteVersion } from "@/lib/db";
import { cn } from "@/lib/utils";
import { editorExtensions, parseContent } from "@/features/editor/extensions";
import type { SyncResult } from "@/features/editor/use-auto-save";
import { saveVersion } from "./api";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const SYNC_FAILURE: Record<
  Extract<SyncResult, { ok: false }>["reason"],
  string
> = {
  offline: "You are offline. Version not saved.",
  conflict: "This note changed on another device. Version not saved.",
  error: "Sync failed. Version not saved.",
};

type VersionHistoryProps = {
  uid: string;
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Syncs pending edits and returns the content now in Firestore. */
  syncNow: () => Promise<SyncResult>;
};

/** Local version history of one note (D42): list, read-only preview, Save version. */
export function VersionHistory({
  uid,
  noteId,
  open,
  onOpenChange,
  syncNow,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<NoteVersion[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const selected = versions?.find((v) => v.id === selectedId) ?? null;

  const load = useCallback(
    () =>
      listVersions(uid, noteId)
        .then(setVersions)
        .catch((error: unknown) => {
          console.error("Loading versions failed", error);
          setVersions([]);
        }),
    [uid, noteId],
  );

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const saveManual = async () => {
    setSaving(true);
    try {
      const synced = await syncNow();
      if (!synced.ok) {
        toast.error(SYNC_FAILURE[synced.reason]);
        return;
      }
      const result = await saveVersion(uid, noteId, synced.content, "manual");
      if (result === "created") toast.success("Version saved");
      else if (result === "empty") toast.info("The note is empty");
      else toast.info("This version is already saved");
      await load();
    } catch (error) {
      console.error("Saving version failed", error);
      toast.error("Could not save the version");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85dvh] flex-col gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Kept on this device only. Open a version to read or copy from it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-3">
          <div
            className={cn(
              "flex min-h-0 w-full flex-col gap-2 sm:w-60 sm:shrink-0",
              selected && "hidden sm:flex",
            )}
          >
            <Button
              size="sm"
              disabled={saving}
              onClick={() => void saveManual()}
            >
              <Save />
              Save version
            </Button>
            {versions === null ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : versions.length === 0 ? (
              <p className="px-1 py-4 text-center text-muted-foreground">
                No versions yet.
              </p>
            ) : (
              <ul className="grid min-h-0 gap-0.5 overflow-y-auto">
                {versions.map((version) => (
                  <li key={version.id}>
                    <button
                      type="button"
                      aria-current={version.id === selectedId}
                      className={cn(
                        "w-full rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted",
                        version.id === selectedId && "bg-muted",
                      )}
                      onClick={() => setSelectedId(version.id)}
                    >
                      <span className="block">
                        {timeFormat.format(version.createdAt)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {version.kind === "manual" ? "Manual" : "Auto"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 flex-col sm:flex sm:border-l sm:pl-3",
              selected ? "flex" : "hidden",
            )}
          >
            {selected ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-1 self-start sm:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  <ChevronLeft />
                  Versions
                </Button>
                <VersionPreview key={selected.id} version={selected} />
              </>
            ) : (
              <p className="m-auto text-muted-foreground">Select a version.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Read-only copy of one version; the open note is not changed. */
function VersionPreview({ version }: { version: NoteVersion }) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: parseContent(version.content),
    editable: false,
    editorProps: {
      attributes: {
        class: "minotely-editor",
        "aria-label": "Version content (read-only)",
      },
    },
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <h3 className="mb-2 text-xl font-semibold tracking-tight">
        {version.title.trim() || "Untitled"}
      </h3>
      <EditorContent editor={editor} />
    </div>
  );
}
