import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { BooksPanel } from "@/features/books/books-panel";
import { NotesPanel } from "@/features/notes/notes-panel";
import { EditorPanel } from "@/features/editor/editor-panel";
import { SearchDialog } from "@/features/search/search-dialog";
import { TrashPanel } from "@/features/trash/trash-panel";
import { useUiStore } from "@/stores/ui-store";
import { useRouteIds } from "./use-route-ids";

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
      <aside
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
        className={cn(
          "w-full flex-col border-r md:flex md:w-72 md:shrink-0 lg:w-80",
          mobileScreen === "notes" ? "flex" : "hidden",
        )}
      >
        {isTrash ? <TrashPanel /> : <NotesPanel bookId={bookId} />}
      </section>

      <main
        className={cn(
          "min-w-0 flex-1 flex-col md:flex",
          mobileScreen === "editor" ? "flex" : "hidden",
        )}
      >
        <EditorPanel bookId={bookId} noteId={noteId} />
      </main>

      <SearchDialog />
    </div>
  );
}
