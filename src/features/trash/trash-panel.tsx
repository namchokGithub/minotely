import { useState, type ReactNode } from "react";
import { Spinner } from "@/components/spinner";
import { Link } from "react-router";
import {
  ChevronLeft,
  MoreHorizontal,
  PanelLeft,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AppContextMenu } from "@/components/app-context-menu";
import { contextKit, dropdownKit, type MenuKit } from "@/components/menu-kit";
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
  restoreNote,
  useTrashNotes,
} from "@/features/notes/api";
import type { Note } from "@/features/notes/types";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function logError(action: string) {
  return (error: unknown) => console.error(`${action} failed`, error);
}

export function TrashPanel() {
  const uid = useUid();
  const notes = useTrashNotes();
  const { data: books } = useBooks();
  const [emptyOpen, setEmptyOpen] = useState(false);
  const toggleBooksSidebar = useUiStore((state) => state.toggleBooksSidebar);
  const booksSidebarOpen = useUiStore((state) => state.booksSidebarOpen);
  const sorted = [...(notes.data ?? [])].sort(
    (a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0),
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-1 px-2">
        <Button variant="ghost" size="icon-sm" asChild className="md:hidden">
          <Link to="/" aria-label="Back to books">
            <ChevronLeft />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle books sidebar"
          aria-expanded={booksSidebarOpen}
          aria-controls="books-sidebar"
          className="hidden md:inline-flex lg:hidden"
          onClick={toggleBooksSidebar}
        >
          <PanelLeft />
        </Button>
        <h2 className="flex flex-1 items-center gap-2 px-2 font-semibold">
          <Trash2 className="size-4" /> Trash
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
              <TrashItem key={note.id} note={note} books={books ?? []} />
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
  );
}

function TrashItem({ note, books }: { note: Note; books: Book[] }) {
  const uid = useUid();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const book = books.find((b) => b.id === note.bookId);
  const title = note.title.trim() || "Untitled";

  // Same items in the ⋯ menu and the right-click menu (D26).
  const menuItems = (k: MenuKit) => (
    <>
      {book && (
        <k.Item
          onSelect={() =>
            restoreNote(uid, note.id).catch(logError("Restore note"))
          }
        >
          <RotateCcw /> Restore
        </k.Item>
      )}
      <k.Sub>
        <k.SubTrigger disabled={books.length === 0}>
          <RotateCcw /> Restore to
        </k.SubTrigger>
        <k.SubContent className="max-h-72 overflow-y-auto">
          {books.map((b) => (
            <k.Item
              key={b.id}
              onSelect={() =>
                restoreNote(uid, note.id, b.id).catch(logError("Restore note"))
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
          <span className="truncate text-sm font-medium">{title}</span>
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
