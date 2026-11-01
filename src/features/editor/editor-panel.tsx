import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { EditorContent, useEditor } from "@tiptap/react";
import { AlertCircle, Check, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDraft, type NoteDraft } from "@/lib/db";
import { useUid } from "@/features/auth/auth-context";
import { useNotes } from "@/features/notes/api";
import type { Note, NoteContentFields } from "@/features/notes/types";
import { EditorToolbar } from "./editor-toolbar";
import { editorExtensions, parseContent } from "./extensions";
import { useAutoSave, type SaveStatus } from "./use-auto-save";

type EditorPanelProps = {
  bookId: string | undefined;
  noteId: string | undefined;
};

export function EditorPanel({ bookId, noteId }: EditorPanelProps) {
  const notes = useNotes(bookId);
  const note = notes.data?.find((n) => n.id === noteId);

  let body: ReactNode;
  if (!noteId) body = <PanelMessage>Select a note.</PanelMessage>;
  else if (notes.isPending) body = <Spinner />;
  else if (!note) body = <PanelMessage>Note not found.</PanelMessage>;
  else body = <DraftLoader key={note.id} note={note} />;

  return (
    <div className="flex h-full flex-col">
      {bookId && (
        <div className="flex h-14 shrink-0 items-center px-2 md:hidden">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/books/${bookId}`} aria-label="Back to notes">
              <ChevronLeft />
            </Link>
          </Button>
        </div>
      )}
      {body}
    </div>
  );
}

/** Loads an unsaved local draft (if any) before the editor mounts. */
function DraftLoader({ note }: { note: Note }) {
  const uid = useUid();
  const [draft, setDraft] = useState<NoteDraft | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getDraft(note.id)
      .then((found) => {
        if (active) setDraft(found && found.uid === uid ? found : null);
      })
      .catch(() => {
        if (active) setDraft(null);
      });
    return () => {
      active = false;
    };
  }, [note.id, uid]);

  if (draft === undefined) return <Spinner />;
  return <NoteEditor note={note} draft={draft} />;
}

function NoteEditor({ note, draft }: { note: Note; draft: NoteDraft | null }) {
  const uid = useUid();
  const { status, change } = useAutoSave(uid, note.id);
  const initial = draft ?? note;
  const latest = useRef<NoteContentFields>({
    title: initial.title,
    content: initial.content,
    plainText: initial.plainText,
  });
  const [title, setTitle] = useState(initial.title);

  const editor = useEditor({
    extensions: editorExtensions,
    content: parseContent(initial.content),
    editorProps: {
      attributes: {
        class: "minotely-editor",
        "aria-label": "Note content",
      },
    },
    onUpdate: ({ editor: e }) => {
      latest.current = {
        ...latest.current,
        content: JSON.stringify(e.getJSON()),
        plainText: e.getText({ blockSeparator: "\n" }),
      };
      change(latest.current);
    },
  });

  // A draft that survived a failed save or a closed tab: push it to Firestore.
  useEffect(() => {
    if (draft) change(latest.current);
  }, [draft, change]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
        <EditorToolbar editor={editor} />
        <SaveIndicator status={status} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <input
            value={title}
            placeholder="Untitled"
            aria-label="Note title"
            maxLength={200}
            className="mb-4 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
            onChange={(event) => {
              setTitle(event.target.value);
              latest.current = { ...latest.current, title: event.target.value };
              change(latest.current);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                editor.commands.focus("start");
              }
            }}
          />
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

const STATUS_VIEW: Record<
  SaveStatus,
  { icon: ReactNode; label: string } | null
> = {
  idle: null,
  saving: {
    icon: <Loader2 className="size-3.5 animate-spin" />,
    label: "Saving…",
  },
  saved: { icon: <Check className="size-3.5" />, label: "Saved" },
  error: {
    icon: <AlertCircle className="size-3.5 text-destructive" />,
    label: "Not saved — retrying",
  },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const view = STATUS_VIEW[status];
  return (
    <span
      role="status"
      aria-live="polite"
      className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
    >
      {view?.icon}
      {view && <span className="hidden sm:inline">{view.label}</span>}
    </span>
  );
}

function Spinner() {
  return (
    <PanelMessage>
      <Loader2 className="size-4 animate-spin" aria-label="Loading" />
    </PanelMessage>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
