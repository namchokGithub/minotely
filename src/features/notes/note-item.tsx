import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { FolderInput, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouteIds } from "@/app/use-route-ids";
import { useUid } from "@/features/auth/auth-context";
import { BookGlyph } from "@/features/books/book-glyph";
import type { Book } from "@/features/books/types";
import { deleteNote, moveNote, setNotePinned } from "./api";
import type { Note } from "./types";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function logError(action: string) {
  return (error: unknown) => console.error(`${action} failed`, error);
}

export function NoteItem({ note, books }: { note: Note; books: Book[] }) {
  const uid = useUid();
  const navigate = useNavigate();
  const { noteId: activeNoteId } = useRouteIds();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const title = note.title.trim() || "Untitled";
  const snippet = note.plainText.trim().split("\n")[0];
  const otherBooks = books.filter((b) => b.id !== note.bookId);

  const handleMove = (bookId: string) => {
    moveNote(uid, note.id, bookId).catch(logError("Move note"));
    if (activeNoteId === note.id) navigate(`/books/${bookId}/notes/${note.id}`);
  };

  const handleDelete = () => {
    deleteNote(uid, note.id).catch(logError("Delete note"));
    if (activeNoteId === note.id) navigate(`/books/${note.bookId}`);
  };

  return (
    <li className="group relative">
      <NavLink
        to={`/books/${note.bookId}/notes/${note.id}`}
        className={({ isActive }) =>
          cn(
            "grid gap-0.5 rounded-md px-3 py-2 pr-9 hover:bg-muted",
            isActive && "bg-muted",
          )
        }
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {note.isPinned && (
            <Pin
              className="size-3 shrink-0 text-muted-foreground"
              aria-label="Pinned"
            />
          )}
          <span className="truncate">{title}</span>
        </span>
        {snippet && (
          <span className="truncate text-xs text-muted-foreground">
            {snippet}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {dateFormat.format(note.updatedAt)}
        </span>
      </NavLink>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Actions for ${title}`}
            className="absolute top-2 right-1.5 opacity-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 md:opacity-0"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              setNotePinned(uid, note.id, !note.isPinned).catch(
                logError("Pin note"),
              )
            }
          >
            {note.isPinned ? (
              <>
                <PinOff /> Unpin
              </>
            ) : (
              <>
                <Pin /> Pin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={otherBooks.length === 0}>
              <FolderInput /> Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {otherBooks.map((book) => (
                <DropdownMenuItem
                  key={book.id}
                  onSelect={() => handleMove(book.id)}
                >
                  <BookGlyph icon={book.icon} color={book.color} />
                  <span className="truncate">{book.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The note moves to Trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
