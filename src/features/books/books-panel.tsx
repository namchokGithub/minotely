import { useState, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { bookDragId, type DragData } from "@/app/dnd-ids";
import { Spinner } from "@/components/spinner";
import { NavLink, useNavigate } from "react-router";
import { useRouteIds } from "@/app/use-route-ids";
import {
  ArrowDown,
  ArrowUp,
  LogOut,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { AppContextMenu } from "@/components/app-context-menu";
import { contextKit, dropdownKit, type MenuKit } from "@/components/menu-kit";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { shortcut } from "@/lib/shortcuts";
import { useAuth, useUid } from "@/features/auth/auth-context";
import { DataMenu } from "@/features/data/data-menu";
import { useUiStore, type ThemePreference } from "@/stores/ui-store";
import {
  createBook,
  deleteBook,
  swapBookOrder,
  updateBook,
  useBooks,
} from "./api";
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
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);

  const handleCreate = (input: Parameters<typeof createBook>[1]) => {
    const order = Math.max(0, ...(books ?? []).map((b) => b.order)) + 1;
    navigate(`/books/${createBook(uid, input, order)}`);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex h-14 items-center gap-2 px-4">
        <img
          src="/Kawaii Gold Slime with Embossed N-64x64.png"
          alt="Logo"
          width={64}
          height={64}
          className="size-5"
          unselectable="on"
        />
        <h2 className="flex-1 font-semibold">My Library</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Search"
          aria-keyshortcuts={shortcut("Mod+K").aria}
          title={`Search (${shortcut("Mod+K").label})`}
          onClick={() => setSearchOpen(true)}
        >
          <Search />
        </Button>
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
            <Spinner />
          </PanelMessage>
        ) : isError ? (
          <PanelMessage>Could not load books.</PanelMessage>
        ) : books.length === 0 ? (
          <PanelMessage>No books yet.</PanelMessage>
        ) : (
          <ul className="grid gap-0.5">
            {books.map((book, index) => (
              <BookItem
                key={book.id}
                book={book}
                previous={books[index - 1]}
                next={books[index + 1]}
              />
            ))}
          </ul>
        )}
      </nav>

      <div className="px-2 pb-2">
        <NavLink
          to="/trash"
          className={({ isActive }) =>
            cn(
              "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive &&
                "bg-sidebar-accent font-medium text-sidebar-foreground",
            )
          }
        >
          <Trash2 className="size-4" /> Trash
        </NavLink>
      </div>

      <PanelFooter />

      <BookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}

type BookItemProps = {
  book: Book;
  previous: Book | undefined;
  next: Book | undefined;
};

function BookItem({ book, previous, next }: BookItemProps) {
  const uid = useUid();
  const navigate = useNavigate();
  const { bookId: activeBookId } = useRouteIds();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {
    setNodeRef,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({
    id: bookDragId(book.id),
    data: { type: "book", book } satisfies DragData,
  });
  const noteOver =
    isOver && (active?.data.current as DragData | undefined)?.type === "note";

  const handleDelete = () => {
    if (activeBookId === book.id) navigate("/");
    deleteBook(uid, book.id).catch((error) =>
      console.error("Delete book failed", error),
    );
  };

  // Same items in the ⋯ menu and the right-click menu (M5.9).
  const menuItems = (k: MenuKit) => (
    <>
      <k.Item onSelect={() => setEditOpen(true)}>
        <Pencil /> Edit
      </k.Item>
      <k.Item
        disabled={!previous}
        onSelect={() =>
          previous &&
          swapBookOrder(uid, book, previous).catch((error) =>
            console.error("Reorder failed", error),
          )
        }
      >
        <ArrowUp /> Move up
      </k.Item>
      <k.Item
        disabled={!next}
        onSelect={() =>
          next &&
          swapBookOrder(uid, book, next).catch((error) =>
            console.error("Reorder failed", error),
          )
        }
      >
        <ArrowDown /> Move down
      </k.Item>
      <k.Separator />
      <k.Item variant="destructive" onSelect={() => setDeleteOpen(true)}>
        <Trash2 /> Delete
      </k.Item>
    </>
  );

  return (
    <AppContextMenu
      label={`Actions for ${book.name}`}
      menu={menuItems(contextKit)}
    >
      <li
        ref={setNodeRef}
        style={{
          transform: CSS.Translate.toString(transform),
          transition,
        }}
        className={cn(
          "group relative rounded-md",
          isDragging && "opacity-40",
          noteOver && "ring-2 ring-primary/60",
        )}
      >
        <NavLink
          to={`/books/${book.id}`}
          // Drag from the row; keyboard and screen-reader users reorder from the ⋯ menu.
          {...listeners}
          className={({ isActive }) =>
            cn(
              "flex h-9 touch-manipulation items-center select-none [-webkit-touch-callout:none] gap-2 rounded-md px-2 pr-9 text-sm transition-colors duration-150 hover:bg-sidebar-accent outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
              className="absolute top-1.5 right-1.5 opacity-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:hover)]:opacity-0"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            {menuItems(dropdownKit)}
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
    </AppContextMenu>
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
      <DataMenu />
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
