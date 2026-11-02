import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useUid } from "@/features/auth/auth-context";
import { setBookOrder, useBooks } from "@/features/books/api";
import { BookGlyph } from "@/features/books/book-glyph";
import type { Book } from "@/features/books/types";
import { bookDragId, type DragData } from "./dnd-ids";
import { moveNote } from "@/features/notes/api";
import { useRouteIds } from "./use-route-ids";

// Notes drop onto the book under the pointer; books sort by the closest slot.
const collisionDetection: CollisionDetection = (args) => {
  const type = (args.active.data.current as DragData | undefined)?.type;
  const books = args.droppableContainers.filter(
    (c) => (c.data.current as DragData | undefined)?.type === "book",
  );
  return type === "note"
    ? pointerWithin({ ...args, droppableContainers: books })
    : closestCenter({ ...args, droppableContainers: books });
};

/** Logs the error and shows it as a toast. */
function failed(message: string) {
  return (error: unknown) => {
    console.error(message, error);
    toast.error(message, {
      description: error instanceof Error ? error.message : undefined,
    });
  };
}

/** New order for an item dropped between two neighbours: one write, no renumbering. */
function orderBetween(previous?: Book, next?: Book): number {
  if (previous && next) return (previous.order + next.order) / 2;
  if (previous) return previous.order + 1;
  if (next) return next.order - 1;
  return 0;
}

/**
 * Drag and drop across the Library and Notes columns (M5.8): reorder books, and drop a note on a book to move
 * it. Mouse drags start after 6 px, touch drags after a 250 ms press, so clicks and scrolling still work.
 */
export function LibraryDnd({ children }: { children: ReactNode }) {
  const uid = useUid();
  const navigate = useNavigate();
  const { noteId: openNoteId } = useRouteIds();
  const { data: books = [] } = useBooks();
  const [dragging, setDragging] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
  );

  const onDragStart = ({ active }: DragStartEvent) =>
    setDragging((active.data.current as DragData | undefined) ?? null);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const from = active.data.current as DragData | undefined;
    const to = over?.data.current as DragData | undefined;
    if (!from || to?.type !== "book") return;

    if (from.type === "note") {
      const note = from.note;
      const target = to.book;
      if (note.bookId === target.id) return;
      const title = note.title.trim() || "Untitled";
      const isOpen = () =>
        window.location.pathname.endsWith(`/notes/${note.id}`);
      moveNote(uid, note.id, target.id)
        .then(() =>
          toast.success(`Moved “${title}” to “${target.name}”`, {
            action: {
              label: "Undo",
              onClick: () => {
                moveNote(uid, note.id, note.bookId).catch(failed("Undo move"));
                if (isOpen())
                  navigate(`/books/${note.bookId}/notes/${note.id}`);
              },
            },
          }),
        )
        .catch(failed(`Could not move “${title}”`));
      if (openNoteId === note.id)
        navigate(`/books/${target.id}/notes/${note.id}`);
      return;
    }

    const oldIndex = books.findIndex((b) => b.id === from.book.id);
    const newIndex = books.findIndex((b) => b.id === to.book.id);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const reordered = arrayMove(books, oldIndex, newIndex);
    const order = orderBetween(
      reordered[newIndex - 1],
      reordered[newIndex + 1],
    );
    const book = from.book;
    setBookOrder(uid, book.id, order)
      .then(() =>
        toast.success(`Moved “${book.name}” to position ${newIndex + 1}`, {
          action: {
            label: "Undo",
            onClick: () =>
              setBookOrder(uid, book.id, book.order).catch(
                failed("Undo reorder"),
              ),
          },
        }),
      )
      .catch(failed(`Could not move “${book.name}”`));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <SortableContext
        items={books.map((b) => bookDragId(b.id))}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {dragging && <DragPreview data={dragging} />}
      </DragOverlay>
    </DndContext>
  );
}

function DragPreview({ data }: { data: DragData }) {
  return (
    <div className="flex h-9 max-w-64 cursor-grabbing items-center gap-2 rounded-md border bg-popover px-2 text-sm font-medium shadow-lg">
      {data.type === "book" ? (
        <>
          <BookGlyph icon={data.book.icon} color={data.book.color} />
          <span className="truncate">{data.book.name}</span>
        </>
      ) : (
        <span className="truncate">{data.note.title.trim() || "Untitled"}</span>
      )}
    </div>
  );
}
