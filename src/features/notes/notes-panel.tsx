import { useRef, useState, type ReactNode } from "react";
import { Spinner } from "@/components/spinner";
import { Link, useNavigate } from "react-router";
import {
  ArrowUpDown,
  ChevronLeft,
  FileUp,
  MoreHorizontal,
  NotebookText,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelRail } from "@/components/panel-rail";
import { cn } from "@/lib/utils";
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
import { useRouteIds } from "@/app/use-route-ids";
import { createNote, importNotes, useNotes } from "./api";
import { NoteItem } from "./note-item";
import {
  buildNoteTree,
  effectiveParentId,
  flattenTree,
  pathOf,
  type TreeNode,
} from "./tree";
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
  const collapsed = !useUiStore((state) => state.notesPanelOpen);
  const toggleCollapsed = useUiStore((state) => state.toggleNotesPanel);
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
  const collapsedNotes = useUiStore((state) => state.collapsedNotes);
  const toggleNoteCollapsed = useUiStore((state) => state.toggleNoteCollapsed);
  const bookNotes = notes.data ?? [];
  const { noteId: openNoteId } = useRouteIds();
  const openPath = openNoteId
    ? pathOf(openNoteId, bookNotes).map((n) => n.id)
    : [];
  // Sub-pages (D49): a tree, or a flat list with paths while a tag filter is on.
  const rows: TreeNode[] = tagFilter
    ? sortNotes(
        bookNotes.filter((n) => n.tags.includes(tagFilter)),
        noteSort,
      ).map((note) => ({ note, depth: 1, children: [] }))
    : flattenTree(
        buildNoteTree(bookNotes, noteSort),
        // The open note is never hidden under a collapsed parent.
        new Set(collapsedNotes.filter((id) => !openPath.includes(id))),
      );
  const visible = rows.map((row) => row.note);
  const hasTree =
    !tagFilter && bookNotes.some((n) => effectiveParentId(n.id, bookNotes));

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

  const titleIcon = book ? (
    <BookGlyph icon={book.icon} color={book.color} />
  ) : (
    <NotebookText className="size-4" />
  );

  return (
    <>
      {collapsed && (
        <PanelRail
          label="Expand notes list"
          controls="notes-column"
          onExpand={toggleCollapsed}
        >
          {titleIcon}
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
              title="Collapse notes list"
              aria-expanded={true}
              aria-controls="notes-column"
              className="pointer-events-none flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:pointer-events-auto"
              onClick={toggleCollapsed}
            >
              {book && titleIcon}
              <span className="truncate">{book?.name ?? "Notes"}</span>
            </button>
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
                        onValueChange={(value) =>
                          setNoteSort(value as NoteSort)
                        }
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
                  navigate(
                    `/books/${book.id}/notes/${createNote(uid, book.id)}`,
                  )
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
                  className="inline-flex h-10 items-center rounded-md px-4 text-foreground underline underline-offset-4 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 md:hidden"
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
              {rows.map((row) => {
                const { note } = row;
                const canReorder = noteSort === "custom";
                // Move up / down only among siblings with the same pin state.
                const sibling = (other: TreeNode | undefined) =>
                  canReorder && other?.note.isPinned === note.isPinned
                    ? other?.note
                    : undefined;
                const siblings = rows.filter(
                  (other) =>
                    other.depth === row.depth &&
                    effectiveParentId(other.note.id, bookNotes) ===
                      effectiveParentId(note.id, bookNotes),
                );
                const at = siblings.indexOf(row);
                return (
                  <NoteItem
                    key={note.id}
                    note={note}
                    books={books ?? []}
                    previous={sibling(siblings[at - 1])}
                    next={sibling(siblings[at + 1])}
                    showReorder={canReorder}
                    depth={row.depth}
                    childCount={row.children.length}
                    collapsed={collapsedNotes.includes(note.id)}
                    onToggle={() => toggleNoteCollapsed(note.id)}
                    reserveToggle={hasTree}
                    path={tagFilter ? pathOf(note.id, bookNotes) : []}
                  />
                );
              })}
            </ul>
          )}
        </div>
        <MessageDialog message={message} onClose={() => setMessage(null)} />
      </div>
    </>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
