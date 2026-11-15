import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Spinner } from "@/components/spinner";
import { Link } from "react-router";
import { EditorContent, useEditor } from "@tiptap/react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  CloudOff,
  Code2,
  FileText,
  HardDrive,
  History,
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
import { AppearanceItems, AppearanceMenu } from "./appearance-menu";
import { BackgroundDialog } from "./background-dialog";
import { copySelectionAsMarkdown } from "./copy-markdown";
import { parsePastedMarkdown } from "./paste-markdown";
import { pageBackgroundStyle, usePageBackground } from "./page-background";
import { PAGE_WIDTHS } from "./page-width";
import { useUiStore } from "@/stores/ui-store";
import { copySelectionAsText } from "./copy-text";
import { AppContextMenu } from "@/components/app-context-menu";
import { contextKit } from "@/components/menu-kit";
import { isPlainTextCopyShortcut, isSaveShortcut } from "@/lib/shortcuts";
import { EditorContextItems } from "./editor-context-menu";
import { EditorToolbar } from "./editor-toolbar";
import {
  NoteSpellcheck,
  getSpellcheckEnabled,
  saveSpellcheckEnabled,
  startNoteSpellcheck,
  type NoteSpellcheckController,
  type SpellingTarget,
} from "./spellcheck";
import { LinkBubble } from "./link-bubble";
import { NoteIconPicker } from "./note-icon-picker";
import { PageBreadcrumb, SubPages } from "./page-trail";
import { DocumentOutline } from "./document-outline";
import { BlockControls } from "./block-controls";
import { FloatingToolbar } from "./floating-toolbar";
import { SlashCommand, SlashMenuStore } from "./slash-command";
import { SlashMenu } from "./slash-menu";
import { TagEditor } from "./tag-editor";
import { editorExtensions, parseContent } from "./extensions";
import { useAutoSave, type SaveStatus } from "./use-auto-save";
import { VersionHistory } from "@/features/versions/version-history";
import {
  contentToMarkdown,
  markdownToContent,
  plainTextOf,
} from "@/features/data/markdown";

type EditorPanelProps = {
  bookId: string | undefined;
  noteId: string | undefined;
};

const spellingExtensions = [...editorExtensions, NoteSpellcheck];

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
              {note.icon && <span aria-hidden="true">{note.icon} </span>}
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
  // Sub-pages (D49): breadcrumb and list come from the book's live notes.
  const { data: bookNotes = [] } = useNotes(note.bookId);
  const { status, conflict, change, saveNow, syncNow, keepMine, takeTheirs } =
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
  const [spellcheck, setSpellcheck] = useState<NoteSpellcheckController | null>(
    null,
  );
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(() =>
    getSpellcheckEnabled(uid),
  );
  const [spellingTarget, setSpellingTarget] = useState<SpellingTarget | null>(
    null,
  );
  const rawTextarea = useRef<HTMLTextAreaElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const settings = useSettings();
  const backgroundStyle = pageBackgroundStyle(usePageBackground(uid));
  const pageMaxWidth =
    PAGE_WIDTHS[useUiStore((state) => state.pageWidth)].maxWidth;
  const codeTheme = useUiStore((state) => state.codeTheme);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  // "Background…" in either appearance menu: the dialog opens only after that
  // menu has closed and released focus, so the menu cannot close it again (D43).
  const backgroundRequested = useRef(false);
  const requestBackground = () => {
    backgroundRequested.current = true;
  };
  const openRequestedBackground = (event: Event) => {
    if (!backgroundRequested.current) return;
    backgroundRequested.current = false;
    event.preventDefault();
    setBackgroundOpen(true);
  };

  // One `/` menu store per editor (D48); the extension list is read once, on creation.
  const [slashStore] = useState(() => new SlashMenuStore());
  const [pageColumn, setPageColumn] = useState<HTMLDivElement | null>(null);
  const editor = useEditor({
    extensions: [
      ...spellingExtensions,
      SlashCommand.configure({ store: slashStore }),
    ],
    content: parseContent(initial.content),
    editable: !note.isLocked,
    editorProps: {
      attributes: {
        class: "minotely-editor",
        "aria-label": "Note content",
        spellcheck: "false",
        lang: "en-US",
      },
      handleDOMEvents: {
        copy: copySelectionAsMarkdown,
      },
      clipboardTextParser: parsePastedMarkdown,
      handleKeyDown: (view, event) => {
        if (!isPlainTextCopyShortcut(event) || view.state.selection.empty)
          return false;
        event.preventDefault();
        void copySelectionAsText(view);
        return true;
      },
    },
    onUpdate: ({ editor: e, transaction }) => {
      latest.current = {
        ...latest.current,
        content: JSON.stringify(e.getJSON()),
        plainText: e.getText({ blockSeparator: "\n" }),
      };
      // Block ids added when a note opens (D48) are not an edit: they are saved
      // with the next real change, or at once by "Copy link to block".
      if (transaction.getMeta("addToHistory") === false) return;
      change(latest.current);
    },
  });

  useEffect(() => {
    let active = true;
    let controller: NoteSpellcheckController | null = null;
    startNoteSpellcheck(editor, uid)
      .then((loaded) => {
        if (!active) loaded?.destroy();
        else {
          controller = loaded;
          setSpellcheck(loaded);
        }
      })
      .catch((error: unknown) => {
        console.error("Spellcheck failed to load", error);
        if (active) toast.error("Spellcheck could not load");
      });
    return () => {
      active = false;
      controller?.destroy();
    };
  }, [editor, uid]);

  useEffect(() => {
    spellcheck?.setEnabled(spellcheckEnabled);
  }, [spellcheck, spellcheckEnabled]);

  const toggleSpellcheck = () => {
    const next = !spellcheckEnabled;
    if (!saveSpellcheckEnabled(uid, next)) {
      toast.error("Could not save spell check setting");
      return;
    }
    setSpellcheckEnabled(next);
    spellcheck?.setEnabled(next);
    if (!next) setSpellingTarget(null);
  };

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

  // "Copy link to block" (D48): save now so the block ids reach Firestore.
  const persistNow = () => {
    change(latest.current);
    saveNow();
  };

  // A link to a block (`#block-<id>`, D48): scroll to it and flash it once.
  useEffect(() => {
    const id = window.location.hash.match(/^#block-([\w-]+)$/)?.[1];
    if (!id) return;
    const target = editor.view.dom.querySelector(
      `[data-id="${CSS.escape(id)}"]`,
    );
    if (!(target instanceof HTMLElement)) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
    target.classList.add("block-flash");
    const timer = setTimeout(
      () => target.classList.remove("block-flash"),
      1600,
    );
    return () => clearTimeout(timer);
  }, [editor]);

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
        <SaveIndicator status={status} />
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
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label="Version history"
          title="Version history"
          onClick={() => setHistoryOpen(true)}
        >
          <History />
        </Button>
        <AppearanceMenu
          note={note}
          onBackground={requestBackground}
          onCloseAutoFocus={openRequestedBackground}
        />
      </div>

      {/* Background around the page (D43): a fixed layer behind the scrolling page. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {backgroundStyle && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={backgroundStyle}
          />
        )}
        {/* Right-click on the background around the page: the appearance menu (D26, D43). */}
        <AppContextMenu
          label="Page appearance"
          menu={
            <AppearanceItems
              kit={contextKit}
              note={note}
              onBackground={requestBackground}
            />
          }
          onCloseAutoFocus={openRequestedBackground}
        >
          <div
            className={cn(
              "relative min-h-0 flex-1 overflow-y-auto",
              `paper-${note.paperStyle}`,
              `editor-font-${settings.fontFamily}`,
              `editor-size-${settings.fontSize}`,
              `code-theme-${codeTheme}`,
            )}
          >
            <div
              ref={setPageColumn}
              // Right-clicks and long-presses on the page itself keep the editor menu or
              // the browser's own behavior; only the background opens the appearance menu.
              onContextMenu={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                if (event.pointerType !== "mouse") event.stopPropagation();
              }}
              // Page width preset (D45); the page still shrinks to fit a narrower editor.
              style={{ "--page-max-w": pageMaxWidth } as CSSProperties}
              className={cn(
                // The page keeps the theme color over any background around it (D43).
                "relative mx-auto min-h-full w-full max-w-(--page-max-w) bg-background px-4 pt-6 pb-[50dvh] sm:px-6 sm:pt-8",
                // Lined and Margin paper: red margin line left of the text, full height (D13).
                (note.paperStyle === "lined" || note.paperStyle === "margin") &&
                  "relative min-h-full pl-14 before:absolute before:inset-y-0 before:left-9 before:w-0.5 before:bg-red-500/75 sm:pl-20 sm:before:left-12 dark:before:bg-red-400/60",
              )}
            >
              <PageBreadcrumb note={note} notes={bookNotes} />
              {/* Icon and title (D46). Lined paper sizes this row in CSS (D40). */}
              <div className="note-title-row mb-2 flex items-center gap-2">
                <NoteIconPicker
                  uid={uid}
                  noteId={note.id}
                  icon={note.icon}
                  readOnly={note.isLocked}
                />
                <input
                  value={title}
                  placeholder="Untitled"
                  aria-label="Note title"
                  maxLength={200}
                  readOnly={note.isLocked}
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold sm:text-3xl tracking-tight outline-none placeholder:text-muted-foreground/60"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    latest.current = {
                      ...latest.current,
                      title: event.target.value,
                    };
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
              </div>
              <TagEditor note={note} readOnly={note.isLocked} />
              {mode === "markdown" ? (
                <>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Editing Markdown may remove text colors and custom
                    highlights.
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
                    menu={
                      <EditorContextItems
                        editor={editor}
                        spellingTarget={spellingTarget}
                        spellcheck={spellcheck}
                        spellcheckEnabled={spellcheckEnabled}
                        onToggleSpellcheck={toggleSpellcheck}
                        onSpellingAction={() => setSpellingTarget(null)}
                      />
                    }
                  >
                    <div
                      onContextMenuCapture={(event) => {
                        if (!spellcheck || !spellcheckEnabled) {
                          setSpellingTarget(null);
                          return;
                        }
                        const position =
                          event.clientX === 0 && event.clientY === 0
                            ? editor.state.selection.from
                            : editor.view.posAtCoords({
                                left: event.clientX,
                                top: event.clientY,
                              })?.pos;
                        setSpellingTarget(
                          position == null ? null : spellcheck.at(position),
                        );
                      }}
                    >
                      <EditorContent editor={editor} />
                    </div>
                  </AppContextMenu>
                  <SubPages note={note} notes={bookNotes} />
                  <LinkBubble editor={editor} />
                  <FloatingToolbar editor={editor} />
                  <SlashMenu store={slashStore} />
                  {note.bookId && (
                    <BlockControls
                      editor={editor}
                      container={pageColumn}
                      uid={uid}
                      noteId={note.id}
                      bookId={note.bookId}
                      persist={persistNow}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </AppContextMenu>
        {/* Table of Contents (D47): over the right edge of the editor area, not inside the page. */}
        {mode === "wysiwyg" && <DocumentOutline editor={editor} />}
      </div>

      <BackgroundDialog
        uid={uid}
        open={backgroundOpen}
        onOpenChange={setBackgroundOpen}
      />

      <VersionHistory
        uid={uid}
        noteId={note.id}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        syncNow={syncNow}
      />

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
