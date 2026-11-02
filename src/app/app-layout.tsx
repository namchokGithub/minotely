import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";
import { useMediaQuery, useViewportWidth } from "@/lib/use-media-query";
import { isSaveShortcut } from "@/lib/shortcuts";
import { BooksPanel } from "@/features/books/books-panel";
import { NotesPanel } from "@/features/notes/notes-panel";
import { SearchDialog } from "@/features/search/search-dialog";
import { TrashPanel } from "@/features/trash/trash-panel";
import { useUiStore } from "@/stores/ui-store";
import { LibraryDnd } from "./library-dnd";
import { fitWidths, LIBRARY_WIDTH, NOTES_WIDTH } from "./panel-sizes";
import { ResizeHandle } from "./resize-handle";
import { useRouteIds } from "./use-route-ids";

// Tiptap is the largest dependency; load it with the editor column.
const EditorPanel = lazy(() =>
  import("@/features/editor/editor-panel").then((m) => ({
    default: m.EditorPanel,
  })),
);

/**
 * Desktop (lg+): Books / Notes / Editor columns.
 * Tablet (md): collapsible Books sidebar + Notes + Editor.
 * Mobile: one screen at a time, chosen by the route.
 */
export function AppLayout() {
  const { bookId, noteId, isTrash } = useRouteIds();
  const mobileScreen = noteId
    ? "editor"
    : bookId || isTrash
      ? "notes"
      : "books";

  const booksSidebarOpen = useUiStore((state) => state.booksSidebarOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const isTablet = useMediaQuery(
    "(min-width: 768px) and (max-width: 1023.98px)",
  );
  const sidebarCollapsed = isTablet && !booksSidebarOpen;
  const setBooksSidebarOpen = useUiStore((state) => state.setBooksSidebarOpen);

  // Resizable columns (M5.4, D25): saved widths, fitted so the editor keeps its minimum.
  const libraryWidth = useUiStore((state) => state.libraryWidth);
  const notesWidth = useUiStore((state) => state.notesWidth);
  const setLibraryWidth = useUiStore((state) => state.setLibraryWidth);
  const setNotesWidth = useUiStore((state) => state.setNotesWidth);
  const viewport = useViewportWidth();
  const widths = fitWidths(
    libraryWidth,
    notesWidth,
    viewport,
    !sidebarCollapsed,
  );
  const [resizing, setResizing] = useState(false);

  // Tablet: give the editor room when a note opens; the toggle brings Books back.
  useEffect(() => {
    if (isTablet && noteId) setBooksSidebarOpen(false);
  }, [isTablet, noteId, setBooksSidebarOpen]);

  // Cmd/Ctrl+K opens search (inside the editor it is the link shortcut, D27). Cmd/Ctrl+S never opens the browser's "Save page" (the open note saves itself).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isSaveShortcut(event)) event.preventDefault();
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !event.defaultPrevented
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  return (
    <div
      className={cn(
        "flex h-dvh overflow-hidden",
        resizing && "cursor-col-resize select-none",
      )}
      style={
        {
          "--library-w": `${widths.library}px`,
          "--notes-w": `${widths.notes}px`,
        } as CSSProperties
      }
    >
      <h1 className="sr-only">Minotely</h1>
      <a
        href="#editor"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to editor
      </a>
      <LibraryDnd>
        <aside
          id="books-sidebar"
          aria-label="Library"
          inert={sidebarCollapsed}
          className={cn(
            "w-full flex-col overflow-hidden md:flex md:shrink-0 md:border-r",
            !resizing && "md:transition-[width] md:duration-200 md:ease-out",
            mobileScreen === "books" ? "flex" : "hidden",
            sidebarCollapsed ? "md:w-0 md:border-r-0" : "md:w-(--library-w)",
          )}
        >
          <div className="h-full w-full md:w-(--library-w)">
            <BooksPanel />
          </div>
        </aside>
        {!sidebarCollapsed && (
          <ResizeHandle
            label="Resize Library"
            controls="books-sidebar"
            value={widths.library}
            min={LIBRARY_WIDTH.min}
            max={LIBRARY_WIDTH.max}
            defaultValue={LIBRARY_WIDTH.default}
            onChange={setLibraryWidth}
            onResizingChange={setResizing}
          />
        )}

        <section
          id="notes-column"
          aria-label={isTrash ? "Trash" : "Notes"}
          className={cn(
            "w-full flex-col md:flex md:w-(--notes-w) md:shrink-0 md:border-r",
            mobileScreen === "notes" ? "flex" : "hidden",
          )}
        >
          {isTrash ? <TrashPanel /> : <NotesPanel bookId={bookId} />}
        </section>
        <ResizeHandle
          label="Resize Notes"
          controls="notes-column"
          value={widths.notes}
          min={NOTES_WIDTH.min}
          max={NOTES_WIDTH.max}
          defaultValue={NOTES_WIDTH.default}
          onChange={setNotesWidth}
          onResizingChange={setResizing}
        />
      </LibraryDnd>

      <main
        id="editor"
        tabIndex={-1}
        className={cn(
          "min-w-0 flex-1 flex-col md:flex",
          mobileScreen === "editor" ? "flex" : "hidden",
        )}
      >
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Spinner />
            </div>
          }
        >
          <EditorPanel bookId={bookId} noteId={noteId} />
        </Suspense>
      </main>

      <SearchDialog />
    </div>
  );
}
