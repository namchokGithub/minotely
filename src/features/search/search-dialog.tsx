import { useMemo, useState } from "react";
import { Spinner } from "@/components/spinner";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBooks } from "@/features/books/api";
import { BookGlyph } from "@/features/books/book-glyph";
import { useAllNotes } from "@/features/notes/api";
import { useUiStore } from "@/stores/ui-store";
import { searchNotes } from "./search";

export function SearchDialog() {
  const open = useUiStore((state) => state.searchOpen);
  const setOpen = useUiStore((state) => state.setSearchOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search notes</DialogTitle>
        {open && <SearchBody onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SearchBody({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [active, setActive] = useState(0);
  const notes = useAllNotes();
  const { data: books } = useBooks();

  const results = useMemo(
    () => searchNotes(notes.data ?? [], input),
    [notes.data, input],
  );

  const openResult = (index: number) => {
    const result = results[index];
    if (!result) return;
    navigate(`/books/${result.note.bookId}/notes/${result.note.id}`);
    onDone();
  };

  return (
    <div className="flex max-h-[70dvh] flex-col">
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={input}
          placeholder="Search titles, content, #tags…"
          aria-label="Search notes"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={
            results[active]
              ? `search-result-${results[active].note.id}`
              : undefined
          }
          className="h-12 flex-1 bg-transparent text-base outline-none sm:text-sm"
          onChange={(event) => {
            setInput(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              openResult(active);
            }
          }}
        />
        {notes.isPending && (
          <Spinner className="text-muted-foreground" label="Searching…" />
        )}
      </div>

      <ul
        id="search-results"
        className="overflow-y-auto p-1"
        role="listbox"
        aria-label="Results"
      >
        {input.trim() && results.length === 0 && !notes.isPending && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notes found.
          </li>
        )}
        {results.map(({ note, snippet }, index) => {
          const book = books?.find((b) => b.id === note.bookId);
          return (
            <li
              key={note.id}
              id={`search-result-${note.id}`}
              role="option"
              aria-selected={index === active}
            >
              <button
                type="button"
                tabIndex={-1}
                className={cn(
                  "grid w-full gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-150",
                  index === active && "bg-muted",
                )}
                onMouseMove={() => setActive(index)}
                onClick={() => openResult(index)}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {book && <BookGlyph icon={book.icon} color={book.color} />}
                  <span className="truncate">
                    {note.title.trim() || "Untitled"}
                  </span>
                </span>
                {snippet && (
                  <span className="truncate text-xs text-muted-foreground">
                    {snippet}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
