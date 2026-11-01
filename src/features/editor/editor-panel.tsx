import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type EditorPanelProps = {
  bookId: string | undefined;
  noteId: string | undefined;
};

export function EditorPanel({ bookId, noteId }: EditorPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-1 px-2 md:hidden">
        {bookId && (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/books/${bookId}`} aria-label="Back to notes">
              <ChevronLeft />
            </Link>
          </Button>
        )}
      </header>

      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {noteId ? "Editor coming in M2." : "Select a note."}
      </div>
    </div>
  );
}
