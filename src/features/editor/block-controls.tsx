import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import {
  ArrowRightLeft,
  Copy,
  GripVertical,
  Link2,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBooks } from "@/features/books/api";
import { plainTextOf } from "@/features/data/markdown";
import {
  NoteConflictError,
  saveNoteContent,
  useAllNotes,
} from "@/features/notes/api";
import type { Note } from "@/features/notes/types";
import { BLOCK_TYPE_LIST, turnBlockInto } from "./block-types";
import { parseContent } from "./extensions";

/** The top-level block under the pointer, in page-column coordinates. */
type Hovered = { pos: number; top: number; left: number };

const CONTROLS_WIDTH = 48;

/** First-line middle of a block, so the controls sit beside its first line of text. */
function firstLineOffset(element: HTMLElement) {
  const style = getComputedStyle(element);
  const lineHeight = Number.parseFloat(style.lineHeight) || 28;
  const padding = Number.parseFloat(style.paddingTop) || 0;
  return padding + (lineHeight - 24) / 2;
}

/**
 * Selects the top-level block at `pos` and hands it to ProseMirror's own drag
 * and drop, which moves it on drop (Dropcursor shows where). False: nothing to drag.
 */
function startBlockDrag(view: EditorView, pos: number, event: React.DragEvent) {
  const dom = view.nodeDOM(pos);
  if (!view.state.doc.nodeAt(pos) || !(dom instanceof HTMLElement)) {
    return false;
  }
  const selection = NodeSelection.create(view.state.doc, pos);
  view.dispatch(view.state.tr.setSelection(selection));
  view.dragging = { slice: selection.content(), move: true };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", dom.textContent ?? "");
  event.dataTransfer.setDragImage(dom, 0, 0);
  return true;
}

type BlockControlsProps = {
  editor: Editor;
  /** The page column; controls are positioned inside it, left of the text. */
  container: HTMLElement | null;
  uid: string;
  noteId: string;
  bookId: string;
  /** Saves now, so block ids exist in Firestore before a link to one is shared. */
  persist: () => void;
};

/**
 * Block Controls (D48): beside the top-level block under the pointer, a `+`
 * that adds a block below (Alt/⌥ + click: above) and opens the `/` menu, and a
 * `⠿` handle that drags the block or, on click, opens the Block Action Menu:
 * Duplicate, Delete, Turn into, Move to (another note) and Copy link to block.
 * Mouse and trackpad on 768px and up only.
 */
export function BlockControls({
  editor,
  container,
  uid,
  noteId,
  bookId,
  persist,
}: BlockControlsProps) {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  /** The block the action menu acts on, fixed while the menu is open. */
  const [target, setTarget] = useState<{ pos: number; node: PMNode } | null>(
    null,
  );
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const menuOpenRef = useRef(false);
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  // Track the block under the pointer by its vertical position, so the gutter
  // left of the text counts as hovering that block.
  useEffect(() => {
    if (!container) return;
    const finePointer = window.matchMedia("(pointer: fine)");
    const onMove = (event: MouseEvent) => {
      if (menuOpenRef.current || !finePointer.matches) return;
      if (!editor.isEditable) return setHovered(null);
      const view = editor.view;
      const box = container.getBoundingClientRect();
      let found: Hovered | null = null;
      view.state.doc.forEach((_node, offset) => {
        if (found) return;
        const dom = view.nodeDOM(offset);
        if (!(dom instanceof HTMLElement)) return;
        const rect = dom.getBoundingClientRect();
        if (event.clientY >= rect.top - 4 && event.clientY <= rect.bottom + 4) {
          found = {
            pos: offset,
            top: rect.top - box.top + firstLineOffset(dom),
            left: rect.left - box.left - CONTROLS_WIDTH - 4,
          };
        }
      });
      clearTimeout(hideTimer.current);
      if (found) setHovered(found);
      else hideTimer.current = setTimeout(() => setHovered(null), 300);
    };
    const onLeave = () => {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        if (!menuOpenRef.current) setHovered(null);
      }, 300);
    };
    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      clearTimeout(hideTimer.current);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [container, editor]);

  // Typing moves blocks; hide until the pointer moves again.
  useEffect(() => {
    const onUpdate = () => {
      if (!menuOpenRef.current) setHovered(null);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  if (!hovered) return null;

  const nodeAt = (pos: number) => editor.state.doc.nodeAt(pos);

  /** `+`: an empty block below (above with Alt/⌥), with "/" typed to open the block menu. */
  const addBlock = (above: boolean) => {
    const node = nodeAt(hovered.pos);
    if (!node) return;
    const at = above ? hovered.pos : hovered.pos + node.nodeSize;
    const { state, view } = editor;
    const paragraph = state.schema.nodes.paragraph.create(
      null,
      state.schema.text("/"),
    );
    const tr = state.tr.insert(at, paragraph);
    tr.setSelection(TextSelection.create(tr.doc, at + 2));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  };

  const startDrag = (event: React.DragEvent) => {
    if (!startBlockDrag(editor.view, hovered.pos, event))
      event.preventDefault();
  };

  const openMenu = () => {
    const node = nodeAt(hovered.pos);
    if (!node) return;
    setTarget({ pos: hovered.pos, node });
    setMenuOpen(true);
  };

  return (
    <div
      className="absolute z-10 hidden items-center md:flex"
      style={{ top: hovered.top, left: hovered.left, width: CONTROLS_WIDTH }}
      onMouseEnter={() => clearTimeout(hideTimer.current)}
    >
      <button
        type="button"
        aria-label="Add block below (Alt/⌥ + click: above)"
        title="Add block below · Alt/⌥ + click: above"
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors duration-150 hover:bg-muted hover:text-foreground"
        onClick={(event) => addBlock(event.altKey)}
      >
        <Plus className="size-4" />
      </button>

      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) setTarget(null);
        }}
      >
        {/* Anchor only: the handle opens the menu on click, so dragging it never opens it. */}
        <DropdownMenuTrigger asChild>
          <span aria-hidden="true" className="absolute right-0 size-6" />
        </DropdownMenuTrigger>
        <button
          type="button"
          draggable
          aria-label="Drag to move, or click for block actions"
          title="Drag to move · Click for actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="relative flex size-6 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 transition-colors duration-150 hover:bg-muted hover:text-foreground active:cursor-grabbing"
          onDragStart={startDrag}
          onClick={openMenu}
        >
          <GripVertical className="size-4" />
        </button>
        {target && (
          <BlockActionMenu
            editor={editor}
            target={target}
            uid={uid}
            noteId={noteId}
            bookId={bookId}
            persist={persist}
          />
        )}
      </DropdownMenu>
    </div>
  );
}

function BlockActionMenu({
  editor,
  target,
  uid,
  noteId,
  bookId,
  persist,
}: {
  editor: Editor;
  target: { pos: number; node: PMNode };
} & Omit<BlockControlsProps, "editor" | "container">) {
  const { pos, node } = target;
  const { data: books } = useBooks();
  const { data: allNotes } = useAllNotes();
  const notesByBook = useMemo(() => {
    const byBook = new Map<string, Note[]>();
    for (const note of allNotes ?? []) {
      if (note.id === noteId) continue;
      byBook.set(note.bookId, [...(byBook.get(note.bookId) ?? []), note]);
    }
    for (const list of byBook.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return byBook;
  }, [allNotes, noteId]);

  const stillThere = () => editor.state.doc.nodeAt(pos) === node;

  const duplicate = () => {
    if (!stillThere()) return;
    // UniqueID gives the copy (and its inner blocks) new ids.
    editor.view.dispatch(editor.state.tr.insert(pos + node.nodeSize, node));
  };

  const remove = () => {
    if (!stillThere()) return;
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
  };

  const moveTo = async (note: Note) => {
    if (!stillThere()) return;
    if (!navigator.onLine) {
      toast.error("You are offline. The block was not moved.");
      return;
    }
    const content = parseContent(note.content);
    content.content = [...(content.content ?? []), node.toJSON()];
    try {
      await saveNoteContent(
        uid,
        note.id,
        {
          title: note.title,
          content: JSON.stringify(content),
          plainText: plainTextOf(content),
        },
        { title: note.title, content: note.content },
      );
    } catch (error) {
      console.error("Move block failed", error);
      toast.error(
        error instanceof NoteConflictError
          ? "That note changed elsewhere. The block was not moved."
          : "Could not move the block.",
      );
      return;
    }
    remove();
    toast.success(`Moved to “${note.title.trim() || "Untitled"}”`);
  };

  const copyLink = async () => {
    const id: unknown = node.attrs.id;
    if (typeof id !== "string" || !id) return;
    const url = `${window.location.origin}/books/${bookId}/notes/${noteId}#block-${id}`;
    try {
      await navigator.clipboard.writeText(url);
      persist();
      toast.success("Link to block copied");
    } catch (error) {
      console.error("Copy link failed", error);
      toast.error("Could not copy the link");
    }
  };

  const turnIntoTypes = BLOCK_TYPE_LIST.filter((type) => type.turnInto);
  const canTurnInto = !["table", "horizontalRule"].includes(node.type.name);
  const otherBooks = (books ?? []).filter((book) => notesByBook.has(book.id));

  return (
    <DropdownMenuContent align="start" side="bottom" className="w-52">
      <DropdownMenuItem onSelect={duplicate}>
        <Copy /> Duplicate
      </DropdownMenuItem>
      {canTurnInto && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Repeat2 /> Turn into
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {turnIntoTypes.map((type) => {
              const Icon = type.icon;
              return (
                <DropdownMenuItem
                  key={type.id}
                  onSelect={() =>
                    stillThere() &&
                    turnBlockInto(editor, pos, node.nodeSize, type)
                  }
                >
                  <Icon /> {type.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={otherBooks.length === 0}>
          <ArrowRightLeft /> Move to
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
          <DropdownMenuLabel>Add to the end of</DropdownMenuLabel>
          {otherBooks.map((book) => (
            <DropdownMenuSub key={book.id}>
              <DropdownMenuSubTrigger>{book.name}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
                {(notesByBook.get(book.id) ?? []).map((note) => (
                  <DropdownMenuItem
                    key={note.id}
                    onSelect={() => void moveTo(note)}
                  >
                    {note.icon && <span aria-hidden="true">{note.icon}</span>}
                    <span className="truncate">
                      {note.title.trim() || "Untitled"}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem onSelect={() => void copyLink()}>
        <Link2 /> Copy link to block
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={remove}>
        <Trash2 /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
