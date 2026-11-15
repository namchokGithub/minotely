import { useEffect, useState, type ReactNode } from "react";
import { Spinner } from "@/components/spinner";
import { Link } from "react-router";
import { ChevronLeft, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { AppContextMenu } from "@/components/app-context-menu";
import { contextKit, dropdownKit, type MenuKit } from "@/components/menu-kit";
import { Button } from "@/components/ui/button";
import { PanelRail } from "@/components/panel-rail";
import { cn } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUid } from "@/features/auth/auth-context";
import { useUiStore } from "@/stores/ui-store";
import { useBooks } from "@/features/books/api";
import { BookGlyph } from "@/features/books/book-glyph";
import type { Book } from "@/features/books/types";
import {
  deleteNoteForever,
  emptyTrash,
  restoreBranch,
  useAllNotes,
  useTrashNotes,
} from "@/features/notes/api";
import { deleteVersionsExcept } from "@/lib/db";
import { descendantsOf, pathOf } from "@/features/notes/tree";
import type { Note } from "@/features/notes/types";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function logError(action: string) {
  return (error: unknown) => console.error(`${action} failed`, error);
}

export function TrashPanel() {
  const uid = useUid();
  const notes = useTrashNotes();
  const { data: liveNotes } = useAllNotes();
  const { data: books } = useBooks();
  const [emptyOpen, setEmptyOpen] = useState(false);
  const collapsed = !useUiStore((state) => state.notesPanelOpen);
  const toggleCollapsed = useUiStore((state) => state.toggleNotesPanel);
  const sorted = [...(notes.data ?? [])].sort(
    (a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0),
  );

  // Local versions of notes deleted forever on another device (D42). Here both
  // lists are loaded, so every existing note is known. Skipped offline or with
  // no notes at all, when the lists may be an incomplete cache.
  const trashNotes = notes.data;
  useEffect(() => {
    if (!liveNotes || !trashNotes || !navigator.onLine) return;
    const existing = new Set(
      [...liveNotes, ...trashNotes].map((note) => note.id),
    );
    if (existing.size === 0) return;
    deleteVersionsExcept(uid, existing).catch(logError("Version cleanup"));
  }, [uid, liveNotes, trashNotes]);

  return (
    <>
      {collapsed && (
        <PanelRail
          label="Expand Trash"
          controls="notes-column"
          onExpand={toggleCollapsed}
        >
          <Trash2 />
        </PanelRail>
      )}
      {/* Collapsed (D44): the rail above replaces the panel on 768px and up; phones keep the panel. */}
      <div className={cn("flex h-full flex-col", collapsed && "md:hidden")}>
        <header className="flex h-14 items-center gap-1 px-2">
          <Button variant="ghost" size="icon-sm" asChild className="md:hidden">
            <Link to="/" aria-label="Back to books">
              <ChevronLeft />
            </Link>
          </Button>
          <h2 className="min-w-0 flex-1 font-semibold">
            {/* The title collapses the column on 768px and up; on phones it is plain text. */}
            <button
              type="button"
              title="Collapse Trash"
              aria-expanded={true}
              aria-controls="notes-column"
              className="pointer-events-none flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:pointer-events-auto"
              onClick={toggleCollapsed}
            >
              <Trash2 className="size-4" />
              <span className="truncate">Trash</span>
            </button>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={sorted.length === 0}
            onClick={() => setEmptyOpen(true)}
          >
            Empty
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {notes.isPending ? (
            <PanelMessage>
              <Spinner />
            </PanelMessage>
          ) : notes.isError ? (
            <PanelMessage>Could not load Trash.</PanelMessage>
          ) : sorted.length === 0 ? (
            <PanelMessage>Trash is empty.</PanelMessage>
          ) : (
            <ul className="grid gap-0.5">
              {sorted.map((note) => (
                <TrashItem
                  key={note.id}
                  note={note}
                  books={books ?? []}
                  trashNotes={notes.data ?? []}
                  liveNotes={liveNotes ?? []}
                />
              ))}
            </ul>
          )}
        </div>

        <AlertDialog open={emptyOpen} onOpenChange={setEmptyOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
              <AlertDialogDescription>
                {sorted.length} note(s) will be deleted forever. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  emptyTrash(
                    uid,
                    sorted.map((n) => n.id),
                  ).catch(logError("Empty trash"))
                }
              >
                Delete forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function TrashItem({
  note,
  books,
  trashNotes,
  liveNotes,
}: {
  note: Note;
  books: Book[];
  /** Everything in Trash, for restoring a branch together (D49). */
  trashNotes: Note[];
  /** Live notes, so a trashed sub-page can show the path it had. */
  liveNotes: Note[];
}) {
  const uid = useUid();
  const sameDelete = trashNotes.filter(
    (n) => n.deletedAt?.getTime() === note.deletedAt?.getTime(),
  );
  const subPages = descendantsOf(note.id, sameDelete).length;
  const path = pathOf(note.id, [...liveNotes, ...trashNotes]);
  const restoreLabel = subPages > 0 ? ` with ${subPages} sub-page(s)` : "";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const book = books.find((b) => b.id === note.bookId);
  const title = note.title.trim() || "Untitled";

  // Same items in the ⋯ menu and the right-click menu (D26).
  const menuItems = (k: MenuKit) => (
    <>
      {book && (
        <k.Item
          onSelect={() =>
            restoreBranch(uid, note, trashNotes).catch(logError("Restore note"))
          }
        >
          <RotateCcw /> Restore{restoreLabel}
        </k.Item>
      )}
      <k.Sub>
        <k.SubTrigger disabled={books.length === 0}>
          <RotateCcw /> Restore{restoreLabel} to
        </k.SubTrigger>
        <k.SubContent className="max-h-72 overflow-y-auto">
          {books.map((b) => (
            <k.Item
              key={b.id}
              onSelect={() =>
                restoreBranch(uid, note, trashNotes, b.id).catch(
                  logError("Restore note"),
                )
              }
            >
              <BookGlyph icon={b.icon} color={b.color} />
              <span className="truncate">{b.name}</span>
            </k.Item>
          ))}
        </k.SubContent>
      </k.Sub>
      <k.Separator />
      <k.Item variant="destructive" onSelect={() => setDeleteOpen(true)}>
        <Trash2 /> Delete forever
      </k.Item>
    </>
  );

  return (
    <AppContextMenu label={`Actions for ${title}`} menu={menuItems(contextKit)}>
      <li className="group relative">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-0.5 rounded-md px-3 py-2 pr-9 transition-colors duration-150 hover:bg-muted">
          <span className="truncate text-sm font-medium">
            {note.icon && <span aria-hidden="true">{note.icon} </span>}
            {title}
          </span>
          {path.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">
              {path.map((n) => n.title.trim() || "Untitled").join(" / ")}
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {book ? (
              <>
                <BookGlyph
                  icon={book.icon}
                  color={book.color}
                  className="size-3"
                />
                <span className="truncate">{book.name}</span>
              </>
            ) : (
              <span>Book deleted</span>
            )}
            {note.deletedAt && (
              <span>· {dateFormat.format(note.deletedAt)}</span>
            )}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${title}`}
              className="absolute top-2 right-1.5"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            {menuItems(dropdownKit)}
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{title}” forever?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  deleteNoteForever(uid, note.id).catch(logError("Delete note"))
                }
              >
                Delete forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </li>
    </AppContextMenu>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
