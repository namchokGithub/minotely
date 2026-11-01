import { Link } from "react-router";
import { ChevronLeft, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

export function NotesPanel({ bookId }: { bookId: string | undefined }) {
  const toggleBooksSidebar = useUiStore((state) => state.toggleBooksSidebar);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-1 px-2">
        <Button variant="ghost" size="icon-sm" asChild className="md:hidden">
          <Link to="/" aria-label="Back to books">
            <ChevronLeft />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle books sidebar"
          className="hidden md:inline-flex lg:hidden"
          onClick={toggleBooksSidebar}
        >
          <PanelLeft />
        </Button>
        <h2 className="px-2 font-semibold">Notes</h2>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {bookId ? "No notes yet." : "Select a book."}
      </div>
    </div>
  );
}
