import { useState, type CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { noteDragId, type DragData } from "@/app/dnd-ids";
import { NavLink, useNavigate } from "react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CornerDownRight,
  CornerLeftUp,
  FileDown,
  FilePlus,
  FolderInput,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pin,
  PinOff,
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
import { cn } from "@/lib/utils";
import { useRouteIds } from "@/app/use-route-ids";
import { useUid } from "@/features/auth/auth-context";
import { useUiStore } from "@/stores/ui-store";
import { BookGlyph } from "@/features/books/book-glyph";
import type { Book } from "@/features/books/types";
import { downloadFile, toFileName } from "@/features/data/download";
import {
  createSubPage,
  deleteBranch,
  moveBranch,
  setNoteParent,
  useAllNotes,
  setNoteLocked,
  setNotePinned,
  swapNoteOrder,
} from "./api";
import type { Note, NoteSort } from "./types";
import { canAddChild, descendantsOf, moveIntoTargets } from "./tree";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function logError(action: string) {
  return (error: unknown) => console.error(`${action} failed`, error);
}

type NoteItemProps = {
  note: Note;
  books: Book[];
  /** Neighbors for Move up / Move down (custom sort only). */
  previous?: Note;
  next?: Note;
  showReorder?: boolean;
  /** Tree (D49): level, 1 = top. */
  depth?: number;
  /** Direct sub-pages; > 0 shows the expand/collapse toggle. */
  childCount?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Leave room for a toggle so rows line up when any note in the list has sub-pages. */
  reserveToggle?: boolean;
  /** Ancestors, shown under the title when the list is flat (tag filter). */
  path?: Note[];
};

export function NoteItem({
  note,
  books,
  previous,
  next,
  showReorder = false,
  depth = 1,
  childCount = 0,
  collapsed = false,
  onToggle,
  reserveToggle = false,
  path = [],
}: NoteItemProps) {
  const uid = useUid();
  const navigate = useNavigate();
  const { noteId: activeNoteId } = useRouteIds();
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Drop on a book in the Library to move the note (D24); "Move to" in the ⋯ menu does the same.
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: noteDragId(note.id),
    data: { type: "note", note } satisfies DragData,
  });
  const title = note.title.trim() || "Untitled";
  const snippet = note.plainText.trim().split("\n")[0];
  const otherBooks = books.filter((b) => b.id !== note.bookId);

  // Sub-pages (D49): structure is read from all live notes.
  const { data: allNotes = [] } = useAllNotes();
  const noteSort = useUiStore((state) => state.noteSort);
  const collapsedNotes = useUiStore((state) => state.collapsedNotes);
  const toggleNoteCollapsed = useUiStore((state) => state.toggleNoteCollapsed);
  // Counted only while the delete dialog is open; the list can be long.
  const subPageCount = deleteOpen ? descendantsOf(note.id, allNotes).length : 0;

  const handleMove = (bookId: string) => {
    const branch = [
      note.id,
      ...descendantsOf(note.id, allNotes).map((n) => n.id),
    ];
    moveBranch(uid, note, bookId, allNotes).catch(logError("Move note"));
    // The open note may be a sub-page of the moved note; follow it to the new book.
    if (activeNoteId && branch.includes(activeNoteId)) {
      navigate(`/books/${bookId}/notes/${activeNoteId}`);
    }
  };

  const parentWriteFailed = (action: string) => (error: unknown) => {
    console.error(`${action} failed`, error);
    toast.error(
      `Could not ${action.toLowerCase()}. If this keeps happening, the Security Rules may need publishing.`,
    );
  };

  const addSubPage = () => {
    const { id, written } = createSubPage(uid, note);
    written.catch(parentWriteFailed("Add sub-page"));
    if (collapsedNotes.includes(note.id)) toggleNoteCollapsed(note.id);
    navigate(`/books/${note.bookId}/notes/${id}`);
  };

  const exportMarkdown = async () => {
    try {
      const { noteToMarkdown } = await import("@/features/data/markdown");
      downloadFile(
        toFileName(title, "md"),
        noteToMarkdown(note),
        "text/markdown",
      );
    } catch (error) {
      logError("Export Markdown")(error);
    }
  };

  const handleDelete = () => {
    deleteBranch(uid, note, allNotes).catch(logError("Delete note"));
    if (activeNoteId === note.id) navigate(`/books/${note.bookId}`);
  };

  // Same items in the ⋯ menu and the right-click menu (M5.9).
  const menuItems = (k: MenuKit) => (
    <>
      <k.Item
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
      </k.Item>
      <k.Item
        onSelect={() =>
          setNoteLocked(uid, note.id, !note.isLocked).catch(
            logError("Lock note"),
          )
        }
      >
        {note.isLocked ? (
          <>
            <LockOpen /> Unlock
          </>
        ) : (
          <>
            <Lock /> Lock
          </>
        )}
      </k.Item>
      <k.Separator />
      <k.Item disabled={!canAddChild(note.id, allNotes)} onSelect={addSubPage}>
        <FilePlus /> Add sub-page
      </k.Item>
      <k.Sub>
        <k.SubTrigger>
          <CornerDownRight /> Move into…
        </k.SubTrigger>
        <k.SubContent className="max-h-72 overflow-y-auto">
          {/* Rendered only while this sub-menu is open (D49). */}
          <MoveIntoItems
            kit={k}
            note={note}
            allNotes={allNotes}
            sort={noteSort}
            onPick={(parentId) =>
              setNoteParent(uid, note.id, parentId).catch(
                parentWriteFailed("Move into"),
              )
            }
          />
        </k.SubContent>
      </k.Sub>
      {note.parentId && (
        <k.Item
          onSelect={() =>
            setNoteParent(uid, note.id, null).catch(
              logError("Move to top level"),
            )
          }
        >
          <CornerLeftUp /> Move to top level
        </k.Item>
      )}
      {showReorder && (
        <>
          <k.Item
            disabled={!previous}
            onSelect={() =>
              previous &&
              swapNoteOrder(uid, note, previous).catch(logError("Reorder"))
            }
          >
            <ArrowUp /> Move up
          </k.Item>
          <k.Item
            disabled={!next}
            onSelect={() =>
              next && swapNoteOrder(uid, note, next).catch(logError("Reorder"))
            }
          >
            <ArrowDown /> Move down
          </k.Item>
        </>
      )}
      <k.Sub>
        <k.SubTrigger disabled={otherBooks.length === 0}>
          <FolderInput /> Move to
        </k.SubTrigger>
        <k.SubContent className="max-h-72 overflow-y-auto">
          {otherBooks.map((book) => (
            <k.Item key={book.id} onSelect={() => handleMove(book.id)}>
              <BookGlyph icon={book.icon} color={book.color} />
              <span className="truncate">{book.name}</span>
            </k.Item>
          ))}
        </k.SubContent>
      </k.Sub>
      <k.Item onSelect={() => void exportMarkdown()}>
        <FileDown /> Export Markdown
      </k.Item>
      <k.Separator />
      <k.Item variant="destructive" onSelect={() => setDeleteOpen(true)}>
        <Trash2 /> Delete
      </k.Item>
    </>
  );

  return (
    <AppContextMenu label={`Actions for ${title}`} menu={menuItems(contextKit)}>
      <li
        ref={setNodeRef}
        className={cn("group relative", isDragging && "opacity-40")}
        style={
          {
            "--indent": `${(depth - 1) * 16}px`,
            "--toggle": reserveToggle ? "1.25rem" : "0px",
          } as CSSProperties
        }
      >
        {childCount > 0 && (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={
              collapsed
                ? `Expand sub-pages of ${title}`
                : `Collapse sub-pages of ${title}`
            }
            title={collapsed ? "Expand sub-pages" : "Collapse sub-pages"}
            className="absolute top-2 left-[calc(var(--indent)+0.375rem)] z-10 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors duration-150 outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.();
            }}
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
                !collapsed && "rotate-90",
              )}
            />
          </button>
        )}
        <NavLink
          to={`/books/${note.bookId}/notes/${note.id}`}
          {...listeners}
          className={({ isActive }) =>
            cn(
              "grid touch-manipulation select-none [-webkit-touch-callout:none] grid-cols-[minmax(0,1fr)] gap-0.5 rounded-md py-2 pr-9 pl-[calc(0.75rem+var(--indent)+var(--toggle))] transition-colors duration-150 hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive && "bg-muted",
            )
          }
        >
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            {note.isLocked && (
              <Lock
                className="size-3 shrink-0 text-muted-foreground"
                aria-label="Locked"
              />
            )}
            {note.isPinned && (
              <Pin
                className="size-3 shrink-0 text-muted-foreground"
                aria-label="Pinned"
              />
            )}
            {note.icon && (
              <span aria-hidden="true" className="shrink-0">
                {note.icon}
              </span>
            )}
            <span className="truncate">{title}</span>
            {collapsed && childCount > 0 && (
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {childCount}
              </span>
            )}
          </span>
          {path.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">
              {path.map((n) => n.title.trim() || "Untitled").join(" / ")}
            </span>
          )}
          {snippet && (
            <span className="truncate text-xs text-muted-foreground">
              {snippet}
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="shrink-0">
              {dateFormat.format(note.updatedAt)}
            </span>
            {note.tags.length > 0 && (
              <span className="truncate">
                {note.tags.map((tag) => `#${tag}`).join(" ")}
              </span>
            )}
          </span>
        </NavLink>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${title}`}
              className="absolute top-2 right-1.5 opacity-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:hover)]:opacity-0"
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
              <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                {subPageCount > 0
                  ? `The note and its ${subPageCount} sub-page(s) move to Trash.`
                  : "The note moves to Trash."}
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
    </AppContextMenu>
  );
}

/** "Move into…" targets: same book, not itself or its sub-pages, within 3 levels (D49). */
function MoveIntoItems({
  kit: k,
  note,
  allNotes,
  sort,
  onPick,
}: {
  kit: MenuKit;
  note: Note;
  allNotes: Note[];
  sort: NoteSort;
  onPick: (parentId: string) => void;
}) {
  const targets = moveIntoTargets(note.id, allNotes, sort);
  if (targets.length === 0) {
    return <k.Item disabled>No place to move into</k.Item>;
  }
  return (
    <>
      {targets.map((row) => (
        <k.Item
          key={row.note.id}
          className={
            row.depth > 2 ? "pl-8" : row.depth > 1 ? "pl-5" : undefined
          }
          onSelect={() => onPick(row.note.id)}
        >
          {row.note.icon && <span aria-hidden="true">{row.note.icon}</span>}
          <span className="truncate">
            {row.note.title.trim() || "Untitled"}
          </span>
        </k.Item>
      ))}
    </>
  );
}
