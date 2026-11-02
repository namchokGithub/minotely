import { lazy, Suspense, useEffect } from "react";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { BooksPanel } from "@/features/books/books-panel";
import { NotesPanel } from "@/features/notes/notes-panel";
import { SearchDialog } from "@/features/search/search-dialog";
import { TrashPanel } from "@/features/trash/trash-panel";
import { useUiStore } from "@/stores/ui-store";
import { LibraryDnd } from "./library-dnd";
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

  // Tablet: give the editor room when a note opens; the toggle brings Books back.
  useEffect(() => {
    if (isTablet && noteId) setBooksSidebarOpen(false);
  }, [isTablet, noteId, setBooksSidebarOpen]);

  // Cmd/Ctrl+K opens search.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  return (
    <div className="flex h-dvh overflow-hidden">
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
            "w-full flex-col overflow-hidden md:flex md:shrink-0 md:border-r md:transition-[width] md:duration-200 md:ease-out lg:w-60",
            mobileScreen === "books" ? "flex" : "hidden",
            sidebarCollapsed ? "md:w-0 md:border-r-0" : "md:w-60",
          )}
        >
          <div className="h-full w-full md:w-60">
            <BooksPanel />
          </div>
        </aside>

        <section
          aria-label={isTrash ? "Trash" : "Notes"}
          className={cn(
            "w-full flex-col md:flex md:w-64 md:shrink-0 md:border-r lg:w-80",
            mobileScreen === "notes" ? "flex" : "hidden",
          )}
        >
          {isTrash ? <TrashPanel /> : <NotesPanel bookId={bookId} />}
        </section>
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
