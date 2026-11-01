import { cn } from "@/lib/utils";
import { BooksPanel } from "@/features/books/books-panel";
import { NotesPanel } from "@/features/notes/notes-panel";
import { EditorPanel } from "@/features/editor/editor-panel";
import { useUiStore } from "@/stores/ui-store";
import { useRouteIds } from "./use-route-ids";

/**
 * Desktop (lg+): Books / Notes / Editor columns.
 * Tablet (md): collapsible Books sidebar + Notes + Editor.
 * Mobile: one screen at a time, chosen by the route.
 */
export function AppLayout() {
  const { bookId, noteId } = useRouteIds();
  const mobileScreen = noteId ? "editor" : bookId ? "notes" : "books";

  const booksSidebarOpen = useUiStore((state) => state.booksSidebarOpen);

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside
        className={cn(
          "w-full flex-col border-r md:w-60 md:shrink-0 lg:flex",
          mobileScreen === "books" ? "flex" : "hidden",
          booksSidebarOpen ? "md:flex" : "md:hidden",
        )}
      >
        <BooksPanel />
      </aside>

      <section
        className={cn(
          "w-full flex-col border-r md:flex md:w-72 md:shrink-0 lg:w-80",
          mobileScreen === "notes" ? "flex" : "hidden",
        )}
      >
        <NotesPanel bookId={bookId} />
      </section>

      <main
        className={cn(
          "min-w-0 flex-1 flex-col md:flex",
          mobileScreen === "editor" ? "flex" : "hidden",
        )}
      >
        <EditorPanel bookId={bookId} noteId={noteId} />
      </main>
    </div>
  );
}
