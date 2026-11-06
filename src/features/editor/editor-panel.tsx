import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Spinner } from "@/components/spinner";
import { Link } from "react-router";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  CloudOff,
  Code2,
  FileText,
  HardDrive,
  Loader2,
  Lock,
  LockOpen,
  Pin,
  PinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getDraft, type NoteDraft } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useUid } from "@/features/auth/auth-context";
import { useSettings } from "@/features/settings/api";
import { setNoteLocked, setNotePinned, useNotes } from "@/features/notes/api";
import type { Note, NoteContentFields } from "@/features/notes/types";
import { AppearanceMenu } from "./appearance-menu";
import { copySelectionAsMarkdown } from "./copy-markdown";
import { AppContextMenu } from "@/components/app-context-menu";
import { isSaveShortcut } from "@/lib/shortcuts";
import { EditorContextItems } from "./editor-context-menu";
import { EditorToolbar } from "./editor-toolbar";
import { LinkBubble } from "./link-bubble";
import { TagEditor } from "./tag-editor";
import { editorExtensions, parseContent } from "./extensions";
import { useAutoSave, type SaveStatus } from "./use-auto-save";
import {
  contentToMarkdown,
  markdownToContent,
  plainTextOf,
} from "@/features/data/markdown";

type EditorPanelProps = {
  bookId: string | undefined;
  noteId: string | undefined;
};

export function EditorPanel({ bookId, noteId }: EditorPanelProps) {
  const notes = useNotes(bookId);
  const note = notes.data?.find((n) => n.id === noteId);

  let body: ReactNode;
  if (!noteId) body = <PanelMessage>Select a note.</PanelMessage>;
  else if (notes.isPending) body = <LoadingMessage />;
  else if (!note) body = <PanelMessage>Note not found.</PanelMessage>;
  else body = <DraftLoader key={note.id} note={note} />;

  return (
    <div className="flex h-full flex-col">
      {bookId && (
        <div className="flex h-14 shrink-0 items-center gap-1 px-2 md:hidden">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/books/${bookId}`} aria-label="Back to notes">
              <ChevronLeft />
            </Link>
          </Button>
          {note && (
            <h2 className="min-w-0 flex-1 truncate px-1 font-semibold">
              {note.title.trim() || "Untitled"}
            </h2>
          )}
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

  if (draft === undefined) return <LoadingMessage />;
  return <NoteEditor note={note} draft={draft} />;
}

function NoteEditor({ note, draft }: { note: Note; draft: NoteDraft | null }) {
  const uid = useUid();
  const { status, conflict, change, saveNow, keepMine, takeTheirs } =
    useAutoSave(uid, note.id, {
      title: draft?.baseTitle ?? note.title,
      content: draft?.baseContent ?? note.content,
    });
  const initial = draft ?? note;
  const latest = useRef<NoteContentFields>({
    title: initial.title,
    content: initial.content,
    plainText: initial.plainText,
  });
  const [title, setTitle] = useState(initial.title);
  const [mode, setMode] = useState<"wysiwyg" | "markdown">("wysiwyg");
  const [rawMarkdown, setRawMarkdown] = useState("");
  const rawTextarea = useRef<HTMLTextAreaElement>(null);
  const settings = useSettings();

  const editor = useEditor({
    extensions: editorExtensions,
    content: parseContent(initial.content),
    editable: !note.isLocked,
    editorProps: {
      attributes: {
        class: "minotely-editor",
        "aria-label": "Note content",
      },
      handleDOMEvents: {
        copy: copySelectionAsMarkdown,
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

  // Lock is read-only editing (M5.6). `false`: toggling it is not a content change to save.
  useEffect(() => {
    editor.setEditable(!note.isLocked, false);
  }, [editor, note.isLocked]);

  useEffect(() => {
    if (mode === "markdown") rawTextarea.current?.focus();
  }, [mode]);

  useLayoutEffect(() => {
    if (mode !== "markdown") return;
    const textarea = rawTextarea.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    resize();
    const container = textarea.parentElement;
    if (!container) return;
    let width = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container.clientWidth === width) return;
      width = container.clientWidth;
      resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [mode, rawMarkdown]);

  const logError = (action: string) => (error: unknown) =>
    console.error(`${action} failed`, error);

  // Ctrl/⌘+S saves this note now instead of the browser's "Save page" (M5.9).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event)) return;
      event.preventDefault();
      saveNow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveNow]);

  // A draft that survived a failed save or a closed tab: sync it now (checks for a newer version, D32).
  useEffect(() => {
    if (!draft) return;
    change(latest.current);
    saveNow();
  }, [draft, change, saveNow]);

  const applyOtherVersion = (remote: NoteContentFields) => {
    takeTheirs(remote);
    latest.current = remote;
    setTitle(remote.title);
    editor.commands.setContent(parseContent(remote.content), {
      emitUpdate: false,
    });
    if (mode === "markdown") {
      setRawMarkdown(contentToMarkdown(parseContent(remote.content)));
    }
  };

  const toggleMode = () => {
    if (mode === "wysiwyg") {
      setRawMarkdown(contentToMarkdown(editor.getJSON()));
      setMode("markdown");
      return;
    }
    // When Raw was only viewed, latest still holds the original JSON, including
    // formatting that Markdown cannot represent.
    editor.commands.setContent(parseContent(latest.current.content), {
      emitUpdate: false,
    });
    setMode("wysiwyg");
  };

  const editMarkdown = (markdown: string) => {
    setRawMarkdown(markdown);
    const content = markdownToContent(markdown);
    latest.current = {
      ...latest.current,
      content: JSON.stringify(content),
      plainText: plainTextOf(content),
    };
    change(latest.current);
  };

  return (
    <div className="flex min-h-0 flex-1 animate-in flex-col duration-200 fade-in-0">
      <div className="flex shrink-0 items-center gap-2 border-b px-2 py-1.5 sm:px-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          {mode === "wysiwyg" && (
            <EditorToolbar editor={editor} disabled={note.isLocked} />
          )}
        </div>
        <Button
          variant={mode === "markdown" ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 gap-1.5"
          aria-pressed={mode === "markdown"}
          aria-label={
            mode === "markdown" ? "Switch to rich text" : "Edit raw Markdown"
          }
          onClick={toggleMode}
        >
          {mode === "markdown" ? <FileText /> : <Code2 />}
          <span className="hidden sm:inline">
            {mode === "markdown" ? "Rich text" : "Markdown"}
          </span>
        </Button>
        <SaveIndicator status={status} />
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-pressed={note.isPinned}
          aria-label={note.isPinned ? "Unpin note" : "Pin note"}
          title={note.isPinned ? "Unpin note" : "Pin note"}
          onClick={() =>
            setNotePinned(uid, note.id, !note.isPinned).catch(logError("Pin"))
          }
        >
          {note.isPinned ? <PinOff /> : <Pin />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "shrink-0",
            note.isLocked && "bg-muted text-foreground",
          )}
          aria-pressed={note.isLocked}
          aria-label={note.isLocked ? "Unlock note" : "Lock note"}
          title={note.isLocked ? "Unlock note" : "Lock note (read-only)"}
          onClick={() =>
            setNoteLocked(uid, note.id, !note.isLocked).catch(logError("Lock"))
          }
        >
          {note.isLocked ? <Lock /> : <LockOpen />}
        </Button>
        <AppearanceMenu note={note} />
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          `paper-${note.paperStyle}`,
          `editor-font-${settings.fontFamily}`,
          `editor-size-${settings.fontSize}`,
        )}
      >
        <div
          className={cn(
            "mx-auto w-full max-w-3xl px-4 pt-6 pb-[50dvh] sm:px-6 sm:pt-8",
            // Lined paper: red margin line left of the text, full height (D13).
            note.paperStyle === "lined" &&
              "relative min-h-full pl-14 before:absolute before:inset-y-0 before:left-9 before:w-0.5 before:bg-red-500/75 sm:pl-20 sm:before:left-12 dark:before:bg-red-400/60",
          )}
        >
          <input
            value={title}
            placeholder="Untitled"
            aria-label="Note title"
            maxLength={200}
            readOnly={note.isLocked}
            className="mb-2 w-full bg-transparent text-2xl font-semibold sm:text-3xl tracking-tight outline-none placeholder:text-muted-foreground/60"
            onChange={(event) => {
              setTitle(event.target.value);
              latest.current = { ...latest.current, title: event.target.value };
              change(latest.current);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (mode === "markdown") rawTextarea.current?.focus();
                else editor.commands.focus("start");
              }
            }}
          />
          <TagEditor note={note} readOnly={note.isLocked} />
          {mode === "markdown" ? (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Editing Markdown may remove text colors and custom highlights.
              </p>
              <textarea
                ref={rawTextarea}
                value={rawMarkdown}
                onChange={(event) => editMarkdown(event.target.value)}
                readOnly={note.isLocked}
                aria-label="Raw Markdown content"
                spellCheck={false}
                className="min-h-[50vh] w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-sm leading-6 shadow-none outline-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                placeholder="Write Markdown…"
              />
            </>
          ) : (
            <>
              <AppContextMenu
                label="Editor actions"
                menu={<EditorContextItems editor={editor} />}
              >
                <div>
                  <EditorContent editor={editor} />
                </div>
              </AppContextMenu>
              <LinkBubble editor={editor} />
            </>
          )}
        </div>
      </div>

      {/* Must choose: Esc and outside clicks do not close it (D32). */}
      <AlertDialog open={conflict !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              This note changed on another device
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your edits here are saved on this device but not synced. Keep
              yours to replace the other version, or use the other version and
              discard your unsynced edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => conflict && applyOtherVersion(conflict)}
            >
              Use other version
            </AlertDialogCancel>
            <AlertDialogAction onClick={keepMine}>Keep mine</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const STATUS_VIEW: Record<
  SaveStatus,
  { icon: ReactNode; label: string } | null
> = {
  idle: null,
  local: {
    icon: <HardDrive className="size-3.5" />,
    label: "Saved on this device",
  },
  syncing: {
    icon: <Loader2 className="size-3.5 animate-spin" />,
    label: "Syncing…",
  },
  synced: { icon: <Check className="size-3.5" />, label: "Synced" },
  offline: {
    icon: <CloudOff className="size-3.5" />,
    label: "Offline — saved on this device",
  },
  error: {
    icon: <AlertCircle className="size-3.5 text-destructive" />,
    label: "Not synced — retrying",
  },
  conflict: {
    icon: <AlertCircle className="size-3.5 text-destructive" />,
    label: "Changed elsewhere",
  },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const view = STATUS_VIEW[status];
  return (
    <span
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
    >
      {view?.icon}
      {view && <span className="hidden sm:inline">{view.label}</span>}
    </span>
  );
}

function LoadingMessage() {
  return (
    <PanelMessage>
      <Spinner />
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
