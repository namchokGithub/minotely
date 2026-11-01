import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import { useRouteIds } from "@/app/use-route-ids";
import {
  BookOpen,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth, useUid } from "@/features/auth/auth-context";
import { useUiStore, type ThemePreference } from "@/stores/ui-store";
import { createBook, deleteBook, updateBook, useBooks } from "./api";
import { BookDialog } from "./book-dialog";
import { BookGlyph } from "./book-glyph";
import type { Book } from "./types";

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

export function BooksPanel() {
  const uid = useUid();
  const navigate = useNavigate();
  const { data: books, isPending, isError } = useBooks();
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate = (input: Parameters<typeof createBook>[1]) => {
    const order = Math.max(0, ...(books ?? []).map((b) => b.order)) + 1;
    navigate(`/books/${createBook(uid, input, order)}`);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex h-14 items-center gap-2 px-4">
        <BookOpen className="size-5" />
        <h2 className="flex-1 font-semibold">My Library</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New book"
          title="New book"
          onClick={() => setCreateOpen(true)}
        >
          <Plus />
        </Button>
      </header>

      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Books">
        {isPending ? (
          <PanelMessage>
            <Loader2 className="size-4 animate-spin" aria-label="Loading" />
          </PanelMessage>
        ) : isError ? (
          <PanelMessage>Could not load books.</PanelMessage>
        ) : books.length === 0 ? (
          <PanelMessage>No books yet.</PanelMessage>
        ) : (
          <ul className="grid gap-0.5">
            {books.map((book) => (
              <BookItem key={book.id} book={book} />
            ))}
          </ul>
        )}
      </nav>

      <PanelFooter />

      <BookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}

function BookItem({ book }: { book: Book }) {
  const uid = useUid();
  const navigate = useNavigate();
  const { bookId: activeBookId } = useRouteIds();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = () => {
    if (activeBookId === book.id) navigate("/");
    deleteBook(uid, book.id).catch((error) =>
      console.error("Delete book failed", error),
    );
  };

  return (
    <li className="group relative">
      <NavLink
        to={`/books/${book.id}`}
        className={({ isActive }) =>
          cn(
            "flex h-9 items-center gap-2 rounded-md px-2 pr-9 text-sm hover:bg-sidebar-accent",
            isActive && "bg-sidebar-accent font-medium",
          )
        }
      >
        <BookGlyph icon={book.icon} color={book.color} />
        <span className="truncate">{book.name}</span>
      </NavLink>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Actions for ${book.name}`}
            className="absolute top-1.5 right-1.5 opacity-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 md:opacity-0"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BookDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        book={book}
        onSubmit={(input) =>
          updateBook(uid, book.id, input).catch((error) =>
            console.error("Update book failed", error),
          )
        }
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{book.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The book is removed and its notes move to Trash.
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
  );
}

function PanelFooter() {
  const { user, signOut } = useAuth();
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const ThemeIcon = THEME_ICON[theme];

  return (
    <footer className="flex items-center gap-1 border-t px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {user?.email}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Theme: ${theme}`}
        title={`Theme: ${theme}`}
        onClick={() => setTheme(NEXT_THEME[theme])}
      >
        <ThemeIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sign out"
        title="Sign out"
        onClick={() => void signOut()}
      >
        <LogOut />
      </Button>
    </footer>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
