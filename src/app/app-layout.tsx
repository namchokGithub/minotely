import { useMatch } from "react-router";
import { cn } from "@/lib/utils";
import { BooksPanel } from "@/features/books/books-panel";
import { NotesPanel } from "@/features/notes/notes-panel";
import { EditorPanel } from "@/features/editor/editor-panel";
import { useUiStore } from "@/stores/ui-store";

/**
 * Desktop (lg+): Books / Notes / Editor columns.
 * Tablet (md): collapsible Books sidebar + Notes + Editor.
 * Mobile: one screen at a time, chosen by the route.
 */
export function AppLayout() {
  const noteMatch = useMatch("/books/:bookId/notes/:noteId");
  const bookMatch = useMatch("/books/:bookId");
  const bookId = noteMatch?.params.bookId ?? bookMatch?.params.bookId;
  const noteId = noteMatch?.params.noteId;
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
