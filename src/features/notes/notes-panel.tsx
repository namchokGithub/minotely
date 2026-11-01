import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowUpDown,
  ChevronLeft,
  Loader2,
  PanelLeft,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUid } from "@/features/auth/auth-context";
import { useBooks } from "@/features/books/api";
import { BookGlyph } from "@/features/books/book-glyph";
import { useUiStore } from "@/stores/ui-store";
import { createNote, useNotes } from "./api";
import { NoteItem } from "./note-item";
import { sortNotes } from "./sort";
import type { NoteSort } from "./types";

const SORT_LABELS: Record<NoteSort, string> = {
  updated: "Last updated",
  created: "Date created",
  title: "Title A–Z",
};

export function NotesPanel({ bookId }: { bookId: string | undefined }) {
  const uid = useUid();
  const navigate = useNavigate();
  const toggleBooksSidebar = useUiStore((state) => state.toggleBooksSidebar);
  const noteSort = useUiStore((state) => state.noteSort);
  const setNoteSort = useUiStore((state) => state.setNoteSort);

  const { data: books } = useBooks();
  const book = books?.find((b) => b.id === bookId);
  const notes = useNotes(bookId);

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
          className="hidden md:inline-flex lg:hidden"
          onClick={toggleBooksSidebar}
        >
          <PanelLeft />
        </Button>

        <h2 className="flex min-w-0 flex-1 items-center gap-2 px-2 font-semibold">
          {book && <BookGlyph icon={book.icon} color={book.color} />}
          <span className="truncate">{book?.name ?? "Notes"}</span>
        </h2>

        {book && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sort: ${SORT_LABELS[noteSort]}`}
                  title={`Sort: ${SORT_LABELS[noteSort]}`}
                >
                  <ArrowUpDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={noteSort}
                  onValueChange={(value) => setNoteSort(value as NoteSort)}
                >
                  {(Object.keys(SORT_LABELS) as NoteSort[]).map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {SORT_LABELS[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New note"
              title="New note"
              onClick={() =>
                navigate(`/books/${book.id}/notes/${createNote(uid, book.id)}`)
              }
            >
              <Plus />
            </Button>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {!bookId ? (
          <PanelMessage>Select a book.</PanelMessage>
        ) : books && !book ? (
          <PanelMessage>Book not found.</PanelMessage>
        ) : notes.isPending ? (
          <PanelMessage>
            <Loader2 className="size-4 animate-spin" aria-label="Loading" />
          </PanelMessage>
        ) : notes.isError ? (
          <PanelMessage>Could not load notes.</PanelMessage>
        ) : notes.data.length === 0 ? (
          <PanelMessage>No notes yet.</PanelMessage>
        ) : (
          <ul className="grid gap-0.5">
            {sortNotes(notes.data, noteSort).map((note) => (
              <NoteItem key={note.id} note={note} books={books ?? []} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
