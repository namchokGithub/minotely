import { useRef, useState, type ReactNode } from "react";
import { Spinner } from "@/components/spinner";
import { Link, useNavigate } from "react-router";
import {
  ArrowUpDown,
  ChevronLeft,
  FileUp,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageDialog, type Message } from "@/components/message-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUid } from "@/features/auth/auth-context";
import { useBooks } from "@/features/books/api";
import { BookGlyph } from "@/features/books/book-glyph";
import { useUiStore } from "@/stores/ui-store";
import { createNote, importNotes, useNotes } from "./api";
import { NoteItem } from "./note-item";
import { sortNotes } from "./sort";
import { collectTags } from "./tags";
import type { NoteSort } from "./types";

const SORT_LABELS: Record<NoteSort, string> = {
  updated: "Last updated",
  created: "Date created",
  title: "Title A–Z",
  custom: "Custom",
};

export function NotesPanel({ bookId }: { bookId: string | undefined }) {
  const uid = useUid();
  const navigate = useNavigate();
  const toggleBooksSidebar = useUiStore((state) => state.toggleBooksSidebar);
  const booksSidebarOpen = useUiStore((state) => state.booksSidebarOpen);
  const noteSort = useUiStore((state) => state.noteSort);
  const setNoteSort = useUiStore((state) => state.setNoteSort);
  const markdownInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);
  // Tag filter belongs to one book; switching books clears it.
  const [filter, setFilter] = useState<{ bookId?: string; tag: string }>();
  const tagFilter = filter?.bookId === bookId ? filter?.tag : undefined;

  const { data: books } = useBooks();
  const book = books?.find((b) => b.id === bookId);
  const notes = useNotes(bookId);
  const tags = collectTags(notes.data ?? []);
  const visible = sortNotes(
    (notes.data ?? []).filter((n) => !tagFilter || n.tags.includes(tagFilter)),
    noteSort,
  );

  const importMarkdown = async (files: File[]) => {
    if (!book) return;
    const failed: string[] = [];
    try {
      // Loaded on demand: pulls in the Tiptap schema and Markdown parser.
      const { markdownToNote } = await import("@/features/data/markdown");
      const notes = [];
      for (const file of files) {
        try {
          notes.push(markdownToNote(await file.text(), file.name));
        } catch (error) {
          console.error(`Reading ${file.name} failed`, error);
          failed.push(file.name);
        }
      }
      await importNotes(uid, book.id, notes);
      setMessage({
        title: notes.length ? "Import complete" : "Nothing imported",
        body:
          `Added ${notes.length} note(s) to “${book.name}”.` +
          (failed.length ? `\nCould not read: ${failed.join(", ")}` : ""),
      });
    } catch (error) {
      console.error("Markdown import failed", error);
      setMessage({
        title: "Import failed",
        body: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

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
                  aria-label="Notes options"
                  title="Notes options"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto min-w-44">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowUpDown /> Sort: {SORT_LABELS[noteSort]}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
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
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={tags.length === 0}>
                    <Tag /> Filter by tag
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                    <DropdownMenuRadioGroup
                      value={tagFilter ?? ""}
                      onValueChange={(tag) =>
                        setFilter(tag ? { bookId, tag } : undefined)
                      }
                    >
                      <DropdownMenuRadioItem value="">
                        All notes
                      </DropdownMenuRadioItem>
                      {tags.map((tag) => (
                        <DropdownMenuRadioItem key={tag} value={tag}>
                          #{tag}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => markdownInput.current?.click()}
                >
                  <FileUp /> Import Markdown…
                </DropdownMenuItem>
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
            <input
              ref={markdownInput}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              multiple
              hidden
              onChange={(event) => {
                // Copy first: clearing the input empties the live FileList.
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (files.length) void importMarkdown(files);
              }}
            />
          </>
        )}
      </header>

      {tagFilter && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setFilter(undefined)}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs transition-colors duration-150 hover:bg-muted/70"
            aria-label={`Clear tag filter #${tagFilter}`}
          >
            #{tagFilter} <X className="size-3" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {!bookId ? (
          <PanelMessage>
            <span className="grid justify-items-center gap-2">
              Select a book.
              <Link
                to="/"
                className="text-foreground underline underline-offset-4 md:hidden"
              >
                Browse books
              </Link>
            </span>
          </PanelMessage>
        ) : books && !book ? (
          <PanelMessage>Book not found.</PanelMessage>
        ) : notes.isPending ? (
          <PanelMessage>
            <Spinner />
          </PanelMessage>
        ) : notes.isError ? (
          <PanelMessage>Could not load notes.</PanelMessage>
        ) : visible.length === 0 ? (
          <PanelMessage>
            {tagFilter ? "No notes with this tag." : "No notes yet."}
          </PanelMessage>
        ) : (
          <ul className="grid gap-0.5">
            {visible.map((note, index) => {
              const canReorder = noteSort === "custom";
              const previous = visible[index - 1];
              const next = visible[index + 1];
              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  books={books ?? []}
                  previous={
                    canReorder && previous?.isPinned === note.isPinned
                      ? previous
                      : undefined
                  }
                  next={
                    canReorder && next?.isPinned === note.isPinned
                      ? next
                      : undefined
                  }
                  showReorder={canReorder}
                />
              );
            })}
          </ul>
        )}
      </div>
      <MessageDialog message={message} onClose={() => setMessage(null)} />
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
